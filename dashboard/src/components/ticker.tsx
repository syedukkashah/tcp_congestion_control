import { useEffect, useState } from 'react';

interface TickerProps {
  apiOnline: boolean | null;
  variant: string;
  scenario: string;
  simState: 'idle' | 'running' | 'done' | 'error';
}

function timestampPKT(d: Date) {
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export function Ticker({ apiOnline, variant, scenario, simState }: TickerProps) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const apiText =
    apiOnline === null ? 'API · CHECKING'
    : apiOnline       ? 'API · ONLINE  192.168.100.165:5000'
                      : 'API · OFFLINE 192.168.100.165:5000';
  const apiCls = apiOnline ? 'text-ok' : apiOnline === false ? 'text-err' : 'text-warn';

  const stateText = {
    idle:    'IDLE',
    running: 'SIMULATING',
    done:    'COMPLETE',
    error:   'ERROR',
  }[simState];
  const stateCls = {
    idle:    'text-fg-dim',
    running: 'text-warn',
    done:    'text-ok',
    error:   'text-err',
  }[simState];

  // marquee items — duplicated so the loop is seamless
  const items = [
    `NS-3.30 · 4-NODE DUMBBELL · DROPTAIL`,
    `BOTTLENECK 1Mbps/10ms NOMINAL`,
    `7 VARIANTS REGISTERED`,
    `TAHOE · RENO · NEWRENO · WESTWOOD · BIC · VEGAS · HYBLA`,
    `FLASK BRIDGE :5000`,
    `CWND TRACE @ t=1.1s`,
  ];

  return (
    <div className="border-b border-edge bg-surface/95 backdrop-blur-sm">
      <div className="flex items-center text-[10px] tracking-widest2 uppercase">
        {/* left fixed: live + variant + scenario */}
        <div className="flex items-center gap-3 px-3 py-2 border-r border-edge whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
            <span className="text-accent">LIVE</span>
          </span>
          <span className="text-fg-muted">/</span>
          <span className="text-fg-dim">VARIANT</span>
          <span className="text-fg">{variant.toUpperCase()}</span>
          <span className="text-fg-muted">/</span>
          <span className="text-fg-dim">SCENARIO</span>
          <span className="text-fg">{scenario.toUpperCase()}</span>
          <span className="text-fg-muted">/</span>
          <span className={stateCls}>{stateText}</span>
        </div>

        {/* center marquee */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex animate-ticker whitespace-nowrap">
            {[...items, ...items].map((t, i) => (
              <span key={i} className="px-6 text-fg-muted">{t}</span>
            ))}
          </div>
          {/* edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-surface to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-surface to-transparent" />
        </div>

        {/* right fixed: api + clock */}
        <div className="flex items-center gap-3 px-3 py-2 border-l border-edge whitespace-nowrap">
          <span className={apiCls}>{apiText}</span>
          <span className="text-fg-muted">/</span>
          <span className="text-fg">{timestampPKT(now)}</span>
          <span className="text-fg-muted text-[9px]">PKT · KHI</span>
        </div>
      </div>
    </div>
  );
}