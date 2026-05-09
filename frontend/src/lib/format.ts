export const usd = (n: number | null | undefined, opts: { sign?: boolean; decimals?: number } = {}) => {
  if (n == null || isNaN(n)) return "—";
  const decimals = opts.decimals ?? (Math.abs(n) < 10 ? 2 : 0);
  const v = n.toLocaleString("en-US", { style: "currency", currency: "USD",
    minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return opts.sign && n > 0 ? `+${v}` : v;
};
export const num = (n: number | null | undefined, decimals = 2) =>
  n == null || isNaN(n) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
export const pct = (n: number | null | undefined, decimals = 0) =>
  n == null || isNaN(n) ? "—" : `${(n * 100).toFixed(decimals)}%`;
export const sigma = (n: number | null | undefined) =>
  n == null || isNaN(n) ? "—" : `${n.toFixed(1)}σ`;

export const ago = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
};
