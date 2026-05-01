import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MapPin, Navigation, Clock } from "lucide-react";
import { useBroadcastLocation } from "@/hooks/useBroadcastLocation";
import { DriverWallet } from "@/components/DriverWallet";
import { CompleteRideDialog } from "@/components/CompleteRideDialog";
import { SOSButton } from "@/components/SOSButton";

interface Ride {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  postal_code: string;
  notes: string | null;
  fare_estimate: number | null;
  status: string;
  rider_id: string;
  driver_id: string | null;
  created_at: string;
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const [openRides, setOpenRides] = useState<Ride[]>([]);
  const [myRide, setMyRide] = useState<Ride | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);

  useBroadcastLocation(
    user?.id,
    myRide?.id,
    !!myRide && (myRide.status === "accepted" || myRide.status === "in_progress")
  );

  const load = async () => {
    if (!user) return;
    const { data: open } = await supabase.from("rides").select("*").eq("status", "requested").order("created_at", { ascending: false });
    const { data: mine } = await supabase
      .from("rides").select("*").eq("driver_id", user.id)
      .in("status", ["accepted", "in_progress"]).order("created_at", { ascending: false }).limit(1);
    setOpenRides((open ?? []) as Ride[]);
    setMyRide((mine?.[0] ?? null) as Ride | null);
  };

  useEffect(() => {
    load();
    if (!user) return;

    // Ask browser notification permission once
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const playPing = () => {
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        if (!Ctx) return;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.setValueAtTime(1320, ctx.currentTime + 0.15);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        o.connect(g).connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.42);
      } catch {}
    };

    const channel = supabase
      .channel("driver-rides")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, load)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides", filter: "status=eq.requested" },
        (payload) => {
          const r = payload.new as Ride;
          // Don't notify if driver is already on a ride
          if (myRide) return;
          playPing();
          toast.success("New ride request", {
            description: `${r.pickup_address} → ${r.dropoff_address}${r.fare_estimate ? ` · R${r.fare_estimate}` : ""}`,
            duration: 8000,
          });
          if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
            try {
              new Notification("New ride request", {
                body: `${r.pickup_address} → ${r.dropoff_address}`,
                tag: r.id,
              });
            } catch {}
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, myRide]);

  const accept = async (ride: Ride) => {
    const { error } = await supabase.from("rides")
      .update({ driver_id: user!.id, status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", ride.id).eq("status", "requested");
    if (error) toast.error(error.message); else toast.success("Ride accepted!");
  };

  const updateStatus = async (status: string) => {
    if (!myRide) return;
    if (status === "completed") { setCompleteOpen(true); return; }
    const patch: any = { status };
    await supabase.from("rides").update(patch).eq("id", myRide.id);
    toast.success(`Ride ${status.replace("_", " ")}`);
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display font-light leading-[0.95] tracking-tight text-3xl mb-2">Driver hub.</h1>
        <p className="text-muted-foreground mb-10">Open rides in your neighborhood.</p>

        <DriverWallet />

        {myRide && (
          <section className="mb-10 surface rounded-3xl border border-primary/30 p-8 glow-border">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Your active ride</span>
              <span className="px-2 py-0.5 rounded-md bg-pulse/10 text-pulse text-[10px] font-mono uppercase">{myRide.status}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Detail icon={MapPin} label="Pickup" value={myRide.pickup_address} accent="primary" />
              <Detail icon={Navigation} label="Dropoff" value={myRide.dropoff_address} accent="pulse" />
            </div>
            {myRide.notes && <p className="text-sm text-muted-foreground italic mb-6">"{myRide.notes}"</p>}
            <div className="flex gap-3">
              {myRide.status === "accepted" && <Button onClick={() => updateStatus("in_progress")} className="bg-primary text-primary-foreground hover:bg-primary-glow">Start ride</Button>}
              {myRide.status === "in_progress" && <Button onClick={() => updateStatus("completed")} className="bg-pulse text-pulse-foreground hover:bg-pulse/90">Complete ride</Button>}
              <Button variant="outline" onClick={() => updateStatus("cancelled")} className="border-border">Cancel</Button>
            </div>

            <div className="mt-4">
              <SOSButton rideId={myRide.id} userId={user!.id} role="driver" />
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display text-xl mb-4 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-pulse animate-pulse" />
            Open requests <span className="text-muted-foreground text-sm font-sans font-normal">({openRides.length})</span>
          </h2>
          {openRides.length === 0 ? (
            <div className="surface rounded-3xl border border-border p-12 text-center text-muted-foreground">
              <Clock className="size-8 mx-auto mb-3 opacity-50" />
              No open rides in your area. Sit tight.
            </div>
          ) : (
            <div className="grid gap-4">
              {openRides.map(r => (
                <div key={r.id} className="surface rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-3">
                      <Detail icon={MapPin} label="Pickup" value={r.pickup_address} accent="primary" />
                      <Detail icon={Navigation} label="Dropoff" value={r.dropoff_address} accent="pulse" />
                      {r.notes && <p className="text-xs text-muted-foreground italic">"{r.notes}"</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {r.fare_estimate && <p className="font-display text-2xl text-primary mb-1">R{r.fare_estimate}</p>}
                      <p className="text-[10px] font-mono uppercase text-muted-foreground mb-3">est. fare</p>
                      <Button onClick={() => accept(r)} disabled={!!myRide} className="bg-primary text-primary-foreground hover:bg-primary-glow">Accept</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {myRide && (
        <CompleteRideDialog
          open={completeOpen}
          onOpenChange={setCompleteOpen}
          rideId={myRide.id}
          estimatedFare={myRide.fare_estimate}
          onCompleted={load}
        />
      )}
    </div>
  );
}

function Detail({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: "primary" | "pulse" }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`size-4 mt-0.5 shrink-0 ${accent === "primary" ? "text-primary" : "text-pulse"}`} />
      <div className="min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm truncate">{value}</p>
      </div>
    </div>
  );
}
