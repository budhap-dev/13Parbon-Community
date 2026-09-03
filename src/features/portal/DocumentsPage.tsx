import { useDocumentTitle } from '@/app/useDocumentTitle'
import { formatDateWithYear } from '@/domain/dates'
import { documentCategoryLabels } from '@/domain/document'
import { useDocuments } from '@/lib/api'
import styles from './Portal.module.css'

export function DocumentsPage() {
  useDocumentTitle('Documents')
  const { data: documents, isPending } = useDocuments()

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Documents</h1>
          <p className={styles.sub}>Minutes, guidelines and anything else worth keeping. Members only.</p>
        </div>
      </div>

      {isPending ? (
        <p className={styles.empty} aria-busy="true">
          Loading…
        </p>
      ) : !documents || documents.length === 0 ? (
        <p className={styles.empty}>Nothing here yet.</p>
      ) : (
        <section className={styles.panel} aria-labelledby="docs-title">
          <div className={styles.panelHead}>
            <h2 id="docs-title" className={styles.panelTitle}>
              All documents
            </h2>
            <span className={`${styles.muted} ${styles.tiny}`}>{documents.length} files</span>
          </div>
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <a href={doc.fileUrl}>
                        <strong>{doc.title}</strong>
                      </a>
                    </td>
                    <td className={styles.muted}>{documentCategoryLabels[doc.category]}</td>
                    <td className={`${styles.muted} ${styles.tiny}`}>{formatDateWithYear(doc.addedOn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
