import { useEffect, useRef, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import type { CwndPoint, CompareResultEntry } from '../lib/types';
import { COMPARE_PALETTE } from '../lib/constants';

interface CwndChartProps {
  data: CwndPoint[];
  variantLabel: string;
  simState: 'idle' | 'running' | 'done' | 'error';
  compareData?: CompareResultEntry[] | null;
}

export function CwndChart({ data, variantLabel, simState, compareData }: CwndChartProps) {
  const isCompare = compareData && compareData.length > 0;
  const hasData = isCompare ? compareData[0].cwnd.length > 0 : data.length > 0;

  // Progressive playback state (Layer 3)
  const [displayCount, setDisplayCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevStateRef = useRef<string>('idle');

  useEffect(() => {
    if (simState === 'done' && prevStateRef.current === 'running') {
      const total = isCompare ? (compareData[0]?.cwnd.length ?? 0) : data.length;
      if (total === 0) return;
      setDisplayCount(0);
      // Reveal all points over ~2.5 seconds
      const stepSize = Math.max(1, Math.ceil(total / 75));
      const intervalMs = Math.max(16, Math.floor(2500 / (total / stepSize)));
      intervalRef.current = setInterval(() => {
        setDisplayCount(n => {
          const next = n + stepSize;
          if (next >= total) {
            clearInterval(intervalRef.current!);
            return total;
          }
          return next;
        });
      }, intervalMs);
    }
    if (simState === 'idle' || simState === 'running') {
      setDisplayCount(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    prevStateRef.current = simState;
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [simState]);

  // Sliced data for progressive reveal
  const slicedSingle = data.slice(0, displayCount || data.length);
  const maxCwnd = hasData
    ? isCompare
      ? Math.max(...compareData!.flatMap(e => e.cwnd.map(p => p.cwnd)))
      : Math.max(...data.map(p => p.cwnd))
    : 0;
  const maxTime = hasData
    ? isCompare
      ? Math.max(...compareData!.flatMap(e => e.cwnd.map(p => p.time)))
      : Math.max(...data.map(p => p.time))
    : 0;
  const totalSamples = isCompare ? (compareData![0]?.cwnd.length ?? 0) : data.length;

  // For compare mode, merge cwnd arrays onto a common time axis
  const mergedCompareData = isCompare ? buildMergedData(compareData!) : null;
  const slicedCompare = mergedCompareData
    ? mergedCompareData.slice(0, displayCount || mergedCompareData.length)
    : null;

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="index-marker">% 04</span>
        <h2 className="font-display text-[22px] text-fg leading-none">
          congestion <span className="italic text-accent">window</span>
        </h2>
        <div className="flex-1 hairline-x ml-4" />
        <span className="label-mono">
          {hasData ? `${totalSamples} samples` : 'awaiting trace'}
        </span>
      </div>

      <div className="panel p-5">
        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex items-center gap-6 mb-4 font-mono text-[10px] tracking-widest2 flex-wrap">
              {isCompare ? (
                compareData!.map(e => (
                  <Stat
                    key={e.variant}
                    label={e.label.toUpperCase()}
                    value={`peak ${Math.max(...e.cwnd.map(p => p.cwnd)).toLocaleString()} B`}
                    color={COMPARE_PALETTE[e.variant]}
                  />
                ))
              ) : (
                <>
                  <Stat label="VARIANT" value={variantLabel.toUpperCase()} accent />
                  <Stat label="PEAK"    value={`${maxCwnd.toLocaleString()} B`} />
                  <Stat label="DURATION" value={`${maxTime.toFixed(1)} s`} />
                  <Stat label="SAMPLES"  value={totalSamples.toString()} />
                </>
              )}
              {/* playback progress indicator */}
              {simState === 'done' && displayCount < totalSamples && (
                <span className="text-warn ml-auto">▶ {Math.round((displayCount / totalSamples) * 100)}%</span>
              )}
            </div>

            <ResponsiveContainer width="100%" height={340}>
              {isCompare ? (
                <LineChart data={slicedCompare ?? []} margin={{ top: 10, right: 16, left: 16, bottom: 16 }}>
                  <CartesianGrid stroke="#1e242e" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={[0, 'dataMax']}
                    tickFormatter={(v: number) => v.toFixed(1)}
                    stroke="#2a3240" tickLine={false}
                    label={{ value: 'time (s)', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#2a3240" tickLine={false} width={64}
                    label={{ value: 'cwnd (bytes)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10, dy: 40 }}
                  />
                  <ReferenceLine x={1.1} stroke="#9a4a1f" strokeDasharray="3 3"
                    label={{ value: 'trace start', fill: '#9a4a1f', fontSize: 9, position: 'top' }} />
                  <Tooltip
                    contentStyle={{ background: '#0a0d12', border: '1px solid #2a3240', fontFamily: 'JetBrains Mono', fontSize: 11, borderRadius: 0 }}
                    labelStyle={{ color: '#9ca3af' }}
                    formatter={(v: unknown, name: string) => [`${Number(v).toLocaleString()} B`, name]}
                    labelFormatter={(v: unknown) => `t = ${Number(v).toFixed(2)} s`}
                  />
                  <Legend
                    wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 10, paddingTop: 8 }}
                  />
                  {compareData!.map(e => (
                    <Line
                      key={e.variant}
                      type="monotone"
                      dataKey={e.variant}
                      stroke={COMPARE_PALETTE[e.variant]}
                      strokeWidth={1.6}
                      dot={false}
                      isAnimationActive={false}
                      name={e.label}
                    />
                  ))}
                </LineChart>
              ) : (
                <LineChart data={slicedSingle} margin={{ top: 10, right: 16, left: 16, bottom: 16 }}>
                  <CartesianGrid stroke="#1e242e" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={[0, 'dataMax']}
                    tickFormatter={(v: number) => v.toFixed(1)}
                    stroke="#2a3240" tickLine={false}
                    label={{ value: 'time (s)', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#2a3240" tickLine={false} width={64}
                    label={{ value: 'cwnd (bytes)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10, dy: 40 }}
                  />
                  <ReferenceLine x={1.1} stroke="#9a4a1f" strokeDasharray="3 3"
                    label={{ value: 'trace start', fill: '#9a4a1f', fontSize: 9, position: 'top' }} />
                  <Tooltip
                    contentStyle={{ background: '#0a0d12', border: '1px solid #2a3240', fontFamily: 'JetBrains Mono', fontSize: 11, borderRadius: 0 }}
                    labelStyle={{ color: '#9ca3af' }}
                    itemStyle={{ color: '#38bdf8' }}
                    formatter={(v: unknown) => [`${Number(v).toLocaleString()} B`, 'cwnd']}
                    labelFormatter={(v: unknown) => `t = ${Number(v).toFixed(2)} s`}
                  />
                  <Line
                    type="monotone"
                    dataKey="cwnd"
                    stroke="#38bdf8"
                    strokeWidth={1.6}
                    dot={false}
                    isAnimationActive={false}
                    name={variantLabel}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </>
        )}
      </div>
    </section>
  );
}

// Merge compare entries onto a unified time-keyed array
function buildMergedData(entries: CompareResultEntry[]): Record<string, number>[] {
  // Collect all unique time values
  const timeSet = new Set<number>();
  entries.forEach(e => e.cwnd.forEach(p => timeSet.add(p.time)));
  const times = Array.from(timeSet).sort((a, b) => a - b);

  return times.map(t => {
    const row: Record<string, number> = { time: t };
    entries.forEach(e => {
      const pt = e.cwnd.find(p => p.time === t);
      if (pt) row[e.variant] = pt.cwnd;
    });
    return row;
  });
}

function Stat({ label, value, accent, color }: { label: string; value: string; accent?: boolean; color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-fg-muted">{label}</span>
      <span
        className={accent ? 'text-accent text-[13px]' : 'text-fg text-[13px]'}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-[340px] flex flex-col items-center justify-center gap-3 border border-dashed border-edge">
      <div className="font-display text-[20px] text-fg-dim italic">no trace yet</div>
      <div className="font-mono text-[10px] tracking-widest2 text-fg-muted">
        run a simulation to populate the cwnd timeline
      </div>
    </div>
  );
}
