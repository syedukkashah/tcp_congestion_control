import type { Variant, Scenario } from '../lib/types';
import { VARIANTS } from '../lib/constants';

interface ConfigPanelProps {
  scenario: Scenario;
  variant: Variant;
  bandwidth: string;
  delay: string;
  queueSize: number;
  duration: number;
  onVariantChange: (v: Variant) => void;
  onFieldChange: (field: 'bandwidth' | 'delay' | 'queueSize' | 'duration', value: string | number) => void;
  onRun: () => void;
  loading: boolean;
  status: { kind: 'idle' | 'running' | 'done' | 'error'; message?: string };
}

export function ConfigPanel({
  scenario, variant, bandwidth, delay, queueSize, duration,
  onVariantChange, onFieldChange, onRun, loading, status,
}: ConfigPanelProps) {
  const locked = !scenario.isCustom;

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="index-marker">% 02</span>
        <h2 className="font-display text-[22px] text-fg leading-none">
          {locked ? 'parameters · ' : 'configure · '}
          <span className="italic text-accent">{scenario.title.toLowerCase()}</span>
        </h2>
        <div className="flex-1 hairline-x ml-4" />
        {locked && <span className="label-mono">locked</span>}
      </div>

      <div className="panel p-5">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Field label="Variant">
            <select
              value={variant}
              onChange={e => onVariantChange(e.target.value as Variant)}
              disabled={locked}
              className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {VARIANTS.map(v => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
            <Hint>{VARIANTS.find(v => v.id === variant)?.note}</Hint>
          </Field>

          <Field label="Bandwidth">
            <input
              value={bandwidth}
              onChange={e => onFieldChange('bandwidth', e.target.value)}
              disabled={locked}
              className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="1Mbps"
            />
            <Hint>bottleneck link</Hint>
          </Field>

          <Field label="Delay">
            <input
              value={delay}
              onChange={e => onFieldChange('delay', e.target.value)}
              disabled={locked}
              className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="10ms"
            />
            <Hint>one-way</Hint>
          </Field>

          <Field label="Queue Size">
            <input
              type="number"
              value={queueSize}
              onChange={e => onFieldChange('queueSize', Number(e.target.value))}
              disabled={locked}
              className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              min={1}
            />
            <Hint>droptail packets</Hint>
          </Field>

          <Field label="Duration">
            <input
              type="number"
              value={duration}
              onChange={e => onFieldChange('duration', Number(e.target.value))}
              disabled={locked}
              className="input-field disabled:opacity-50 disabled:cursor-not-allowed"
              min={1}
            />
            <Hint>seconds</Hint>
          </Field>
        </div>

        <div className="mt-5 pt-5 border-t border-edge flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className={
              status.kind === 'error'   ? 'text-err' :
              status.kind === 'done'    ? 'text-ok' :
              status.kind === 'running' ? 'text-warn' : 'text-fg-muted'
            }>
              {status.kind === 'error'   ? '✕ ' :
               status.kind === 'done'    ? '✓ ' :
               status.kind === 'running' ? '◌ ' : '· '}
              {status.message ?? 'Ready.'}
            </span>
          </div>
          <button onClick={onRun} disabled={loading} className="btn-primary">
            {loading ? '◌ simulating…' : '▶ run simulation'}
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="label-mono mb-2">{label}</div>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[9.5px] text-fg-muted mt-1.5 tracking-wide">{children}</div>;
}