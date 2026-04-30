export function Header() {
  return (
    <header className="border-b border-edge">
      <div className="max-w-[1400px] mx-auto px-6 py-5 flex items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* logo mark */}
          <div className="relative w-9 h-9 border border-accent flex items-center justify-center">
            <div className="absolute inset-1 border border-accent/30" />
            <span className="font-mono text-[10px] text-accent tracking-widest2">CC</span>
          </div>
          <div>
            <div className="font-display text-[28px] leading-none text-fg">
              tcp <span className="italic text-accent">congestion</span> control
            </div>
            <div className="label-mono mt-1.5">
              ns-3.30 simulator · dumbbell · droptail
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-5 label-mono-bright">
          <span>/ scenarios</span>
          <span>/ topology</span>
          <span>/ cwnd</span>
          <span>/ metrics</span>
        </nav>

        <div className="text-right">
          <div className="label-mono">build</div>
          <div className="font-mono text-[12px] text-fg">dev · 447980d</div>
        </div>
      </div>
    </header>
  );
}