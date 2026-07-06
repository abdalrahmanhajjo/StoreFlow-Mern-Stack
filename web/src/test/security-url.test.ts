import { describe, it, expect } from 'vitest';
import { safeUrl, safeImageUrl } from '@/lib/security/url';

describe('safeImageUrl', () => {
  it('accepts http(s) URLs and data:image URIs', () => {
    expect(safeImageUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(safeImageUrl('http://x.test/b.jpg')).toBe('http://x.test/b.jpg');
    expect(safeImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')).toMatch(/^data:image\//);
  });

  it('rejects javascript:, data: (non-image), vbscript: and file: schemes', () => {
    expect(safeImageUrl('javascript:alert(1)')).toBe('');
    expect(safeImageUrl('JavaScript:alert(1)')).toBe('');
    expect(safeImageUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(safeImageUrl('vbscript:msgbox(1)')).toBe('');
    expect(safeImageUrl('file:///etc/passwd')).toBe('');
  });

  it('rejects control-character smuggling (java\\nscript:)', () => {
    expect(safeImageUrl('java\nscript:alert(1)')).toBe('');
    expect(safeImageUrl('java\tscript:alert(1)')).toBe('');
  });

  it('returns empty for blank / nullish input', () => {
    expect(safeImageUrl('')).toBe('');
    expect(safeImageUrl('   ')).toBe('');
    expect(safeImageUrl(undefined)).toBe('');
    expect(safeImageUrl(null)).toBe('');
  });
});

describe('safeUrl', () => {
  it('resolves relative URLs against the base and keeps http(s)', () => {
    expect(safeUrl('/dashboard', 'https://app.storeflow.test')).toBe('https://app.storeflow.test/dashboard');
  });
  it('blocks dangerous schemes even when relative-looking', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
  });
});
