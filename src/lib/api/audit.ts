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
/**
 * A household as a flat set of fields, so two versions of it can be compared field by field.
 * `people` is compared as a whole: who is in a household is one fact about it, and a trail
 * saying person 3's name moved by one position is noise.
 */
function flatten(household: Record<string, unknown>): Record<string, unknown> {
  const { people, membership, ...rest } = household
  return {
    ...rest,
    people: JSON.stringify(people),
    membership: JSON.stringify(membership),
  }
}

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
    portal: {
      ...base.portal,
      addHousehold: async (draft, viewer) => {
        const household = await base.portal.addHousehold(draft, viewer)
        record(viewer, 'household:add', { kind: 'households', id: household.id }, {}, flatten(household))
        return household
      },
      // The trail lives here, so the part of an export that comes from it is filled in here
      // too. Which fields moved, never who moved them: a household is entitled to know its
      // membership was marked lapsed; which committee member did it is a fact about them.
      deleteHousehold: async (id, viewer) => {
        // Read before the row is gone, or there is nothing left to say what was removed.
        const was = await base.portal.getHousehold(id, viewer).then((h) => (h ? flatten(h) : {}))
        await base.portal.deleteHousehold(id, viewer)
        record(viewer, 'household:remove', { kind: 'households', id }, was, {})
      },
      exportHousehold: async (id, viewer) => {
        const result = await base.portal.exportHousehold(id, viewer)
        return {
          ...result,
          changes: entries
            .filter((e) => e.subject.kind === 'households' && e.subject.id === id)
            .map((e) => ({ action: e.action, at: e.at, fields: Object.keys(e.changes) })),
        }
      },
      updateHousehold: async (id, draft, viewer) => {
        // Flattened now, before the write: the mock changes rows in place, so holding the row
        // and reading it afterwards gives the new values twice and a diff of nothing.
        const was = await base.portal.getHousehold(id, viewer).then((h) => (h ? flatten(h) : {}))
        const household = await base.portal.updateHousehold(id, draft, viewer)
        record(viewer, 'household:edit', { kind: 'households', id }, was, flatten(household))
        return household
      },
    },
    audit: {
      list: async (viewer, limit = 50) =>
        isAdmin(viewer) ? [...entries].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit) : [],
    },
  }
}
