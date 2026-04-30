import type { Metrics } from '../lib/types';

interface MetricsPanelProps {
  metrics: Metrics | null;
  duration: number;
}

export function MetricsPanel({ metrics, duration }: MetricsPanelProps) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="index-marker">% 05</span>
        <h2 className="font-display text-[22px] text-fg leading-none">
          flow <span className="italic text-accent">metrics</span>
        </h2>
        <div className="flex-1 hairline-x ml-4" />
        <span className="label-mono">{metrics ? 'measured' : 'pending'}</span>
      </div>

      {metrics ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricTile
            label="Throughput"
            value={metrics.throughputMbps.toFixed(3)}
            unit="Mbps"
            tone="accent"
          />
          <MetricTile
            label="Avg Delay"
            value={metrics.avgDelayMs.toFixed(2)}
            unit="ms"
            tone="data"
          />
          <MetricTile
            label="Loss Rate"
            value={metrics.lossRate.toFixed(2)}
            unit="%"
            tone={metrics.lossRate > 5 ? 'err' : metrics.lossRate > 1 ? 'warn' : 'ok'}
          />
          <MetricTile
            label="TX Packets"
            value={metrics.txPackets.toLocaleString()}
            unit="pkts"
          />
          <MetricTile
            label="RX Packets"
            value={metrics.rxPackets.toLocaleString()}
            unit="pkts"
            sub={`${((metrics.rxPackets / Math.max(metrics.txPackets,1)) * 100).toFixed(1)}% delivery`}
          />
        </div>
      ) : (
        <div className="panel p-8 flex flex-col items-center justify-center gap-3">
          <div className="font-display text-[20px] text-fg-dim italic">no measurements yet</div>
          <div className="font-mono text-[10px] tracking-widest2 text-fg-muted">
            results will appear here after the {duration}s simulation completes
          </div>
        </div>
      )}
    </section>
  );
}

function MetricTile({
  label, value, unit, tone, sub,
}: {
  label: string; value: string; unit: string;
  tone?: 'accent' | 'data' | 'ok' | 'warn' | 'err';
  sub?: string;
}) {
  const valueColor = ({
  accent: 'text-accent',
  data:   'text-data',
  ok:     'text-ok',
  warn:   'text-warn',
  err:    'text-err',
} as Record<string, string>)[tone ?? 'accent'] ?? 'text-fg';

  return (
    <div className="panel p-4 relative">
      {/* corner ticks */}
      <span className="absolute top-0 left-0 w-2 h-px bg-edge-bright" />
      <span className="absolute top-0 left-0 w-px h-2 bg-edge-bright" />
      <span className="absolute bottom-0 right-0 w-2 h-px bg-edge-bright" />
      <span className="absolute bottom-0 right-0 w-px h-2 bg-edge-bright" />

      <div className="label-mono mb-3">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-display text-[36px] leading-none ${tone ? valueColor : 'text-fg'}`}>
          {value}
        </span>
        <span className="font-mono text-[10px] text-fg-muted tracking-widest2 uppercase">
          {unit}
        </span>
      </div>
      {sub && (
        <div className="font-mono text-[9.5px] text-fg-dim mt-2 tracking-wide">
          {sub}
        </div>
      )}
    </div>
  );
}