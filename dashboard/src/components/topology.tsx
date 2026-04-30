import { useEffect, useRef, useState } from 'react';
import type { CwndPoint } from '../lib/types';

interface TopologyProps {
  bandwidth: string;
  delay: string;
  queueSize: number;
  cwndData: CwndPoint[];
  simState: 'idle' | 'running' | 'done' | 'error';
  scenarioId: string;
}

// SVG path segment boundaries (x coords)
const SEG0 = { start: 120, end: 290 }; // n0 → r1 (access)
const SEG1 = { start: 350, end: 550 }; // r1 → r2 (bottleneck)
const SEG2 = { start: 610, end: 780 }; // r2 → n3 (access)
const PATH_Y = 140;

const ACCESS_SPEED = 260; // px/s on access links
const REPLAY_MS    = 9000; // cwnd replay wall-clock duration (ms)
const FRAME_MS     = 33;   // ~30fps

interface Packet {
  id: number;
  x: number;
  seg: 0 | 1 | 2;
}

let uid = 0;

function parseMbps(bw: string): number {
  const m = bw.match(/^(\d+(?:\.\d+)?)(kbps|mbps)/i);
  if (!m) return 1;
  const val = parseFloat(m[1]);
  return m[2].toLowerCase() === 'kbps' ? val / 1000 : val;
}

function interpolateCwnd(data: CwndPoint[], t: number): number {
  if (!data.length) return 0;
  if (t <= data[0].time) return data[0].cwnd;
  const last = data[data.length - 1];
  if (t >= last.time) return last.cwnd;
  for (let i = 0; i < data.length - 1; i++) {
    if (t >= data[i].time && t < data[i + 1].time) {
      const frac = (t - data[i].time) / (data[i + 1].time - data[i].time);
      return data[i].cwnd + frac * (data[i + 1].cwnd - data[i].cwnd);
    }
  }
  return last.cwnd;
}

