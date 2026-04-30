import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { CwndPoint } from '../lib/types';

interface CwndChartProps {
  data: CwndPoint[];
  variantLabel: string;
}

export function CwndChart({ data, variantLabel }: CwndChartProps) {
  const hasData = data.length > 0;

  // domain
  const maxCwnd = hasData ? Math.max(...data.map(p => p.cwnd)) : 0;
  const maxTime = hasData ? Math.max(...data.map(p => p.time)) : 0;

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="index-marker">% 04</span>
        <h2 className="font-display text-[22px] text-fg leading-none">
          congestion <span className="italic text-accent">window</span>
        </h2>
        <div className="flex-1 hairline-x ml-4" />
        <span className="label-mono">
          {hasData ? `${data.length} samples` : 'awaiting trace'}
        </span>
      </div>

      <div className="panel p-5">
        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex items-center gap-6 mb-4 font-mono text-[10px] tracking-widest2">
              <Stat label="VARIANT" value={variantLabel.toUpperCase()} accent />
              <Stat label="PEAK" value={`${maxCwnd.toLocaleString()} B`} />
              <Stat label="DURATION" value={`${maxTime.toFixed(1)} s`} />
              <Stat label="SAMPLES" value={data.length.toString()} />
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={data} margin={{ top: 10, right: 16, left: 16, bottom: 16 }}>
                <CartesianGrid stroke="#1e242e" strokeDasharray="2 4" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={[0, 'dataMax']}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  stroke="#2a3240"
                  tickLine={false}
                  label={{ value: 'time (s)', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 10 }}
                />
                <YAxis
                  stroke="#2a3240"
                  tickLine={false}
                  width={64}
                  label={{ value: 'cwnd (bytes)', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 10, dy: 40 }}
                />
                <ReferenceLine x={1.1} stroke="#9a4a1f" strokeDasharray="3 3" label={{ value: 'trace start', fill: '#9a4a1f', fontSize: 9, position: 'top' }} />
                <Tooltip
                  contentStyle={{
                    background: '#0a0d12',
                    border: '1px solid #2a3240',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 11,
                    borderRadius: 0,
                  }}
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
                  isAnimationActive={true}
                  animationDuration={900}
                  name={variantLabel}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-fg-muted">{label}</span>
      <span className={accent ? 'text-accent text-[13px]' : 'text-fg text-[13px]'}>{value}</span>
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