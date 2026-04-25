import { useState, useMemo } from 'react';
import { fmt, makePrediction } from './utils.js';
import { Sparkline, LiveStrip, LineChart, BarChart } from './charts.jsx';

// =============== Rail ===============
export function Rail({ tab, setTab, lastReading, meter, setMeter, meters }) {
  const items = [
    {
      group: 'Monitor', items: [
        { id: 'overview', label: 'Overview' },
        { id: 'forecast', label: 'Forecast' },
        { id: 'anomalies', label: 'Anomalies' },
      ],
    },
  ];

  return (
    <aside className="rail">
      <div className="brand">
        <div className="mark">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 1.5 C8 1.5 3 7 3 10.2 A5 5 0 0 0 13 10.2 C13 7 8 1.5 8 1.5 Z"
              fill="none" stroke="var(--accent)" strokeWidth="1.4" />
          </svg>
        </div>
        <div className="name"><b>SMART WATER</b> · meter</div>
      </div>

      <nav className="nav">
        {items.map((sec, i) => (
          <div key={i}>
            <div className="label">{sec.group}</div>
            {sec.items.map(it => (
              <button key={it.id} className={tab === it.id ? 'active' : ''} onClick={() => setTab(it.id)}>
                <span className="dot"></span>{it.label}
              </button>
            ))}
          </div>
        ))}

        <div className="label">Selection of meter</div>
        <div className="meter-select">
          <select value={meter} onChange={e => setMeter(e.target.value)}>
            {meters.map(m => (
              <option key={m.id} value={m.id}>{m.id} — {m.zone}</option>
            ))}
          </select>
        </div>
      </nav>

      <div className="device">
        <div className="row"><span>Meter</span><b>{meter || 'WM-10293'}</b></div>
        <div className="row">
          <span>Status</span>
          <span className="pulse"><span className="led"></span><b style={{ color: 'var(--good)' }}>ONLINE</b></span>
        </div>
        <div className="row"><span>Last push</span><b>{lastReading}</b></div>
      </div>
    </aside>
  );
}

// =============== Topbar ===============
export function Topbar({ tab, clock, onToggleTweaks }) {
  const titles = {
    overview: 'Overview',
    forecast: 'Actual vs predicted',
    anomalies: 'Anomalies & leaks',
    arch: 'System architecture',
    plan: 'Development plan',
  };
  return (
    <div className="topbar">
      <h1>
        <span className="muted">Smart Water Meter</span>
        <span className="crumb">/</span>
        {titles[tab]}
      </h1>
      <div className="meta">
        <span>Colombo · LK</span>
        <span>·</span>
        <span className="clock">{clock}</span>
        <button className="settings-btn" onClick={onToggleTweaks} title="Tweaks">⚙ Tweaks</button>
      </div>
    </div>
  );
}

// =============== Scope toggle ===============
function Scope({ scope, setScope }) {
  const opts = ['5min', '1h', '1d', '7d', '30d'];
  return (
    <div className="scope">
      {opts.map(o => (
        <button key={o} className={scope === o ? 'active' : ''} onClick={() => setScope(o)}>{o}</button>
      ))}
    </div>
  );
}

