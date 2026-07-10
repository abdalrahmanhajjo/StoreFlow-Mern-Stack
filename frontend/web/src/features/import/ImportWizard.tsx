import { useId, useRef, useState } from 'react';
import type { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { DataTable, type Column } from '@/components/ui/DataTable';
import {
  preflightFiles,
  readFileText,
  validateCsv,
  type FileConstraints,
  type FileRejection,
  type RowIssue,
} from '@/lib/import/preflight';

export interface ImportWizardProps<T> {
  /** Human label for the records being imported, e.g. "products". */
  entityName: string;
  /** Zod schema each CSV row must satisfy (keys = CSV headers). */
  rowSchema: z.ZodType<T>;
  /** De-duplicate rows by this field. */
  dedupeKey?: keyof T;
  /** Commits the validated rows. Throws/rejects to signal failure. */
  onImport: (rows: T[]) => Promise<void>;
  constraints?: Partial<FileConstraints>;
}

type Step = 'select' | 'review' | 'importing' | 'done';

const DEFAULT_CONSTRAINTS: FileConstraints = {
  accept: ['.csv', 'text/csv'],
  maxSizeBytes: 5 * 1024 * 1024,
  maxCount: 1,
};

const issueColumns: Column<RowIssue>[] = [
  { key: 'row', header: 'Row', render: (r) => `#${r.row}` },
  { key: 'messages', header: 'Problem', render: (r) => r.messages.join('; ') },
];

// Multi-step CSV import with upload preflight + per-row schema validation.
// Accessible: labelled file input (not placeholder-only), status announced via
// StatusBanner live regions, keyboard-complete, and no unsafe HTML.
export function ImportWizard<T>({ entityName, rowSchema, dedupeKey, onImport, constraints }: ImportWizardProps<T>) {
  const c: FileConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('select');
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [valid, setValid] = useState<T[]>([]);
  const [issues, setIssues] = useState<RowIssue[]>([]);
  const [duplicates, setDuplicates] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);

  const reset = () => {
    setStep('select');
    setRejections([]);
    setParseError(null);
    setValid([]);
    setIssues([]);
    setDuplicates([]);
    setImportError(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const onFiles = async (files: FileList | null) => {
    setRejections([]);
    setParseError(null);
    if (!files || files.length === 0) return;

    const result = preflightFiles([...files], c);
    if (result.rejected.length > 0) {
      setRejections(result.rejected);
      return;
    }
    const file = result.accepted[0];
    try {
      const text = await readFileText(file);
      const report = validateCsv<T>(text, rowSchema, { dedupeKey });
      if (report.totalRows === 0) {
        setParseError('That file has a header but no data rows.');
        return;
      }
      setValid(report.valid);
      setIssues(report.issues);
      setDuplicates(report.duplicates);
      setTotal(report.totalRows);
      setStep('review');
    } catch {
      setParseError('Could not read that file. Please export a fresh CSV and try again.');
    }
  };

  const doImport = async () => {
    setImportError(null);
    setStep('importing');
    try {
      await onImport(valid);
      setStep('done');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed. Your file was not changed.');
      setStep('review');
    }
  };

  return (
    <section aria-labelledby={`${inputId}-h`} style={{ maxWidth: 720 }}>
      <h2 id={`${inputId}-h`} className="display" style={{ fontSize: 20, color: 'var(--ink)', margin: '0 0 4px' }}>
        Import {entityName}
      </h2>
      <p style={{ color: 'var(--ink-soft)', marginBlockEnd: 16 }}>
        Upload a CSV. We validate every row before anything is saved.
      </p>

      {step === 'select' && (
        <>
          {rejections.length > 0 && (
            <StatusBanner variant="error" title="That file can’t be used">
              <ul style={{ margin: '4px 0 0', paddingInlineStart: 18 }}>
                {rejections.map((r) => (
                  <li key={r.file + r.reason}>
                    <strong>{r.file}</strong>: {r.reason}
                  </li>
                ))}
              </ul>
            </StatusBanner>
          )}
          {parseError && <StatusBanner variant="error" title="Couldn’t read the file">{parseError}</StatusBanner>}

          <label htmlFor={inputId} style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBlockEnd: 7 }}>
            CSV file
          </label>
          <input
            ref={fileInput}
            id={inputId}
            type="file"
            accept={c.accept.join(',')}
            aria-describedby={`${inputId}-hint`}
            onChange={(e) => void onFiles(e.target.files)}
            style={{ display: 'block', fontSize: 13 }}
          />
          <div id={`${inputId}-hint`} style={{ color: 'var(--ink-faint)', fontSize: 12, marginBlockStart: 6 }}>
            {c.accept.join(', ')} · up to {(c.maxSizeBytes / 1024 / 1024).toFixed(0)} MB · {c.maxCount} file(s).
            The first row must be column headers.
          </div>
        </>
      )}

      {(step === 'review' || step === 'importing') && (
        <>
          {importError && <StatusBanner variant="error" title="Import failed">{importError}</StatusBanner>}

          <StatusBanner
            variant={issues.length > 0 || duplicates.length > 0 ? 'warning' : 'success'}
            title={`${valid.length} of ${total} rows ready to import`}
          >
            {issues.length > 0 && <div>{issues.length} row(s) have errors and will be skipped.</div>}
            {duplicates.length > 0 && <div>{duplicates.length} duplicate row(s) will be skipped.</div>}
            {issues.length === 0 && duplicates.length === 0 && <div>Every row passed validation.</div>}
          </StatusBanner>

          {issues.length > 0 && (
            <div style={{ marginBlockEnd: 12 }}>
              <DataTable
                columns={issueColumns}
                data={issues.slice(0, 50)}
                rowKey={(r) => String(r.row)}
                caption={`Rows with validation errors while importing ${entityName}`}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={reset} disabled={step === 'importing'}>
              Choose another file
            </Button>
            <Button onClick={() => void doImport()} disabled={valid.length === 0} isLoading={step === 'importing'}>
              Import {valid.length} {entityName}
            </Button>
          </div>
        </>
      )}

      {step === 'done' && (
        <>
          <StatusBanner variant="success" title={`Imported ${valid.length} ${entityName}`}>
            {issues.length + duplicates.length > 0
              ? `${issues.length + duplicates.length} row(s) were skipped.`
              : 'All rows were imported.'}
          </StatusBanner>
          <Button onClick={reset}>Import another file</Button>
        </>
      )}
    </section>
  );
}
