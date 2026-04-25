export function fmt(n, d = 0) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function pad(n) { return String(n).padStart(2, '0'); }

export function tsLabel(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Client-side EMA stand-in for the real ensemble model output.
// Wire the real predictions from /api/forecast to replace this.
export function makePrediction(actualSeries) {
  const a = 0.18;
  let ema = actualSeries[0]?.f ?? 0;
  return actualSeries.map((p, i) => {
    ema = a * p.f + (1 - a) * ema;
    const bias = Math.sin(i / 30) * 0.08;
    const pred = Math.max(0, ema + bias);
    return { t: p.t, f: pred };
  });
}
