import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { ImportWizard } from '@/features/import/ImportWizard';

const rowSchema = z
  .object({ sku: z.string().min(1), name: z.string().min(1), price: z.coerce.number().min(0) })
  .strict();

const CSV = ['sku,name,price', 'A1,Milk,1.20', 'A2,,3', 'A3,Eggs,2'].join('\n');
const csvFile = (text = CSV, name = 'products.csv') => new File([text], name, { type: 'text/csv' });

function renderWizard(onImport = vi.fn().mockResolvedValue(undefined), constraints = {}) {
  render(
    <ImportWizard entityName="products" rowSchema={rowSchema} dedupeKey="sku" onImport={onImport} constraints={constraints} />
  );
  return onImport;
}

describe('ImportWizard', () => {
  it('validates a CSV, previews the split, and imports the valid rows', async () => {
    const user = userEvent.setup();
    const onImport = renderWizard();

    await user.upload(screen.getByLabelText('CSV file'), csvFile());

    // 2 valid of 3 total; the empty-name row is flagged.
    await waitFor(() => expect(screen.getByText(/2 of 3 rows ready to import/i)).toBeInTheDocument());
    expect(screen.getByText(/1 row\(s\) have errors/i)).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument(); // the invalid row

    await user.click(screen.getByRole('button', { name: /import 2 products/i }));

    await waitFor(() => expect(screen.getByText('Imported 2 products')).toBeInTheDocument());
    expect(onImport).toHaveBeenCalledOnce();
    expect(onImport.mock.calls[0][0]).toHaveLength(2);
  });

  it('shows an accessible rejection when a file breaks the constraints', async () => {
    const user = userEvent.setup();
    renderWizard(vi.fn(), { maxSizeBytes: 4 }); // CSV is larger than 4 bytes

    await user.upload(screen.getByLabelText('CSV file'), csvFile());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/can’t be used/i);
    expect(alert).toHaveTextContent(/too large/i);
  });

  it('recovers on import failure without losing the file', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn().mockRejectedValue(new Error('Server rejected the batch'));
    renderWizard(onImport);

    await user.upload(screen.getByLabelText('CSV file'), csvFile());
    await waitFor(() => expect(screen.getByRole('button', { name: /import 2 products/i })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: /import 2 products/i }));

    // error surfaced, still on the review step (can retry)
    await waitFor(() => expect(screen.getByText('Import failed')).toBeInTheDocument());
    expect(screen.getByText('Server rejected the batch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import 2 products/i })).toBeEnabled();
  });

  it('disables import when there are no valid rows', async () => {
    const user = userEvent.setup();
    renderWizard(vi.fn(), {});
    // every data row invalid (missing name)
    await user.upload(screen.getByLabelText('CSV file'), csvFile(['sku,name,price', 'A1,,1'].join('\n')));
    await waitFor(() => expect(screen.getByText(/0 of 1 rows ready/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /import 0 products/i })).toBeDisabled();
  });
});
