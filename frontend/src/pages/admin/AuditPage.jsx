import { Alert, Button, Card, EmptyState, PageHeader, Spinner, Table } from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import { useCursorList } from '../../lib/useCursorList'

const shortId = (id) => (id ? id.slice(0, 8) : 'system')

export default function AuditPage() {
  const list = useCursorList('/audit', { limit: 50 })

  return (
    <>
      <PageHeader title="Audit log" description="Append-only record of sensitive actions. Entries cannot be edited or deleted." />
      <Card>
        {list.loading ? (
          <Spinner label="Loading audit log…" />
        ) : list.error && list.items.length === 0 ? (
          <Alert onRetry={list.reload}>{list.error.message}</Alert>
        ) : list.items.length === 0 ? (
          <EmptyState title="No audit entries yet" />
        ) : (
          <>
            <Table columns={['When', 'Action', 'Entity', 'Actor', 'Details']}>
              {list.items.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap py-3 pr-4 text-muted">{formatDateTime(entry.created_at)}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-ink">{entry.action}</td>
                  <td className="py-3 pr-4 text-muted">{entry.entity_type} {entry.entity_id && <span className="font-mono text-xs">{shortId(entry.entity_id)}</span>}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted">{shortId(entry.actor_user_id)}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted">{Object.keys(entry.data).length ? JSON.stringify(entry.data) : '—'}</td>
                </tr>
              ))}
            </Table>
            {list.error && list.items.length > 0 && <div className="mt-4"><Alert onRetry={list.loadMore}>{list.error.message}</Alert></div>}
            {list.nextCursor && (
              <div className="mt-4 text-center">
                <Button variant="secondary" busy={list.loadingMore} onClick={list.loadMore}>Load more</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  )
}
