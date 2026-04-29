import { useEffect, useState } from "react";

interface Driver { id: string; x: number; y: number; name: string; }

const MOCK_DRIVERS: Driver[] = [
  { id: "1", x: 28, y: 38, name: "Marcus C." },
  { id: "2", x: 62, y: 52, name: "Elena R." },
  { id: "3", x: 45, y: 70, name: "Sam T." },
  { id: "4", x: 78, y: 30, name: "Priya K." },
];

export function MapView({ pickupAddress }: { pickupAddress?: string }) {
  const [drivers, setDrivers] = useState(MOCK_DRIVERS);

  // Subtly drift drivers to feel alive
  useEffect(() => {
    const t = setInterval(() => {
      setDrivers(prev => prev.map(d => ({
        ...d,
        x: Math.max(8, Math.min(92, d.x + (Math.random() - 0.5) * 1.5)),
        y: Math.max(8, Math.min(92, d.y + (Math.random() - 0.5) * 1.5)),
      })));
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border surface">
      {/* Stylized street grid */}
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="hsl(var(--border))" strokeWidth="0.15" />
          </pattern>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(43 96% 56% / 0.18)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        {/* Curved "river" + main road */}
        <path d="M 0 60 Q 30 40 60 55 T 100 50" stroke="hsl(var(--primary) / 0.25)" strokeWidth="0.6" fill="none" />
        <path d="M 20 0 L 22 100" stroke="hsl(var(--border))" strokeWidth="0.4" />
        <path d="M 0 75 L 100 72" stroke="hsl(var(--border))" strokeWidth="0.4" />
        <path d="M 70 0 L 72 100" stroke="hsl(var(--border))" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="40" fill="url(#glow)" />
      </svg>

      {/* Pickup pin */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="ripple relative size-10">
          <div className="absolute inset-0 m-auto size-4 rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.8)]" />
        </div>
      </div>

      {/* Drivers */}
      {drivers.map(d => (
        <div
          key={d.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-2000 ease-linear"
          style={{ left: `${d.x}%`, top: `${d.y}%` }}
        >
          <div className="group relative">
            <div className="size-9 rounded-full border border-pulse/40 bg-pulse/10 backdrop-blur-md flex items-center justify-center pulsing-dot">
              <div className="size-2.5 rounded-full bg-pulse shadow-[0_0_10px_hsl(var(--pulse)/0.7)]" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-7 px-2 py-0.5 rounded-md bg-surface-elevated border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] font-mono text-muted-foreground">{d.name}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Coordinate badge */}
      <div className="absolute right-4 bottom-4 bg-background/80 backdrop-blur-md border border-border px-3 py-2 rounded-lg">
        <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Pickup</p>
        <p className="text-xs font-mono">{pickupAddress || "—"}</p>
      </div>

      <div className="absolute left-4 top-4 flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border px-3 py-1.5 rounded-full">
        <div className="size-1.5 rounded-full bg-pulse animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-widest">{drivers.length} drivers nearby</span>
      </div>
    </div>
  );
}
