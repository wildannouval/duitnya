export function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Ambil hanya digit, kembalikan integer (positif). "12.345" -> 12345 */
export function parseCurrencyToInt(s: string) {
  if (s == null) return 0;
  const digits = String(s).replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}
