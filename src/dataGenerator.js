// Generates realistic synthetic water usage data matching the real CSV structure.
// Replace with a real API call (GET /api/readings) when the backend is wired up.

function seed(n) {
  // deterministic pseudo-random from a seed
  let s = n;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateData() {
  const rng = seed(42);

  // daily: 366 days ending today
  const daily = [];
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  for (let i = 365; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dow = d.getDay(); // 0=Sun
    const isWeekend = dow === 0 || dow === 6;
    const base = isWeekend ? 320 : 260;
    const l = Math.max(80, base + (rng() - 0.5) * 120);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    daily.push({ d: `${yyyy}-${mm}-${dd}`, l: +l.toFixed(2) });
  }

  // hourly: last 30 days × 24h
  const hourly = [];
  for (let i = 29 * 24; i >= 0; i--) {
    const t = new Date();
    t.setMinutes(0, 0, 0);
    t.setHours(t.getHours() - i);
    const h = t.getHours();
    // usage pattern: morning peak 6-9, evening peak 17-21, quiet 22-5
    const peak = (h >= 6 && h <= 9) || (h >= 17 && h <= 21);
    const quiet = h >= 22 || h <= 5;
    const base = quiet ? 0.3 : peak ? 18 : 6;
    const l = Math.max(0.1, base + (rng() - 0.5) * base * 0.6);
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    const hh = String(t.getHours()).padStart(2, '0');
    hourly.push({ t: `${yyyy}-${mm}-${dd} ${hh}`, l: +l.toFixed(2) });
  }

  // today: 288 × 5-min readings for the current day
  const today = [];
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  for (let m = 0; m < 288; m++) {
    const t = new Date(dayStart.getTime() + m * 5 * 60 * 1000);
    const h = t.getHours();
    const peak = (h >= 6 && h <= 9) || (h >= 17 && h <= 21);
    const quiet = h >= 22 || h <= 5;
    const base = quiet ? 0.02 : peak ? 0.55 : 0.18;
    const f = Math.max(0, base + (rng() - 0.5) * base * 0.8);
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    const hh = String(t.getHours()).padStart(2, '0');
    const min = String(t.getMinutes()).padStart(2, '0');
    today.push({ t: `${yyyy}-${mm}-${dd} ${hh}:${min}:00`, f: +f.toFixed(3) });
  }

  return { daily, hourly, today };
}
