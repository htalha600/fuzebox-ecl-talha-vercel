export function Logo({ size = 28 }: { size?: number }) {
  // Paul-Rand-inspired: an "Σ-cube" — Sigma rotated inside a square.
  return (
    <div
      className="flex items-center justify-center rounded-lg shrink-0"
      style={{ width: size, height: size, background: "linear-gradient(135deg,#2563eb 0%,#0ea5e9 50%,#f97316 100%)" }}
      aria-label="FuzeBox AEOS"
    >
      <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 5H7l5 7-5 7h10" />
      </svg>
    </div>
  );
}
