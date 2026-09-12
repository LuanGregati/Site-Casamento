export function normalizePhone(input: string): string {
  return (input || "").replace(/\D/g, "");
}

export function isValidPhone(input: string): boolean {
  const d = normalizePhone(input);
  return d.length >= 10 && d.length <= 13;
}

export function formatPhone(input: string): string {
  const d = normalizePhone(input);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return input;
}
