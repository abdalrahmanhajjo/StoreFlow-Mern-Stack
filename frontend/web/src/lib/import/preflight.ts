import type { z } from 'zod';

// Client-side import preflight. This is defence-in-depth and UX, NOT a substitute
// for server-side validation: the server must independently re-check type, size,
// content and authorisation. We validate here to fail fast and cheaply.

export interface FileConstraints {
  /** Accepted extensions (".csv") and/or MIME types ("text/csv"). */
  accept: string[];
  /** Max size per file, bytes. */
  maxSizeBytes: number;
  /** Max number of files. */
  maxCount: number;
  /** Optional cap on combined size, bytes. */
  maxTotalBytes?: number;
}

export interface FileRejection {
  file: string;
  reason: string;
}

export interface PreflightResult {
  accepted: File[];
  rejected: FileRejection[];
  ok: boolean;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function matchesAccept(file: File, accept: string[]): boolean {
  const ext = extensionOf(file.name);
  const mime = file.type.toLowerCase();
  return accept.some((a) => {
    const t = a.trim().toLowerCase();
    if (t.startsWith('.')) return ext === t;
    if (t.endsWith('/*')) return mime.startsWith(t.slice(0, -1));
    return mime === t;
  });
}

/**
 * Validate a set of files against type/size/count constraints before upload.
 * Files beyond `maxCount` are rejected rather than silently dropped.
 */
export function preflightFiles(files: File[], c: FileConstraints): PreflightResult {
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];
  let total = 0;

  files.forEach((file, index) => {
    if (index >= c.maxCount) {
      rejected.push({ file: file.name, reason: `Too many files (max ${c.maxCount}).` });
      return;
    }
    if (!matchesAccept(file, c.accept)) {
      rejected.push({ file: file.name, reason: `Unsupported type. Allowed: ${c.accept.join(', ')}.` });
      return;
    }
    if (file.size === 0) {
      rejected.push({ file: file.name, reason: 'File is empty.' });
      return;
    }
    if (file.size > c.maxSizeBytes) {
      rejected.push({ file: file.name, reason: `Too large (max ${(c.maxSizeBytes / 1024 / 1024).toFixed(1)} MB).` });
      return;
    }
    total += file.size;
    if (c.maxTotalBytes != null && total > c.maxTotalBytes) {
      rejected.push({ file: file.name, reason: 'Combined size limit exceeded.' });
      return;
    }
    accepted.push(file);
  });

  return { accepted, rejected, ok: accepted.length > 0 && rejected.length === 0 };
}

/**
 * Read a file's text. Prefers the modern `Blob.text()` and falls back to
 * `FileReader` for environments that lack it (older Safari, some test runtimes).
 */
export function readFileText(file: Blob): Promise<string> {
  const maybeText = (file as Blob & { text?: () => Promise<string> }).text;
  if (typeof maybeText === 'function') return maybeText.call(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsText(file);
  });
}

// --- CSV -------------------------------------------------------------------

/**
 * RFC-4180-ish CSV parser (quotes, escaped quotes, embedded commas/newlines,
 * CRLF). Pure string handling — no eval, no HTML — so it is CSP-safe and cannot
 * execute anything embedded in a malicious file.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  // Strip a UTF-8 BOM if present.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
    } else {
      field += ch;
    }
  }
  // Flush trailing field/row (unless the file ended on a newline).
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export interface RowIssue {
  /** 1-based data-row number (excludes the header). */
  row: number;
  messages: string[];
}

export interface CsvValidation<T> {
  headers: string[];
  valid: T[];
  issues: RowIssue[];
  /** 1-based row numbers dropped as duplicates of an earlier row. */
  duplicates: number[];
  totalRows: number;
}

/**
 * Parse CSV text and validate each data row against a Zod schema, optionally
 * de-duplicating by a key field. Invalid and duplicate rows are excluded from
 * `valid` and reported so the user sees exactly what will/won't import.
 */
export function validateCsv<T>(
  text: string,
  rowSchema: z.ZodType<T>,
  opts: { dedupeKey?: keyof T } = {}
): CsvValidation<T> {
  const table = parseCsv(text).filter((r) => !(r.length === 1 && r[0].trim() === '')); // drop blank lines
  const headers = (table[0] ?? []).map((h) => h.trim());
  const dataRows = table.slice(1);

  const valid: T[] = [];
  const issues: RowIssue[] = [];
  const duplicates: number[] = [];
  const seen = new Set<string>();

  dataRows.forEach((cells, i) => {
    const rowNo = i + 1;
    const record: Record<string, string> = {};
    headers.forEach((h, c) => {
      record[h] = (cells[c] ?? '').trim();
    });

    const parsed = rowSchema.safeParse(record);
    if (!parsed.success) {
      issues.push({
        row: rowNo,
        messages: parsed.error.issues.map((iss) => `${iss.path.join('.') || 'row'}: ${iss.message}`),
      });
      return;
    }

    if (opts.dedupeKey) {
      const key = String((parsed.data as Record<string, unknown>)[opts.dedupeKey as string]);
      if (seen.has(key)) {
        duplicates.push(rowNo);
        return;
      }
      seen.add(key);
    }
    valid.push(parsed.data);
  });

  return { headers, valid, issues, duplicates, totalRows: dataRows.length };
}
