// Shared formatters (money uses tabular 2dp; points are integers).
export const money = (n: number): string =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const points = (n: number): string => n.toLocaleString('en-US');
