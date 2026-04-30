import type { Metrics, CompareResultEntry } from '../lib/types';
import { COMPARE_PALETTE } from '../lib/constants';

interface MetricsPanelProps {
  metrics: Metrics | null;
  duration: number;
  compareData?: CompareResultEntry[] | null;
}

export function MetricsPanel({ metrics, duration, compareData }: MetricsPanelProps) {
  const isCompare = compareData && compareData.length > 0;

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="index-marker">% 05</span>
        <h2 className="font-display text-[22px] text-fg leading-none">
          flow <span className="italic text-accent">metrics</span>
        </h2>
        <div className="flex-1 hairline-x ml-4" />
        <span className="label-mono">{(isCompare || metrics) ? 'measured' : 'pending'}</span>
      </div>

      {isCompare ? (
        <CompareMetrics entries={compareData!} />
      ) : metrics ? (
        <SingleMetrics metrics={metrics} />
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

function SingleMetrics({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <MetricTile label="Throughput"  value={metrics.throughputMbps.toFixed(3)} unit="Mbps" tone="accent" />
      <MetricTile label="Avg Delay"   value={metrics.avgDelayMs.toFixed(2)}     unit="ms"   tone="data" />
      <MetricTile
        label="Loss Rate" value={metrics.lossRate.toFixed(2)} unit="%"
        tone={metrics.lossRate > 5 ? 'err' : metrics.lossRate > 1 ? 'warn' : 'ok'}
      />
      <MetricTile label="TX Packets"  value={metrics.txPackets.toLocaleString()} unit="pkts" />
      <MetricTile
        label="RX Packets" value={metrics.rxPackets.toLocaleString()} unit="pkts"
        sub={`${((metrics.rxPackets / Math.max(metrics.txPackets, 1)) * 100).toFixed(1)}% delivery`}
      />
    </div>
  );
}

function CompareMetrics({ entries }: { entries: CompareResultEntry[] }) {
  return (
    <div className="panel p-5">
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="border-b border-edge">
              <th className="text-left pb-3 pr-6 label-mono font-normal">METRIC</th>
              {entries.map(e => (
                <th key={e.variant} className="text-right pb-3 px-4">
                  <span style={{ color: COMPARE_PALETTE[e.variant] }}>{e.label.toUpperCase()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompareRow
              label="Throughput"
              unit="Mbps"
              entries={entries}
              getValue={m => m.throughputMbps.toFixed(3)}
              higher="better"
            />
            <CompareRow
              label="Avg Delay"
              unit="ms"
              entries={entries}
              getValue={m => m.avgDelayMs.toFixed(2)}
              higher="worse"
            />
            <CompareRow
              label="Loss Rate"
              unit="%"
              entries={entries}
              getValue={m => m.lossRate.toFixed(2)}
              higher="worse"
            />
            <CompareRow
              label="TX Packets"
              unit="pkts"
              entries={entries}
              getValue={m => m.txPackets.toLocaleString()}
            />
            <CompareRow
              label="RX Packets"
              unit="pkts"
              entries={entries}
              getValue={m => m.rxPackets.toLocaleString()}
              higher="better"
            />
            <CompareRow
              label="Delivery"
              unit="%"
              entries={entries}
              getValue={m => ((m.rxPackets / Math.max(m.txPackets, 1)) * 100).toFixed(1)}
              higher="better"
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareRow({
  label, unit, entries, getValue, higher,
}: {
  label: string;
  unit: string;
  entries: CompareResultEntry[];
  getValue: (m: Metrics) => string;
  higher?: 'better' | 'worse';
}) {
  const numericValues = entries.map(e => parseFloat(getValue(e.metrics)));
  const best = higher === 'better' ? Math.max(...numericValues) : higher === 'worse' ? Math.min(...numericValues) : null;

  return (
    <tr className="border-b border-edge/50">
      <td className="py-3 pr-6 text-fg-muted">{label}</td>
      {entries.map((e, i) => {
        const val = getValue(e.metrics);
        const num = numericValues[i];
        const isBest = best !== null && num === best;
        return (
          <td key={e.variant} className="text-right py-3 px-4">
            <span className={isBest ? 'text-ok' : 'text-fg'}>
              {val}
            </span>
            <span className="text-fg-muted ml-1">{unit}</span>
            {isBest && <span className="text-ok ml-1.5">↑</span>}
          </td>
        );
      })}
    </tr>
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
        <div className="font-mono text-[9.5px] text-fg-dim mt-2 tracking-wide">{sub}</div>
      )}
    </div>
  );
}