export function Topology({ bandwidth, delay, queueSize, cwndData, simState, scenarioId }: TopologyProps) {
  const W = 900, H = 280;
  const NODES = [
    { id: 'n0', x:  90, y: PATH_Y, kind: 'host'   },
    { id: 'r1', x: 320, y: PATH_Y, kind: 'router' },
    { id: 'r2', x: 580, y: PATH_Y, kind: 'router' },
    { id: 'n3', x: 810, y: PATH_Y, kind: 'host'   },
  ];

  const [packets, setPackets] = useState<Packet[]>([]);
  const packetsRef  = useRef<Packet[]>([]);
  const startRef    = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    packetsRef.current = [];
    setPackets([]);

    if (simState !== 'done' || cwndData.length === 0) return;

    const mbps       = parseMbps(bandwidth);
    const bnSpeed    = Math.max(25, Math.min(110, 80 * mbps)); // bottleneck px/s
    const simDur     = cwndData[cwndData.length - 1].time;
    const maxCwnd    = Math.max(...cwndData.map(p => p.cwnd));
    const dt         = FRAME_MS / 1000;
    startRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed  = Date.now() - startRef.current;
      const simFrac  = (elapsed % REPLAY_MS) / REPLAY_MS;
      const simT     = simFrac * simDur;
      const cwndNow  = interpolateCwnd(cwndData, simT);
      const target   = Math.max(2, Math.min(9, Math.round(2 + (cwndNow / maxCwnd) * 7)));

      const alive: Packet[] = packetsRef.current
        .map(p => {
          const speed = p.seg === 1 ? bnSpeed : ACCESS_SPEED;
          let { x, seg } = { x: p.x + speed * dt, seg: p.seg };
          if (seg === 0 && x >= SEG0.end) { seg = 1; x = SEG1.start; }
          if (seg === 1 && x >= SEG1.end) { seg = 2; x = SEG2.start; }
          return { ...p, x, seg } as Packet;
        })
        .filter(p => !(p.seg === 2 && p.x >= SEG2.end));

      while (alive.length < target) {
        // stagger spawn positions so packets don't all start at x=120
        const jitter = Math.random() * (SEG0.end - SEG0.start);
        alive.push({ id: uid++, x: SEG0.start + jitter, seg: 0 });
      }

      packetsRef.current = alive;
      setPackets([...alive]);
    }, FRAME_MS);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [simState, cwndData, bandwidth]);

  // Scenario-specific Layer 2 annotations
  const isBufferbloat = scenarioId === 'bufferbloat';
  const isCollapse    = scenarioId === 'congestion-collapse';
  const isHighBdp     = scenarioId === 'high-bdp';

  // Queue fill proxy: packets currently on bottleneck segment
  const bnPackets = packets.filter(p => p.seg === 1).length;
  const queueFill = Math.min(1, bnPackets / Math.max(3, 9 * (1 / Math.max(parseMbps(bandwidth), 0.1)) * 0.3));

  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4">
        <span className="index-marker">% 03</span>
        <h2 className="font-display text-[22px] text-fg leading-none">
          topology · <span className="italic text-accent">dumbbell</span>
        </h2>
        <div className="flex-1 hairline-x ml-4" />
        <span className="label-mono">droptail · q={queueSize}</span>
      </div>

      <div className="panel p-5">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e242e" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" opacity="0.7" />

          {/* corner crosshairs */}
          {[[10,10],[W-10,10],[10,H-10],[W-10,H-10]].map(([x,y],i) => (
            <g key={i} stroke="#2a3240" strokeWidth="1">
              <line x1={(x as number)-6} y1={y as number} x2={(x as number)+6} y2={y as number} />
              <line x1={x as number} y1={(y as number)-6} x2={x as number} y2={(y as number)+6} />
            </g>
          ))}

          {/* access link n0 → r1 */}
          <g>
            <line x1={NODES[0].x+30} y1={PATH_Y} x2={NODES[1].x-30} y2={PATH_Y}
                  stroke="#2a3240" strokeWidth="2" />
            <text x={(NODES[0].x+NODES[1].x)/2} y={PATH_Y-20} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="10" fill="#9ca3af" letterSpacing="1.5">
              ACCESS · 10Mbps · 2ms
            </text>
            <text x={(NODES[0].x+NODES[1].x)/2} y={PATH_Y+22} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="9" fill="#6b7280" letterSpacing="1">
              ───────►
            </text>
          </g>

          {/* bottleneck link r1 → r2 */}
          <g>
            <line x1={NODES[1].x+30} y1={PATH_Y} x2={NODES[2].x-30} y2={PATH_Y}
                  stroke="#f97316" strokeWidth="2.5" />
            <line x1={NODES[1].x+30} y1={PATH_Y-3} x2={NODES[2].x-30} y2={PATH_Y-3}
                  stroke="#f97316" strokeWidth="0.5" opacity="0.4" />
            <line x1={NODES[1].x+30} y1={PATH_Y+3} x2={NODES[2].x-30} y2={PATH_Y+3}
                  stroke="#f97316" strokeWidth="0.5" opacity="0.4" />
            <text x={(NODES[1].x+NODES[2].x)/2} y={PATH_Y-26} textAnchor="middle"
                  fontFamily="Instrument Serif" fontSize="14" fill="#f97316" fontStyle="italic">
              bottleneck
            </text>
            <text x={(NODES[1].x+NODES[2].x)/2} y={PATH_Y-10} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="10" fill="#fb923c" letterSpacing="1.5">
              {bandwidth.toUpperCase()} · {delay.toUpperCase()}
            </text>
            <text x={(NODES[1].x+NODES[2].x)/2} y={PATH_Y+24} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="9" fill="#9a4a1f" letterSpacing="1">
              DROPTAIL · q={queueSize}
            </text>
          </g>

          {/* access link r2 → n3 */}
          <g>
            <line x1={NODES[2].x+30} y1={PATH_Y} x2={NODES[3].x-30} y2={PATH_Y}
                  stroke="#2a3240" strokeWidth="2" />
            <text x={(NODES[2].x+NODES[3].x)/2} y={PATH_Y-20} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="10" fill="#9ca3af" letterSpacing="1.5">
              ACCESS · 10Mbps · 2ms
            </text>
            <text x={(NODES[2].x+NODES[3].x)/2} y={PATH_Y+22} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="9" fill="#6b7280" letterSpacing="1">
              ───────►
            </text>
          </g>

          {/* nodes */}
          {NODES.map(n => (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r="30" fill="none" stroke="#2a3240" strokeWidth="1" />
              <circle cx={n.x} cy={n.y} r="34" fill="none" stroke="#1e242e" strokeWidth="1" strokeDasharray="2 4" />
              <circle cx={n.x} cy={n.y} r="22" fill="#11151c" stroke="#e8e3d8" strokeWidth="1.2" />
              {n.kind === 'router' ? (
                <rect x={n.x-8} y={n.y-8} width="16" height="16" fill="none" stroke="#f97316" strokeWidth="1" />
              ) : (
                <circle cx={n.x} cy={n.y} r="3" fill="#38bdf8" />
              )}
              <text x={n.x} y={n.y+50} textAnchor="middle"
                    fontFamily="Instrument Serif" fontSize="16" fill="#e8e3d8">
                {n.id}
              </text>
              <text x={n.x} y={n.y+64} textAnchor="middle"
                    fontFamily="JetBrains Mono" fontSize="9" fill="#6b7280" letterSpacing="1.5">
                {n.kind === 'host' ? (n.id === 'n0' ? 'SOURCE' : 'SINK') : 'ROUTER'}
              </text>
            </g>
          ))}

          {/* annotation lines */}
          <g fontFamily="JetBrains Mono" fontSize="9" fill="#6b7280" letterSpacing="1">
            <text x="90" y="40">% bulk-send-app</text>
            <line x1="90" y1="46" x2="90" y2="105" stroke="#2a3240" strokeWidth="0.5" />
            <text x="810" y="40" textAnchor="end">% packet-sink</text>
            <line x1="810" y1="46" x2="810" y2="105" stroke="#2a3240" strokeWidth="0.5" />
            <text x="320" y="240">% queue · drop</text>
            <line x1="320" y1="175" x2="320" y2="232" stroke="#2a3240" strokeWidth="0.5" />
          </g>

          {/* ── Layer 1: animated packet dots ── */}
          {packets.map(p => {
            const onBottleneck = p.seg === 1;
            const color = onBottleneck ? '#f97316' : '#38bdf8';
            return (
              <circle
                key={p.id}
                cx={p.x}
                cy={PATH_Y}
                r={onBottleneck ? 4.5 : 3.5}
                fill={color}
                opacity={0.9}
                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
              />
            );
          })}

          {/* ── Layer 2: scenario annotations ── */}

          {/* Bufferbloat: queue fill gauge at r1 */}
          {isBufferbloat && simState === 'done' && (
            <g>
              <rect x={295} y={PATH_Y+35} width={50} height={7}
                    fill="#11151c" stroke="#2a3240" strokeWidth={0.5} />
              <rect x={295} y={PATH_Y+35} width={50 * queueFill} height={7}
                    fill="#f97316" opacity={0.8} />
              <text x={320} y={PATH_Y+54} textAnchor="middle"
                    fontFamily="JetBrains Mono" fontSize={8} fill="#fb923c" letterSpacing={1}>
                QUEUE {Math.round(queueFill * 100)}%
              </text>
            </g>
          )}

          {/* Congestion collapse: loss pulse ring at r1 when bottleneck is busy */}
          {isCollapse && simState === 'done' && bnPackets >= 3 && (
            <g>
              <circle cx={320} cy={PATH_Y} r={38} fill="none" stroke="#ef4444"
                      strokeWidth={0.8} opacity={0.5} strokeDasharray="3 3" />
              <text x={320} y={PATH_Y+80} textAnchor="middle"
                    fontFamily="JetBrains Mono" fontSize={8} fill="#ef4444" letterSpacing={1.5}>
                LOSS EVENTS
              </text>
            </g>
          )}

          {/* High BDP: propagation delay annotation */}
          {isHighBdp && simState === 'done' && (
            <g>
              <text x={(NODES[1].x+NODES[2].x)/2} y={PATH_Y+46} textAnchor="middle"
                    fontFamily="JetBrains Mono" fontSize={8} fill="#4ade80" letterSpacing={1}>
                HIGH BDP · {delay.toUpperCase()} RTT
              </text>
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}
