interface TopologyProps {
  bandwidth: string;
  delay: string;
  queueSize: number;
}

export function Topology({ bandwidth, delay, queueSize }: TopologyProps) {
  // sizing
  const W = 900, H = 280;
  const NODES = [
    { id: 'n0', x:  90, y: 140, kind: 'host'   },
    { id: 'r1', x: 320, y: 140, kind: 'router' },
    { id: 'r2', x: 580, y: 140, kind: 'router' },
    { id: 'n3', x: 810, y: 140, kind: 'host'   },
  ];

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
          {/* defs */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e242e" strokeWidth="0.5" />
            </pattern>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
            </marker>
          </defs>

          {/* grid background */}
          <rect width={W} height={H} fill="url(#grid)" opacity="0.7" />

          {/* corner crosshairs */}
          {[[10,10],[W-10,10],[10,H-10],[W-10,H-10]].map(([x,y],i) => (
            <g key={i} stroke="#2a3240" strokeWidth="1">
              <line x1={x as number-6} y1={y as number} x2={x as number+6} y2={y as number} />
              <line x1={x as number} y1={y as number-6} x2={x as number} y2={y as number+6} />
            </g>
          ))}

          {/* access link 1: n0 -> r1 */}
          <g>
            <line x1={NODES[0].x+30} y1={NODES[0].y} x2={NODES[1].x-30} y2={NODES[1].y}
                  stroke="#2a3240" strokeWidth="2" />
            <text x={(NODES[0].x+NODES[1].x)/2} y={NODES[0].y-20} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="10" fill="#9ca3af" letterSpacing="1.5">
              ACCESS · 10Mbps · 2ms
            </text>
            <text x={(NODES[0].x+NODES[1].x)/2} y={NODES[0].y+22} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="9" fill="#6b7280" letterSpacing="1">
              ───────►
            </text>
          </g>

          {/* bottleneck link: r1 -> r2 */}
          <g>
            <line x1={NODES[1].x+30} y1={NODES[1].y} x2={NODES[2].x-30} y2={NODES[2].y}
                  stroke="#f97316" strokeWidth="2.5" />
            <line x1={NODES[1].x+30} y1={NODES[1].y-3} x2={NODES[2].x-30} y2={NODES[2].y-3}
                  stroke="#f97316" strokeWidth="0.5" opacity="0.4" />
            <line x1={NODES[1].x+30} y1={NODES[1].y+3} x2={NODES[2].x-30} y2={NODES[2].y+3}
                  stroke="#f97316" strokeWidth="0.5" opacity="0.4" />

            <text x={(NODES[1].x+NODES[2].x)/2} y={NODES[1].y-26} textAnchor="middle"
                  fontFamily="Instrument Serif" fontSize="14" fill="#f97316" fontStyle="italic">
              bottleneck
            </text>
            <text x={(NODES[1].x+NODES[2].x)/2} y={NODES[1].y-10} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="10" fill="#fb923c" letterSpacing="1.5">
              {bandwidth.toUpperCase()} · {delay.toUpperCase()}
            </text>
            <text x={(NODES[1].x+NODES[2].x)/2} y={NODES[1].y+24} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="9" fill="#9a4a1f" letterSpacing="1">
              DROPTAIL · q={queueSize}
            </text>
          </g>

          {/* access link 2: r2 -> n3 */}
          <g>
            <line x1={NODES[2].x+30} y1={NODES[2].y} x2={NODES[3].x-30} y2={NODES[3].y}
                  stroke="#2a3240" strokeWidth="2" />
            <text x={(NODES[2].x+NODES[3].x)/2} y={NODES[2].y-20} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="10" fill="#9ca3af" letterSpacing="1.5">
              ACCESS · 10Mbps · 2ms
            </text>
            <text x={(NODES[2].x+NODES[3].x)/2} y={NODES[2].y+22} textAnchor="middle"
                  fontFamily="JetBrains Mono" fontSize="9" fill="#6b7280" letterSpacing="1">
              ───────►
            </text>
          </g>

          {/* nodes */}
          {NODES.map(n => (
            <g key={n.id}>
              {/* outer ring */}
              <circle cx={n.x} cy={n.y} r="30" fill="none" stroke="#2a3240" strokeWidth="1" />
              <circle cx={n.x} cy={n.y} r="34" fill="none" stroke="#1e242e" strokeWidth="1" strokeDasharray="2 4" />
              {/* core */}
              <circle cx={n.x} cy={n.y} r="22" fill="#11151c" stroke="#e8e3d8" strokeWidth="1.2" />
              {/* router has inner square, host has dot */}
              {n.kind === 'router' ? (
                <rect x={n.x-8} y={n.y-8} width="16" height="16" fill="none" stroke="#f97316" strokeWidth="1" />
              ) : (
                <circle cx={n.x} cy={n.y} r="3" fill="#38bdf8" />
              )}
              {/* label below */}
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

          {/* annotation lines from nodes */}
          <g fontFamily="JetBrains Mono" fontSize="9" fill="#6b7280" letterSpacing="1">
            <text x="90" y="40">% bulk-send-app</text>
            <line x1="90" y1="46" x2="90" y2="105" stroke="#2a3240" strokeWidth="0.5" />

            <text x="810" y="40" textAnchor="end">% packet-sink</text>
            <line x1="810" y1="46" x2="810" y2="105" stroke="#2a3240" strokeWidth="0.5" />

            <text x="320" y="240">% queue · drop</text>
            <line x1="320" y1="175" x2="320" y2="232" stroke="#2a3240" strokeWidth="0.5" />
          </g>
        </svg>
      </div>
    </section>
  );
}