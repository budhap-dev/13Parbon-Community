import { diff, isEmpty, type AuditEntry } from '@/domain/audit'
import { isAdmin, type Viewer } from '@/domain/household'
import type { ApiClient } from './types'

/**
 * Records what changed, around the client rather than inside it.
 *
 * In the database this is a trigger on each table (`public.record_change`), and the point of
 * putting it there is that nothing reaching those tables can avoid it. A trail the caller has
 * to remember to write is a trail with holes exactly where somebody was in a hurry.
 *
 * A mock has no triggers, so this is the nearest honest equivalent: the wrapper goes around
 * the whole client, and the methods underneath neither know nor can opt out. A new mutation is
 * still only audited once it is added here — which is the one place this is weaker than the
 * database by construction, so `audit.test.ts` checks every mutation the contract has.
 *
 * Applied outermost, so a write goes through it whichever adapter ends up handling it.
 */
export function withAuditTrail(base: ApiClient, now: () => Date = () => new Date()): ApiClient {
  const entries: AuditEntry[] = []

  function record(
    viewer: Viewer,
    action: string,
    subject: { kind: string; id: string },
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): void {
    const changes = diff(before, after)
    // A write that moved nothing is not worth a row, same as the trigger's early return.
    if (isEmpty(changes)) return
    entries.push({
      id: `audit-${entries.length + 1}`,
      actorHouseholdId: viewer?.householdId ?? '',
      action,
      subject,
      changes,
      at: now().toISOString(),
    })
  }

  return {
    ...base,
    contact: {
      ...base.contact,
      // `send` is not recorded, matching the trigger: it is attached to contact_messages for
      // updates only. Every visitor using the form would otherwise write a line saying a
      // visitor used the form, which the table already says.
      markHandled: async (id, viewer) => {
        // Read the old value out now, not a reference to the row it lives on. The mock changes
        // rows in place, so holding the object and reading it after the write gives the new
        // value twice and a diff of nothing — which is a silently empty trail, the one failure
        // an audit trail must not have.
        const was = (await base.contact.listMessages(viewer)).find((m) => m.id === id)?.handledBy
        const after = await base.contact.markHandled(id, viewer)
        record(viewer, 'messages:handle', { kind: 'contact_messages', id }, { handledBy: was }, { handledBy: after.handledBy })
        return after
      },
    },
    audit: {
      list: async (viewer, limit = 50) =>
        isAdmin(viewer) ? [...entries].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit) : [],
    },
  }
}
