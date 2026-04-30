import { useEffect, useMemo, useState } from 'react';
import { Ticker } from './components/ticker';
import { Header } from './components/header';
import { ScenarioPicker } from './components/scenariopicker';
import { ConfigPanel } from './components/configpanel';
import { Topology } from './components/topology';
import { CwndChart } from './components/cwndchart';
import { MetricsPanel } from './components/metricspanel';
import { SCENARIOS, DEFAULT_SCENARIO_ID } from './lib/scenarios';
import { simulate, compare, checkHealth } from './lib/api';
import type { Variant, CwndPoint, Metrics, CompareResultEntry } from './lib/types';

type SimState = 'idle' | 'running' | 'done' | 'error';

export default function App() {
  const [scenarioId, setScenarioId] = useState<string>(DEFAULT_SCENARIO_ID);
  const scenario = useMemo(
    () => SCENARIOS.find(s => s.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId]
  );

  const [variant,   setVariant]   = useState<Variant>(scenario.variant ?? 'newreno');
  const [bandwidth, setBandwidth] = useState<string>(scenario.bandwidth);
  const [delay,     setDelay]     = useState<string>(scenario.delay);
  const [queueSize, setQueueSize] = useState<number>(scenario.queueSize);
  const [duration,  setDuration]  = useState<number>(scenario.duration);

  // compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [variant2, setVariant2] = useState<Variant>('reno');

  const [syncedScenarioId, setSyncedScenarioId] = useState<string | null>(null);
  if (scenario.id !== syncedScenarioId) {
    setSyncedScenarioId(scenario.id);
    if (!scenario.isCustom) {
      if (scenario.variant !== null) setVariant(scenario.variant);
      setBandwidth(scenario.bandwidth);
      setDelay(scenario.delay);
      setQueueSize(scenario.queueSize);
      setDuration(scenario.duration);
    }
  }

  const [cwndData,     setCwndData]     = useState<CwndPoint[]>([]);
  const [metrics,      setMetrics]      = useState<Metrics | null>(null);
  const [compareData,  setCompareData]  = useState<CompareResultEntry[] | null>(null);
  const [simState,     setSimState]     = useState<SimState>('idle');
  const [statusMsg,    setStatusMsg]    = useState<string>('Ready.');

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const ping = () =>
      checkHealth()
        .then(() => alive && setApiOnline(true))
        .catch(() => alive && setApiOnline(false));
    ping();
    const t = setInterval(ping, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const handleFieldChange = (field: 'bandwidth' | 'delay' | 'queueSize' | 'duration', value: string | number) => {
    if (field === 'bandwidth') setBandwidth(value as string);
    if (field === 'delay')     setDelay(value as string);
    if (field === 'queueSize') setQueueSize(value as number);
    if (field === 'duration')  setDuration(value as number);
  };

  const runSim = async () => {
    setSimState('running');
    setCwndData([]);
    setMetrics(null);
    setCompareData(null);

    if (compareMode) {
      setStatusMsg(`Comparing ${variant} vs ${variant2} for ${duration}s …`);
      try {
        const res = await compare({ variants: [variant, variant2], bandwidth, delay, queueSize, duration });
        const first = res.variants[0];
        setCwndData(first?.cwnd ?? []);
        setMetrics(first?.metrics ?? null);
        setCompareData(res.variants);
        setSimState('done');
        setStatusMsg(`Compare done · ${res.variants.length} variants · ${first?.cwnd?.length ?? 0} samples`);
      } catch (err) {
        setSimState('error');
        setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      setStatusMsg(`Running ${variant} for ${duration}s …`);
      try {
        const res = await simulate({ variant, bandwidth, delay, queueSize, duration, label: variant });
        setCwndData(res.cwnd ?? []);
        setMetrics(res.metrics ?? null);
        setSimState('done');
        setStatusMsg(`Done · ${res.cwnd?.length ?? 0} cwnd samples · throughput ${res.metrics?.throughputMbps?.toFixed?.(3) ?? '–'} Mbps`);
      } catch (err) {
        setSimState('error');
        setStatusMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  return (
    <div className="min-h-full">
      <Ticker
        apiOnline={apiOnline}
        variant={variant}
        scenario={scenario.title}
        simState={simState}
      />
      <Header />

      <ScenarioPicker
        selectedId={scenarioId}
        onSelect={setScenarioId}
        disabled={simState === 'running'}
      />

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-10">
        <ConfigPanel
          scenario={scenario}
          variant={variant}
          bandwidth={bandwidth}
          delay={delay}
          queueSize={queueSize}
          duration={duration}
          onVariantChange={setVariant}
          onFieldChange={handleFieldChange}
          onRun={runSim}
          loading={simState === 'running'}
          status={{ kind: simState, message: statusMsg }}
          compareMode={compareMode}
          variant2={variant2}
          onCompareToggle={() => setCompareMode(m => !m)}
          onVariant2Change={setVariant2}
        />

        <Topology
          bandwidth={bandwidth}
          delay={delay}
          queueSize={queueSize}
          cwndData={cwndData}
          simState={simState}
          scenarioId={scenarioId}
        />

        <CwndChart
          data={cwndData}
          variantLabel={variant}
          simState={simState}
          compareData={compareData}
        />

        <MetricsPanel
          metrics={metrics}
          duration={duration}
          compareData={compareData}
        />
      </main>

      <footer className="border-t border-edge mt-8">
        <div className="max-w-[1400px] mx-auto px-6 py-5 flex items-center justify-between font-mono text-[10px] tracking-widest2 text-fg-muted">
          <span>FAST-NUCES · KARACHI · CC SIMULATOR</span>
          <span>NS-3.30 · FLASK · REACT · TAILWIND · RECHARTS</span>
          <span>BUILD dev/252db2d</span>
        </div>
      </footer>
    </div>
  );
}
