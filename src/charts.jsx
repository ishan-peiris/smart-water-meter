import { useState, useEffect, useRef } from 'react';
import { fmt } from './utils.js';

export function Sparkline({ data, w = 120, h = 22, color = 'currentColor', fill = true }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data, 0.001);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w;
    const y = h - (v / max) * h;
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

export function LiveStrip({ data }) {
  const ref = useRef();
  const [size, setSize] = useState({ w: 800, h: 180 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(es => {
      const r = es[0].contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf;
    const loop = () => { setTick(t => t + 1); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const { w, h } = size;
  const pad = { l: 38, r: 16, t: 28, b: 26 };
  const cw = Math.max(40, w - pad.l - pad.r);
  const ch = Math.max(40, h - pad.t - pad.b);

  const max = Math.max(...data.map(d => d.f), 0.5);
  const N = data.length;
  const offset = (tick * 0.3) % 1;

  const pts = data.map((d, i) => {
    const x = pad.l + ((i - offset) / (N - 1)) * cw;
    const y = pad.t + ch - (d.f / max) * ch;
    return [x, y];
  });

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${pad.l + cw},${pad.t + ch} L${pad.l},${pad.t + ch} Z`;

  const yTicks = [0, max / 2, max].map(v => ({
    v, y: pad.t + ch - (v / max) * ch,
  }));

  return (
    <div ref={ref} className="strip">
      <div className="label"><span className="live">LIVE</span>  ·  FLOW · LPM</div>
      <svg width={w} height={h}>
        <defs>
          <linearGradient id="flowGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + cw} y1={t.y} y2={t.y} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={pad.l - 8} y={t.y + 3} fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)" textAnchor="end">{t.v.toFixed(1)}</text>
          </g>
        ))}
        <path d={area} fill="url(#flowGrad)" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.6" />
        <text x={pad.l} y={h - 8} fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)">−24h</text>
        <text x={pad.l + cw} y={h - 8} fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)" textAnchor="end">now</text>
      </svg>
    </div>
  );
}

export function LineChart({ series, height = 260, xFormat, bandSeries = null }) {
  const ref = useRef();
  const [size, setSize] = useState({ w: 700, h: height });
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(es => {
      const r = es[0].contentRect;
      setSize(() => ({ w: r.width, h: height }));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [height]);

  const { w } = size;
  const h = height;
  const pad = { l: 44, r: 16, t: 14, b: 28 };
  const cw = Math.max(40, w - pad.l - pad.r);
  const ch = Math.max(40, h - pad.t - pad.b);

  const all = series.flatMap(s => s.data.map(d => d.v));
  if (bandSeries) all.push(...bandSeries.flatMap(p => [p.lo, p.hi]));
  const max = Math.max(...all, 0.001) * 1.08;
  const min = 0;
  const N = series[0].data.length;

  const xPos = (i) => pad.l + (i / (N - 1 || 1)) * cw;
  const yPos = (v) => pad.t + ch - ((v - min) / (max - min)) * ch;

  const ticks = [];
  for (let i = 0; i <= 4; i++) {
    const v = min + (i / 4) * (max - min);
    ticks.push({ v, y: yPos(v) });
  }
  const xStep = Math.max(1, Math.floor(N / 6));
  const xTicks = [];
  for (let i = 0; i < N; i += xStep) xTicks.push(i);
  if (xTicks[xTicks.length - 1] !== N - 1) xTicks.push(N - 1);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    if (px < pad.l || px > pad.l + cw) { setHover(null); return; }
    const idx = Math.round(((px - pad.l) / cw) * (N - 1));
    setHover({ idx, px });
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width={w} height={h} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`g${si}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.30" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + cw} y1={t.y} y2={t.y} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={pad.l - 8} y={t.y + 3} fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)" textAnchor="end">
              {t.v.toFixed(t.v < 10 ? 2 : 0)}
            </text>
          </g>
        ))}

        {bandSeries && (() => {
          const top = bandSeries.map((p, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(p.hi).toFixed(1)}`).join(' ');
          const bot = bandSeries.slice().reverse().map((p, i) => {
            const idx = bandSeries.length - 1 - i;
            return `L${xPos(idx).toFixed(1)},${yPos(p.lo).toFixed(1)}`;
          }).join(' ');
          return <path d={`${top} ${bot} Z`} fill="var(--accent)" opacity="0.12" />;
        })()}

        {series.map((s, si) => {
          const path = s.data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(d.v).toFixed(1)}`).join(' ');
          const area = s.fill
            ? `${path} L${xPos(N - 1).toFixed(1)},${yPos(0).toFixed(1)} L${xPos(0).toFixed(1)},${yPos(0).toFixed(1)} Z`
            : null;
          return (
            <g key={si}>
              {area && <path d={area} fill={`url(#g${si})`} />}
              <path d={path} fill="none" stroke={s.color}
                strokeWidth={s.dashed ? 1.5 : 1.6}
                strokeDasharray={s.dashed ? '4 4' : ''} />
            </g>
          );
        })}

        {xTicks.map((i, k) => (
          <text key={k} x={xPos(i)} y={h - 10} fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)" textAnchor="middle">
            {xFormat ? xFormat(series[0].data[i].t) : series[0].data[i].t}
          </text>
        ))}

        {hover && (
          <g>
            <line x1={xPos(hover.idx)} x2={xPos(hover.idx)} y1={pad.t} y2={pad.t + ch} stroke="var(--line-2)" />
            {series.map((s, si) => (
              <circle key={si} cx={xPos(hover.idx)} cy={yPos(s.data[hover.idx].v)}
                r="3.5" fill="var(--bg)" stroke={s.color} strokeWidth="1.6" />
            ))}
          </g>
        )}
      </svg>

      {hover && (
        <div className="tip show" style={{ left: xPos(hover.idx), top: pad.t }}>
          <div className="l">{xFormat ? xFormat(series[0].data[hover.idx].t) : series[0].data[hover.idx].t}</div>
          {series.map((s, si) => (
            <div key={si}>
              <span style={{ color: s.color }}>● </span>
              {s.label}: {fmt(s.data[hover.idx].v, 2)} {s.unit || ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BarChart({ data, height = 240, color = 'var(--accent)', label = 'liters' }) {
  const ref = useRef();
  const [size, setSize] = useState({ w: 700, h: height });
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(es => {
      const r = es[0].contentRect;
      setSize({ w: r.width, h: height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [height]);

  const { w } = size;
  const h = height;
  const pad = { l: 44, r: 16, t: 14, b: 28 };
  const cw = Math.max(40, w - pad.l - pad.r);
  const ch = Math.max(40, h - pad.t - pad.b);
  const max = Math.max(...data.map(d => d.v), 0.001) * 1.1;
  const bw = cw / data.length;

  const ticks = [];
  for (let i = 0; i <= 4; i++) {
    const v = (i / 4) * max;
    ticks.push({ v, y: pad.t + ch - (v / max) * ch });
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg width={w} height={h}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + cw} y1={t.y} y2={t.y} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={pad.l - 8} y={t.y + 3} fontSize="10" fill="var(--ink-3)" fontFamily="var(--mono)" textAnchor="end">
              {fmt(t.v, 0)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const bh = (d.v / max) * ch;
          const x = pad.l + i * bw + 2;
          const y = pad.t + ch - bh;
          const isHover = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={y} width={Math.max(2, bw - 4)} height={bh}
                fill={color} opacity={isHover ? 0.95 : 0.75} />
              {i % Math.max(1, Math.floor(data.length / 8)) === 0 && (
                <text x={x + (bw - 4) / 2} y={h - 10} fontSize="10" fill="var(--ink-3)"
                  fontFamily="var(--mono)" textAnchor="middle">{d.t}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="tip show" style={{ left: pad.l + hover * bw + bw / 2, top: pad.t + ch - (data[hover].v / max) * ch }}>
          <div className="l">{data[hover].t}</div>
          <div>{fmt(data[hover].v, 0)} {label}</div>
        </div>
      )}
    </div>
  );
}
