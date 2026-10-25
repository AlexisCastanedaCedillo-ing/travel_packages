
export const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'MXN',
});


export function amountToCents(amount: string | number): bigint {
  const [whole = '0', fraction = ''] = String(amount).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}
