import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableRow,
} from '@/shared/ui/base/table';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';

export type SpecGroup = { title: string; rows: { label: string; value?: string | undefined }[] };

export function SpecTable({ groups }: { groups: SpecGroup[] }) {
  if (groups.length === 0) {
    return (
      <EmptyState
        title="Specifications coming soon"
        body="We publish specs only once they are confirmed."
      />
    );
  }
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <Table key={g.title}>
          <TableCaption className="mt-0 mb-1 border-b border-ink/80 pb-3 text-left font-heading text-tagline font-semibold text-ink [caption-side:top]">
            {g.title}
          </TableCaption>
          <TableBody>
            {g.rows.map((r) => (
              <TableRow key={r.label}>
                <TableHead scope="row" className="w-2/5 whitespace-normal text-ink-muted">
                  {r.label}
                </TableHead>
                <TableCell className={r.value ? 'text-ink' : 'text-ink-muted italic'}>
                  {r.value ?? 'Not specified'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ))}
    </div>
  );
}
