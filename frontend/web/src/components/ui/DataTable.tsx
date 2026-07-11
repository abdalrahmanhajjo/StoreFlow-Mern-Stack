import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  emptyText?: string;
  rowKey: (row: T) => string;
  /** Accessible name for the table (visually hidden caption). */
  caption?: string;
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 10.5,
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  color: 'var(--ink-faint)',
  padding: '11px 20px',
  borderBottom: '1px solid var(--line)',
  fontWeight: 600,
  background: 'var(--paper)',
  position: 'sticky',
  top: 0,
};
const td: React.CSSProperties = { padding: '13px 20px', borderBottom: '1px solid var(--line-soft)', fontSize: 13, color: 'var(--ink-soft)' };

// SF-014a: generic DataTable with loading / empty / error states
export function DataTable<T>({ columns, data, isLoading, isError, emptyText = 'Nothing here yet.', rowKey, caption }: Props<T>) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-busy={isLoading || undefined}>
        {caption && (
          <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
            {caption}
          </caption>
        )}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" style={{ ...th, textAlign: c.align ?? 'left' }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isError ? (
            <tr><td style={{ ...td, textAlign: 'center', color: 'var(--red)', padding: 40 }} colSpan={columns.length}>Failed to load data.</td></tr>
          ) : isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} style={td}>
                    <Skeleton width={`${50 + ((i * 13 + c.key.length * 7) % 50)}%`} style={{ height: 12 }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr><td style={{ ...td, textAlign: 'center', color: 'var(--ink-faint)', padding: 48 }} colSpan={columns.length}>{emptyText}</td></tr>
          ) : (
            data.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key} style={{ ...td, textAlign: c.align ?? 'left' }}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
