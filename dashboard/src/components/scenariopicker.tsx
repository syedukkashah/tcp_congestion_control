import type { Scenario } from '../lib/types';
import { SCENARIOS } from '../lib/scenarios';

interface ScenarioPickerProps {
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export function ScenarioPicker({ selectedId, onSelect, disabled }: ScenarioPickerProps) {
  return (
    <section className="border-b border-edge">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-baseline gap-3 mb-5">
          <span className="index-marker">% 01</span>
          <h2 className="font-display text-[22px] text-fg leading-none">
            select a <span className="italic text-accent">scenario</span>
          </h2>
          <div className="flex-1 hairline-x ml-4" />
          <span className="label-mono">6 presets</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {SCENARIOS.map(s => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              selected={s.id === selectedId}
              disabled={disabled}
              onClick={() => onSelect(s.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ScenarioCard({
  scenario, selected, disabled, onClick,
}: {
  scenario: Scenario;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const variantText = scenario.variant ? scenario.variant.toUpperCase() : 'ANY';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'group relative text-left p-3.5 transition-all',
        'border bg-surface-1',
        selected
          ? 'border-accent shadow-[inset_0_0_0_1px_rgba(249,115,22,0.4)]'
          : 'border-edge hover:border-edge-bright',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {/* corner ticks */}
      <span className={`absolute top-0 left-0 w-2 h-px ${selected ? 'bg-accent' : 'bg-edge-bright'}`} />
      <span className={`absolute top-0 left-0 w-px h-2 ${selected ? 'bg-accent' : 'bg-edge-bright'}`} />
      <span className={`absolute top-0 right-0 w-2 h-px ${selected ? 'bg-accent' : 'bg-edge-bright'}`} />
      <span className={`absolute top-0 right-0 w-px h-2 ${selected ? 'bg-accent' : 'bg-edge-bright'}`} />
      <span className={`absolute bottom-0 left-0 w-2 h-px ${selected ? 'bg-accent' : 'bg-edge-bright'}`} />
      <span className={`absolute bottom-0 left-0 w-px h-2 ${selected ? 'bg-accent' : 'bg-edge-bright'}`} />
      <span className={`absolute bottom-0 right-0 w-2 h-px ${selected ? 'bg-accent' : 'bg-edge-bright'}`} />
      <span className={`absolute bottom-0 right-0 w-px h-2 ${selected ? 'bg-accent' : 'bg-edge-bright'}`} />

      <div className="flex items-baseline justify-between mb-2">
        <span className={`font-mono text-[10px] tracking-widest2 ${selected ? 'text-accent' : 'text-fg-muted'}`}>
          % {scenario.index}
        </span>
        {selected && (
          <span className="flex items-center gap-1 text-[9px] tracking-widest2 text-accent">
            <span className="w-1 h-1 rounded-full bg-accent animate-pulse-dot" />
            ARMED
          </span>
        )}
      </div>

      <div className="font-display text-[18px] leading-tight text-fg mb-2">
        {scenario.title}
      </div>

      <p className="font-mono text-[10.5px] leading-relaxed text-fg-dim min-h-[44px]">
        {scenario.story}
      </p>

      <div className="mt-3 pt-2 border-t border-edge flex items-center justify-between font-mono text-[9.5px] tracking-widest2">
        <span className={selected ? 'text-fg' : 'text-fg-muted'}>{variantText}</span>
        <span className="text-fg-muted">
          {scenario.bandwidth} · {scenario.delay} · q={scenario.queueSize}
        </span>
      </div>
    </button>
  );
}