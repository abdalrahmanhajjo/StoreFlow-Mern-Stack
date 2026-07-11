import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { preflightFiles, parseCsv, validateCsv } from '@/lib/import/preflight';

function file(name: string, size: number, type = 'text/csv'): File {
  const blob = new Blob([new Uint8Array(Math.max(0, size))], { type });
  return new File([blob], name, { type });
}

const constraints = { accept: ['.csv', 'text/csv'], maxSizeBytes: 1024, maxCount: 2 };

describe('preflightFiles', () => {
  it('accepts a valid CSV', () => {
    const r = preflightFiles([file('a.csv', 100)], constraints);
    expect(r.ok).toBe(true);
    expect(r.accepted).toHaveLength(1);
  });

  it('rejects unsupported types, empty files and oversized files', () => {
    expect(preflightFiles([file('a.png', 100, 'image/png')], constraints).rejected[0].reason).toMatch(/Unsupported/);
    expect(preflightFiles([file('a.csv', 0)], constraints).rejected[0].reason).toMatch(/empty/i);
    expect(preflightFiles([file('a.csv', 2048)], constraints).rejected[0].reason).toMatch(/large/i);
  });

  it('rejects files beyond the count limit', () => {
    const r = preflightFiles([file('a.csv', 10), file('b.csv', 10), file('c.csv', 10)], constraints);
    expect(r.rejected.some((x) => /Too many/.test(x.reason))).toBe(true);
  });
});

describe('parseCsv', () => {
  it('handles quotes, embedded commas/newlines and escaped quotes', () => {
    const csv = 'name,note\r\n"Smith, John","line1\nline2"\n"He said ""hi""",ok\n';
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual(['name', 'note']);
    expect(rows[1]).toEqual(['Smith, John', 'line1\nline2']);
    expect(rows[2]).toEqual(['He said "hi"', 'ok']);
  });

  it('strips a UTF-8 BOM', () => {
    expect(parseCsv('﻿a,b\n1,2')[0]).toEqual(['a', 'b']);
  });
});

describe('validateCsv', () => {
  const rowSchema = z
    .object({
      sku: z.string().min(1),
      name: z.string().min(1),
      price: z.coerce.number().min(0),
    })
    .strict();

  it('splits valid rows from rows with errors', () => {
    const csv = ['sku,name,price', 'A1,Milk,1.20', 'A2,,3', 'A3,Eggs,-5'].join('\n');
    const r = validateCsv(csv, rowSchema);
    expect(r.valid).toHaveLength(1);
    expect(r.issues.map((i) => i.row)).toEqual([2, 3]);
    expect(r.issues[0].messages.join()).toMatch(/name/);
  });

  it('rejects over-posted columns (strict schema)', () => {
    const csv = ['sku,name,price,secret', 'A1,Milk,1,evil'].join('\n');
    const r = validateCsv(csv, rowSchema);
    expect(r.valid).toHaveLength(0);
    expect(r.issues).toHaveLength(1);
  });

  it('de-duplicates by key', () => {
    const csv = ['sku,name,price', 'A1,Milk,1', 'A1,Milk,1', 'A2,Eggs,2'].join('\n');
    const r = validateCsv(csv, rowSchema, { dedupeKey: 'sku' });
    expect(r.valid.map((v) => (v as { sku: string }).sku)).toEqual(['A1', 'A2']);
    expect(r.duplicates).toEqual([2]);
  });
});
