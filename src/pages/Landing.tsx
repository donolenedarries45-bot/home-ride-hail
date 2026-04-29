import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Users, MapPin } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 h-16 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost">Log in</Button></Link>
            <Link to="/auth"><Button className="bg-primary text-primary-foreground hover:bg-primary-glow">Join</Button></Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-primary/20 bg-primary/5">
              <div className="size-1.5 rounded-full bg-pulse animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Community-owned mobility</span>
            </div>
            <h1 className="font-display text-6xl md:text-7xl font-light leading-[0.95] tracking-tight">
              Your neighborhood,<br />
              <span className="text-primary italic font-medium text-glow">in motion.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              Lantern is ride-sharing rebuilt for the block. Only verified neighbors from your zip code can drive — vetted by code, then by humans.
            </p>
            <div className="mt-10 flex gap-4">
              <Link to="/auth"><Button className="h-14 px-8 bg-primary text-primary-foreground hover:bg-primary-glow font-semibold text-base rounded-2xl glow-amber">Request a ride</Button></Link>
              <Link to="/auth"><Button variant="outline" className="h-14 px-8 border-border bg-secondary hover:bg-accent text-base rounded-2xl">Drive with us →</Button></Link>
            </div>
          </div>

          <div className="relative aspect-square">
            <div className="absolute inset-0 rounded-3xl surface border border-border overflow-hidden">
              <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="g2" width="6" height="6" patternUnits="userSpaceOnUse">
                    <path d="M 6 0 L 0 0 0 6" fill="none" stroke="hsl(var(--border))" strokeWidth="0.2" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#g2)" />
                <path d="M 0 50 Q 30 30 50 50 T 100 45" stroke="hsl(var(--primary) / 0.4)" strokeWidth="0.5" fill="none" />
              </svg>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ripple size-12">
                <div className="absolute inset-0 m-auto size-5 rounded-full bg-primary shadow-[0_0_30px_hsl(var(--primary)/0.9)]" />
              </div>
              {[
                { x: 22, y: 35 }, { x: 70, y: 28 }, { x: 35, y: 72 }, { x: 78, y: 68 },
              ].map((p, i) => (
                <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  <div className="size-8 rounded-full border border-pulse/40 bg-pulse/10 flex items-center justify-center pulsing-dot" style={{ animationDelay: `${i * 0.4}s` }}>
                    <div className="size-2 rounded-full bg-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <section className="mt-32 grid md:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, title: "Two-step verification", body: "Drivers must live in an approved zip code AND pass admin review before they can drive." },
            { icon: Users, title: "Neighbors, not strangers", body: "Every face you see is a vetted local. No surge pricing, no anonymous fleet." },
            { icon: MapPin, title: "Hyper-local pickup", body: "Drivers only see ride requests inside their own neighborhood." },
          ].map(f => (
            <div key={f.title} className="surface rounded-3xl border border-border p-8 hover:border-primary/30 transition-colors">
              <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                <f.icon className="size-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-12 mt-20">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between gap-6 text-sm text-muted-foreground">
          <Logo size="sm" />
          <p className="font-mono text-xs">PROUDLY LOCAL · BUILT FOR THE BLOCK</p>
        </div>
      </footer>
    </div>
  );
}
