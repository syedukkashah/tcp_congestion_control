// src/components/matlabgraphs.tsx
import type { MatlabImages } from "../lib/api";

interface Props {
  images: MatlabImages | null;
  loading: boolean;
  error: string | null;
}

const GRAPH_META: { key: keyof MatlabImages; label: string; desc: string }[] = [
  { key: "cwnd",       label: "CONGESTION WINDOW", desc: "cwnd over time" },
  { key: "throughput", label: "THROUGHPUT",         desc: "Mbps"          },
  { key: "delay",      label: "AVERAGE DELAY",      desc: "ms"            },
  { key: "loss",       label: "PACKET LOSS RATE",   desc: "%"             },
];

function downloadPng(b64: string, name: string) {
  const link = document.createElement("a");
  link.href = `data:image/png;base64,${b64}`;
  link.download = `${name}.png`;
  link.click();
}

export default function MatlabGraphs({ images, loading, error }: Props) {
  if (!loading && !images && !error) return null;

  return (
    <section>
      {/* Section header — exact same pattern as MetricsPanel */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="index-marker">% 06</span>
        <h2 className="font-display text-[22px] text-fg leading-none">
          matlab <span className="italic text-accent">analysis</span>
        </h2>
        <div className="flex-1 hairline-x ml-4" />
        <span className="label-mono">{images ? 'measured' : loading ? 'running' : 'error'}</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="panel p-8 flex flex-col items-center justify-center gap-3">
          <div className="font-display text-[20px] text-fg-dim italic animate-pulse">
            running matlab…
          </div>
          <div className="font-mono text-[10px] tracking-widest2 text-fg-muted">
            generating figures — this takes ~20s
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="panel p-5 border-err/30">
          <span className="label-mono text-err">matlab error</span>
          <p className="font-mono text-[11px] text-fg-muted mt-2">{error}</p>
        </div>
      )}

      {/* Graph grid */}
      {images && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {GRAPH_META.map(({ key, label, desc }) => {
            const b64 = images[key];
            if (!b64) return null;
            return (
              <div key={key} className="panel p-4 relative group">
                {/* Corner ticks — same as MetricTile */}
                <span className="absolute top-0 left-0 w-2 h-px bg-edge-bright" />
                <span className="absolute top-0 left-0 w-px h-2 bg-edge-bright" />
                <span className="absolute bottom-0 right-0 w-2 h-px bg-edge-bright" />
                <span className="absolute bottom-0 right-0 w-px h-2 bg-edge-bright" />

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="label-mono">{label}</div>
                    <div className="font-mono text-[10px] text-fg-muted mt-0.5">{desc}</div>
                  </div>
                  <button
                    onClick={() => downloadPng(b64, `tcp-${key}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity
                               font-mono text-[10px] text-data border border-data/30
                               rounded px-2 py-1 hover:bg-data/10"
                  >
                    ↓ png
                  </button>
                </div>

                <img
                  src={`data:image/png;base64,${b64}`}
                  alt={label}
                  className="w-full h-auto rounded"
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}