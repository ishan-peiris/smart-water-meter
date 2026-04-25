import { useState, useEffect, useMemo } from 'react';
import { pad } from './utils.js';
import { Rail, Topbar, Overview, Forecast, Anomalies, Architecture, Plan } from './views.jsx';
import { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakRadio, TweakToggle } from './TweaksPanel.jsx';
import { generateData } from './dataGenerator.js';

const TWEAK_DEFAULTS = {
  theme: 'dark',
  accentHue: 220,
  density: 'comfortable',
  leakSimulation: false,
};

const METERS = [
  { id: 'WM-10293', zone: 'Kaluthara' },
  { id: 'WM-10294', zone: 'Colombo 03' },
  { id: 'WM-10295', zone: 'Colombo 07' },
  { id: 'WM-10296', zone: 'Dehiwala' },
  { id: 'WM-10297', zone: 'Mt. Lavinia' },
];

export default function App() {
  const [tab, setTab] = useState('overview');
  const [scope, setScope] = useState('1d');
  const [data, setData] = useState(null);
  const [now, setNow] = useState(new Date());
  const [simulating, setSimulating] = useState(false);
  const [meter, setMeter] = useState('WM-10293');
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);

  // Apply theme + accent hue to :root
  useEffect(() => {
    document.body.classList.toggle('theme-light', tweaks.theme === 'light');
    document.documentElement.style.setProperty(
      '--accent',
      `oklch(${tweaks.theme === 'light' ? '55%' : '78%'} 0.12 ${tweaks.accentHue})`
    );
    document.documentElement.style.setProperty(
      '--accent-2',
      `oklch(${tweaks.theme === 'light' ? '45%' : '70%'} 0.14 ${tweaks.accentHue})`
    );
  }, [tweaks.theme, tweaks.accentHue]);

  // Load data — swap generateData() for fetch('/api/readings') when backend is ready
  useEffect(() => {
    setData(generateData());
  }, []);

  // Live clock
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  // Simulate live tail: append a new flow reading every ~2s
  useEffect(() => {
    if (!data) return;
    const i = setInterval(() => {
      setData(d => {
        if (!d) return d;
        const t = new Date(); t.setSeconds(0, 0);
        const ts = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:00`;
        const last = d.today[d.today.length - 1];
        let f = Math.max(0, last.f + (Math.random() - 0.5) * 0.3);
        if (simulating || tweaks.leakSimulation) {
          f = 0.45 + Math.random() * 0.15;
        } else if (Math.random() < 0.02) {
          f = Math.random() * 5;
        }
        const today = [...d.today.slice(1), { t: ts, f: +f.toFixed(3) }];
        return { ...d, today };
      });
    }, 2000);
    return () => clearInterval(i);
  }, [data && data.today.length, simulating, tweaks.leakSimulation]);

  // Anomaly events (synthetic but data-driven)
  const anomalies = useMemo(() => {
    if (!data) return [];
    const events = [];
    if (simulating || tweaks.leakSimulation) {
      events.push({
        when: 'just now',
        title: 'Continuous flow detected',
        detail: 'Sustained 0.45–0.60 L/min during quiet hours · likely leak at fixture or main',
        sev: 'bad', sevLabel: 'Critical',
      });
    }
    events.push(
      {
        when: '2h ago', title: ' Residual exceed  water ',
        detail: '',
        sev: 'warn', sevLabel: 'Warning',
      },
      {
        when: 'yesterday 03:14', title: 'Sensor offline · 18 min',
        detail: 'No MQTT push from WM-10293 between 03:14 and 03:32 · auto-recovered',
        sev: 'info', sevLabel: 'Info',
      },
      {
        when: '3d ago', title: 'Battery low on backup cell',
        detail: 'Supply voltage dropped to 3.58V briefly during ingest · resolved',
        sev: 'info', sevLabel: 'Info',
      },
    );
    return events;
  }, [data, simulating, tweaks.leakSimulation]);

  const lastReading = useMemo(() => {
    if (!data) return '—';
    const t = data.today[data.today.length - 1].t;
    return t.slice(11, 16);
  }, [data]);

  const clock = useMemo(() => {
    const d = now;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, [now]);

  if (!data) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
        loading meter data…
      </div>
    );
  }

  return (
    <div className="app">
      <Rail tab={tab} setTab={setTab} lastReading={lastReading} meter={meter} setMeter={setMeter} meters={METERS} />
      <main className="main">
        <Topbar tab={tab} clock={clock} onToggleTweaks={() => setTweaksOpen(o => !o)} />
        {tab === 'overview' && (
          <Overview
            data={data}
            scope={scope}
            setScope={setScope}
            simulating={simulating || tweaks.leakSimulation}
            anomalies={anomalies.filter(e => e.sev === 'bad' || e.sev === 'warn')}
          />
        )}
        {tab === 'forecast' && <Forecast data={data} />}
        {tab === 'anomalies' && (
          <Anomalies
            events={anomalies}
            simulating={simulating}
            onSimulate={() => setSimulating(s => !s)}
          />
        )}
        {tab === 'arch' && <Architecture />}
        {tab === 'plan' && <Plan />}
      </main>

      <TweaksPanel title="Tweaks" open={tweaksOpen} onClose={() => setTweaksOpen(false)}>
        <TweakSection title="Theme">
          <TweakRadio
            label="Mode"
            value={tweaks.theme}
            options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
            onChange={v => setTweaks({ theme: v })}
          />
          <TweakSlider
            label="Accent hue"
            value={tweaks.accentHue}
            min={0} max={360} step={5}
            onChange={v => setTweaks({ accentHue: v })}
          />
        </TweakSection>
        <TweakSection title="Demo">
          <TweakToggle
            label="Leak simulation"
            value={tweaks.leakSimulation}
            onChange={v => setTweaks({ leakSimulation: v })}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}