// =============== Overview ===============
export function Overview({ data, scope, setScope, simulating, anomalies }) {
  const today = data.today;
  const current = today[today.length - 1]?.f ?? 0;
  const usage24 = today.reduce((s, p) => s + p.f * 5, 0);
  const last30 = data.daily.slice(-30);
  const avg30 = last30.reduce((s, d) => s + d.l, 0) / last30.length;
  const yest = data.daily[data.daily.length - 2]?.l ?? 0;
  const delta = (usage24 - yest) / Math.max(1, yest) * 100;

  const scoped = useMemo(() => {
    if (scope === '5min') return data.today.slice(-12).map(p => ({ t: p.t.slice(11, 16), v: p.f }));
    if (scope === '1h')   return data.today.slice(-12).map(p => ({ t: p.t.slice(11, 16), v: p.f }));
    if (scope === '1d')   return data.today.map(p => ({ t: p.t.slice(11, 16), v: p.f }));
    if (scope === '7d')   return data.hourly.slice(-7 * 24).map(p => ({ t: p.t.slice(5, 13), v: p.l }));
    if (scope === '30d')  return data.daily.slice(-30).map(p => ({ t: p.d.slice(5), v: p.l }));
  }, [scope, data]);

  const dailyBars = data.daily.slice(-14).map(d => ({ t: d.d.slice(5), v: d.l }));
  const weeklyBars = useMemo(() => {
    const out = [];
    const days = data.daily.slice(-12 * 7);
    for (let i = 0; i < days.length; i += 7) {
      const wk = days.slice(i, i + 7);
      const sum = wk.reduce((s, d) => s + d.l, 0);
      out.push({ t: 'W' + (Math.floor(i / 7) + 1), v: sum });
    }
    return out;
  }, [data]);

  const sparkFlow = today.slice(-60).map(p => p.f);
  const sparkUsage = data.daily.slice(-14).map(d => d.l);

  return (
    <>
      <div className="hero">
        <div className="lead">
          <div className="eyebrow">Current flow · LIVE</div>
          <div className="num">{current.toFixed(2)}<small>L/min</small></div>
          <div className="delta">
            Today{' '}
            <span className={'pill ' + (delta > 0 ? 'up' : 'down')}>
              {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
            </span>{' '}
            vs yesterday
          </div>
          <div className="sub">
            Streaming from <span className="mono">WM-10293</span>. Forecast model is a BiLSTM-Attn × PatchTST
            ensemble served from the inference API; updates hourly with the latest 168h context window.
          </div>
        </div>
        <LiveStrip data={today} />
      </div>

      <div className="kpis">
        <div className="kpi">
          <div className="k">Last 24h usage</div>
          <div className="v">{fmt(usage24, 1)}<small>L</small></div>
          <div className="foot">vs 30-day avg {fmt(avg30, 0)} L</div>
          <div className="spark"><Sparkline data={sparkFlow} w={140} color="var(--accent)" /></div>
        </div>
        <div className="kpi">
          <div className="k">Month-to-date</div>
          <div className="v">{fmt(data.daily.slice(-30).reduce((s, d) => s + d.l, 0) / 1000, 2)}<small>m³</small></div>
          <div className="foot">{fmt(data.daily.slice(-30).reduce((s, d) => s + d.l, 0), 0)} L · 30 days</div>
          <div className="spark"><Sparkline data={sparkUsage} w={140} color="var(--ink-2)" /></div>
        </div>
        <div className="kpi">
          <div className="k">Predicted next 24h</div>
          <div className="v">{fmt(usage24 * 1.04, 1)}<small>L</small></div>
          <div className="foot">95% CI {fmt(usage24 * 0.88, 0)} – {fmt(usage24 * 1.20, 0)} L</div>
          <div className="spark">
            <Sparkline data={sparkFlow.map((v, i) => v + Math.sin(i / 8) * 0.05)} w={140} color="var(--accent-2)" />
          </div>
        </div>
        <div className="kpi">
          <div className="k">ALERTS STATUS</div>
          <div className="v" style={{ color: anomalies.length ? 'var(--bad)' : 'var(--good)' }}>
            {anomalies.length ? anomalies.length : 'OK'}
          </div>
          <div className="foot">{anomalies.length ? 'open alerts · review feed' : 'no leaks detected · 7d window'}</div>
          <div className="spark">
            <svg width="140" height="22">
              <line x1="0" y1="11" x2="140" y2="11"
                stroke={anomalies.length ? 'var(--bad)' : 'var(--good)'}
                strokeDasharray="2 4" />
            </svg>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>
          Flow rate
          <span className="aside"><Scope scope={scope} setScope={setScope} /></span>
        </h2>
        <div className="panel">
          <div className="head">
            <div className="t">Flow rate · {scope}</div>
            <div className="legend">
              <span className="sw" style={{ color: 'var(--accent)' }}>
                <i style={{ background: 'var(--accent)' }}></i>Actual flow
              </span>
            </div>
          </div>
          <LineChart
            height={260}
            series={[{ data: scoped, color: 'var(--accent)', label: 'Flow', unit: 'L/min', fill: true }]}
            xFormat={t => t}
          />
        </div>
      </div>

      <div className="section">
        <div className="row2">
          <div className="panel">
            <div className="head">
              <div className="t">Daily usage · last 14 days</div>
              <div className="s">liters</div>
            </div>
            <BarChart data={dailyBars} color="var(--accent)" />
          </div>
          <div className="panel">
            <div className="head">
              <div className="t">Weekly usage · last 12 weeks</div>
              <div className="s">liters</div>
            </div>
            <BarChart data={weeklyBars} color="var(--accent-2)" />
          </div>
        </div>
      </div>
    </>
  );
}

// =============== Forecast ===============
export function Forecast({ data }) {
  const [scope, setScope] = useState('1d');

  const series = useMemo(() => {
    let actual;
    if (scope === '1d') actual = data.today.map(p => ({ t: p.t.slice(11, 16), v: p.f }));
    else if (scope === '7d') actual = data.hourly.slice(-7 * 24).map(p => ({ t: p.t.slice(5, 13), v: p.l / 60 }));
    else actual = data.daily.slice(-30).map(p => ({ t: p.d.slice(5), v: p.l / 1440 }));

    const pred = makePrediction(actual.map(p => ({ t: p.t, f: p.v }))).map(p => ({ t: p.t, v: p.f }));
    const band = pred.map(p => ({ lo: Math.max(0, p.v * 0.85), hi: p.v * 1.18 }));
    return { actual, pred, band };
  }, [scope, data]);

  return (
    <>
      <div className="section tight">
        <h2>
          Actual vs predicted
          <span className="aside"><Scope scope={scope} setScope={setScope} /></span>
        </h2>
        <div className="panel">
          <div className="head">
            <div className="t">BiLSTM-Attn × PatchTST · ensemble forecast</div>
            <div className="legend">
              <span className="sw" style={{ color: 'var(--accent)' }}>
                <i style={{ background: 'var(--accent)' }}></i>Actual
              </span>
              <span className="sw dash" style={{ color: 'var(--ink-2)' }}><i></i>Predicted</span>
            </div>
          </div>
          <LineChart
            height={320}
            series={[
              { data: series.actual, color: 'var(--accent)', label: 'Actual', unit: 'L/min', fill: false },
              { data: series.pred, color: 'var(--ink-2)', label: 'Predicted', unit: 'L/min', dashed: true },
            ]}
            bandSeries={series.band}
          />
        </div>
      </div>

      <div className="section">
        <div className="panel">
          <div className="head"><div className="t">Important Data</div></div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <tbody>
              {[
                ['Active hours', '06–21 '],
                ['Quiet hours', '22–05 '],
              ].map(([k, v], i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 0', color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{k}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="row2">
          <div className="panel">
            <div className="head"><div className="t">Actual readings</div><div className="s">latest 12</div></div>
            <div className="rtable">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th className="num">Total liters</th>
                    <th className="num">Flow (L/min)</th>
                    <th className="num">Battery (V)</th>
                  </tr>
                </thead>
                <tbody>
                  {series.actual.slice(-12).reverse().map((p, i) => {
                    const totalBase = 92800;
                    const totalLiters = totalBase + (series.actual.length - 1 - i) * 0.6 + Math.random() * 0.3;
                    const battery = (3.86 + Math.sin(i) * 0.01).toFixed(3);
                    return (
                      <tr key={i}>
                        <td>{p.t}</td>
                        <td className="num">{totalLiters.toFixed(3)}</td>
                        <td className="num">{p.v.toFixed(3)}</td>
                        <td className="num">{battery}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <div className="head"><div className="t">Estimated readings</div><div className="s">model output</div></div>
            <div className="rtable">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th className="num">Total liters</th>
                    <th className="num">Flow (L/min)</th>
                  </tr>
                </thead>
                <tbody>
                  {series.pred.slice(-12).reverse().map((p, i) => {
                    const totalBase = 92800;
                    const totalLiters = totalBase + (series.pred.length - 1 - i) * 0.6;
                    return (
                      <tr key={i}>
                        <td>{p.t}</td>
                        <td className="num">{totalLiters.toFixed(3)}</td>
                        <td className="num">{p.v.toFixed(3)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =============== Anomalies ===============
export function Anomalies({ events, onSimulate, simulating }) {
  return (
    <>
      <div className="section">
        <h2>
          Detection rules
          <span className="aside">
            <button className={'btn ' + (simulating ? 'danger' : 'primary')} onClick={onSimulate}>
              {simulating ? '■ Stop leak simulation' : '▶ Simulate leak event'}
            </button>
          </span>
        </h2>

        <div className="row2">
          <div className="panel">
            <div className="head"><div className="t">Active rules</div></div>
            <ul style={{ margin: '8px 0 0', padding: '0 0 0 16px', color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.7 }}>
              <li><b style={{ color: 'var(--ink)' }}>Continuous flow</b> · &gt; 0.05 L/min for 6h overnight (02:00–05:00)</li>
              <li><b style={{ color: 'var(--ink)' }}>Predicted vs actual</b> · |actual − predicted| &gt; 3σ for 30 min</li>
              <li><b style={{ color: 'var(--ink)' }}>Burst pipe</b> · flow &gt; P99 of 30-day rolling window</li>
              <li><b style={{ color: 'var(--ink)' }}>Sensor offline</b> · no push from ESP32 for &gt; 15 min</li>
              <li><b style={{ color: 'var(--ink)' }}>Battery low</b> · supply voltage &lt; 3.6V</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Recent events <span className="aside">last 7 days</span></h2>
        <div className="panel feed">
          {events.length === 0 && <div style={{ color: 'var(--ink-3)', padding: '18px 0' }}>No events recorded.</div>}
          {events.map((e, i) => (
            <div key={i} className="item">
              <div className="when">{e.when}</div>
              <div className="what">
                <div>{e.title}</div>
                <div className="sub">{e.detail}</div>
              </div>
              <div className={'sev ' + e.sev}>{e.sevLabel}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// =============== Architecture ===============
export function Architecture() {
  const stages = [
    { stage: '1 · Sense', title: 'ESP32 + flow sensor', items: ['YF-S201 Hall sensor', 'Pulse counter ISR', 'WiFi MQTT push @ 5s', 'Battery + SD fallback'] },
    { stage: '2 · Ingest', title: 'Node.js gateway', items: ['MQTT broker (Mosquitto)', 'Express + Socket.IO', 'Joi schema validation', 'Bulk write to Mongo'] },
    { stage: '3 · Store', title: 'MongoDB', items: ['Time-series collection', 'meter_id + ts compound idx', 'Hourly + daily rollups', 'TTL: raw 90d, agg 5y'] },
    { stage: '4 · Predict', title: 'Inference API', items: ['FastAPI worker (Python)', 'BiLSTM-Attn + PatchTST', 'Hourly batched forecast', 'Anomaly residual scoring'] },
    { stage: '5 · Present', title: 'React dashboard', items: ['Live socket stream', 'Recharts / D3 visuals', 'Push notifications', 'Mobile-responsive PWA'] },
  ];

  return (
    <div className="doc">
      <h2 className="dh">System architecture</h2>
      <p className="lead">
        Five stages, one direction of flow. The ESP32 publishes timestamped flow rates over MQTT;
        a Node gateway validates and persists to MongoDB; a Python inference worker reads recent windows,
        runs the ensemble model, and writes back predictions plus anomaly scores; the React dashboard streams
        the latest readings and forecasts over a websocket.
      </p>

      <div className="arch">
        {stages.map((s, i) => (
          <div className="node" key={i}>
            <div className="stage">{s.stage}</div>
            <div className="ttl">{s.title}</div>
            <ul>{s.items.map((it, k) => <li key={k}>{it}</li>)}</ul>
            <div className="arrow"></div>
          </div>
        ))}
      </div>

      <h3>Data shape</h3>
      <pre style={{ background: 'var(--panel)', border: '1px solid var(--line)', padding: '14px 16px', borderRadius: 4, fontSize: 12, color: 'var(--ink-2)', overflow: 'auto', fontFamily: 'var(--mono)' }}>
{`// Reading (raw)
{ meter_id: "WM-10293", ts: "2026-04-25T13:55:00Z", flow_lpm: 0.84, battery_v: 3.86 }

// Forecast (computed hourly)
{ meter_id: "WM-10293", horizon_h: 24, ts_origin: "...",
  pred: [{ ts, mean, lo95, hi95 }, ...], model: "bilstm-patchtst-ensemble@v1.4" }

// Anomaly event
{ meter_id, ts, type: "continuous-flow"|"residual-3s"|"burst",
  severity: "info"|"warn"|"bad", duration_s, evidence: { ... } }`}
      </pre>

      <h3>API surface</h3>
      <ul>
        <li><code>POST /api/ingest</code> — gateway endpoint for ESP32 fallback (HTTP if MQTT unavailable)</li>
        <li><code>GET  /api/readings?meter&amp;from&amp;to&amp;granularity</code> — raw / hourly / daily series</li>
        <li><code>GET  /api/forecast?meter&amp;horizon</code> — latest forecast with 95% CI</li>
        <li><code>GET  /api/anomalies?meter&amp;since</code> — open + resolved events</li>
        <li><code>WS   /stream/:meter</code> — live readings + alerts as they happen</li>
      </ul>
    </div>
  );
}

// =============== Plan ===============
export function Plan() {
  const weeks = [
    { w: 'Week 1', h: 'Firmware + ingest pipeline', b: 'ESP32 sketch with hall-sensor pulse counting and MQTT publish at 5-second cadence; Mosquitto broker; Node gateway subscribes, validates, batches into Mongo. Verify end-to-end with a single bench meter.' },
    { w: 'Week 2', h: 'Storage schema + REST API', b: 'Mongo time-series collection; hourly and daily materialized rollups via change-stream worker; Express endpoints for readings, summaries, and meter metadata. Add Joi schemas and rate limits.' },
    { w: 'Week 3', h: 'React dashboard scaffold', b: 'Vite + React + Tailwind shell with this layout. Live flow strip via Socket.IO. Daily / weekly bar charts wired to the API. Auth (JWT) and a simple meter switcher.' },
    { w: 'Week 4', h: 'Inference service', b: 'Containerize the BiLSTM-Attn × PatchTST ensemble behind FastAPI. Hourly cron pulls last 168h, runs prediction, writes 24h horizon back to Mongo. Add 5-fold OOF for quiet-hour residuals.' },
    { w: 'Week 5', h: 'Forecast view + anomaly engine', b: 'Actual-vs-predicted chart with confidence band, residuals strip, and per-rule anomaly detector. Push notifications via web-push for severity ≥ warn.' },
    { w: 'Week 6', h: 'Hardening + deploy', b: 'Load test 1k meters at 5s cadence, add PM2 + healthchecks, ship to a small VPS. Optional: Grafana for ops, mobile PWA wrapping for end-users.' },
  ];

  return (
    <div className="doc">
      <h2 className="dh">Step-by-step development plan</h2>
      <p className="lead">
        Six weeks, one focus per week, end-to-end working slice every Friday. Each week ships behind a feature flag so the
        previous slice keeps running while the next one is built.
      </p>

      <div style={{ marginTop: 24 }}>
        {weeks.map((wk, i) => (
          <div className="timeline" key={i}>
            <div className="week">{wk.w}</div>
            <div className="step">
              <div className="h">{wk.h}</div>
              <div className="b">{wk.b}</div>
            </div>
          </div>
        ))}
      </div>

      <h3>Stack pinned</h3>
      <ul>
        <li><b style={{ color: 'var(--ink)' }}>Device</b> — ESP32-WROOM, YF-S201 1–30 L/min hall sensor, MQTT over TLS</li>
        <li><b style={{ color: 'var(--ink)' }}>Backend</b> — Node 20 + Express + Socket.IO, Mosquitto, Mongo 7 (time-series)</li>
        <li><b style={{ color: 'var(--ink)' }}>Inference</b> — Python 3.11, PyTorch, FastAPI, scheduled via Mongo change-stream + node-cron</li>
        <li><b style={{ color: 'var(--ink)' }}>Frontend</b> — React 18, Vite, custom SVG charts</li>
        <li><b style={{ color: 'var(--ink)' }}>Ops</b> — Docker Compose, Caddy reverse-proxy, GitHub Actions CI, log shipping to Loki</li>
      </ul>

      <h3>Risks &amp; mitigations</h3>
      <ul>
        <li><b style={{ color: 'var(--ink)' }}>Network drops at the meter</b> — ESP32 keeps a 24h ring buffer in SPIFFS and replays on reconnect.</li>
        <li><b style={{ color: 'var(--ink)' }}>Model drift</b> — weekly OOF re-evaluation; alert when MAPE exceeds 25% over a rolling 7-day window.</li>
        <li><b style={{ color: 'var(--ink)' }}>False leak alerts</b> — every rule needs a sustained-duration trigger; user can mute per-rule from the Anomalies tab.</li>
      </ul>
    </div>
  );
}
