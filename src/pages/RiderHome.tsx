import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppNav } from "@/components/AppNav";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Navigation, Users } from "lucide-react";

const rideSchema = z.object({
  pickup_address: z.string().trim().min(3).max(200),
  dropoff_address: z.string().trim().min(3).max(200),
  postal_code: z.string().trim().min(3).max(10),
  notes: z.string().trim().max(300).optional(),
});

interface Ride {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  created_at: string;
}

export default function RiderHome() {
  const { user } = useAuth();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [postalCodes, setPostalCodes] = useState<{ postal_code: string; area_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  useEffect(() => {
    supabase.from("approved_postal_codes").select("postal_code, area_name").then(({ data }) => {
      setPostalCodes(data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("rides")
        .select("*")
        .eq("rider_id", user.id)
        .in("status", ["requested", "accepted", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(1);
      setActiveRide(data?.[0] as Ride ?? null);
    };
    load();

    const channel = supabase
      .channel("rider-rides")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides", filter: `rider_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const requestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = rideSchema.safeParse({ pickup_address: pickup, dropoff_address: dropoff, postal_code: postalCode, notes });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.from("rides").insert({
      rider_id: user!.id,
      pickup_address: pickup,
      dropoff_address: dropoff,
      postal_code: postalCode,
      notes: notes || null,
      fare_estimate: Math.round((8 + Math.random() * 18) * 100) / 100,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Ride requested — neighbors are being notified.");
      setPickup(""); setDropoff(""); setNotes("");
    }
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    await supabase.from("rides").update({ status: "cancelled" }).eq("id", activeRide.id);
    toast.message("Ride cancelled.");
  };

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Request panel */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            <header>
              <h1 className="font-display text-5xl font-light leading-[0.95] tracking-tight">
                Your neighborhood,<br />
                <span className="text-primary italic font-medium">in motion.</span>
              </h1>
              <p className="mt-3 text-muted-foreground">Ride with verified neighbors you actually know.</p>
            </header>

            {activeRide ? (
              <div className="surface rounded-3xl border border-primary/20 p-6 glow-border">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Active Ride</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-pulse">{activeRide.status}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="size-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pickup</p>
                      <p className="text-sm">{activeRide.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Navigation className="size-4 text-pulse mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Dropoff</p>
                      <p className="text-sm">{activeRide.dropoff_address}</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={cancelRide} className="mt-6 w-full border-border">Cancel ride</Button>
              </div>
            ) : (
              <form onSubmit={requestRide} className="surface rounded-3xl border border-border p-6 glow-border space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Pickup Location</Label>
                  <div className="flex items-center gap-3 bg-input p-3 rounded-xl border border-border focus-within:border-primary/50 transition-colors">
                    <div className="size-2 rounded-full bg-primary shrink-0" />
                    <Input value={pickup} onChange={e => setPickup(e.target.value)} placeholder="224 Oakwood Avenue" className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Dropoff</Label>
                  <div className="flex items-center gap-3 bg-input p-3 rounded-xl border border-border focus-within:border-primary/50 transition-colors">
                    <div className="size-2 rounded-full border border-muted-foreground shrink-0" />
                    <Input value={dropoff} onChange={e => setDropoff(e.target.value)} placeholder="Where are you headed?" className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Neighborhood</Label>
                  <Select value={postalCode} onValueChange={setPostalCode}>
                    <SelectTrigger className="bg-input border-border h-12"><SelectValue placeholder="Select your area" /></SelectTrigger>
                    <SelectContent>
                      {postalCodes.map(p => (
                        <SelectItem key={p.postal_code} value={p.postal_code}>{p.area_name} · {p.postal_code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Note for driver (optional)</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Quick note..." className="bg-input border-border resize-none" rows={2} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary-glow font-semibold rounded-2xl">
                  {submitting ? "Requesting..." : "Request a Ride"}
                </Button>
              </form>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="surface rounded-2xl border border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="size-3.5 text-primary" />
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">Available</p>
                </div>
                <p className="font-display text-xl font-medium">12 Neighbors</p>
              </div>
              <div className="surface rounded-2xl border border-border p-4">
                <p className="text-[10px] font-mono uppercase text-muted-foreground mb-1">Wait Time</p>
                <p className="font-display text-xl font-medium text-pulse">4-6 mins</p>
              </div>
            </div>
          </section>

          {/* Right: Map */}
          <section className="lg:col-span-7">
            <div className="h-[640px]">
              <MapView pickupAddress={activeRide?.pickup_address || pickup || "—"} dropoffAddress={activeRide?.dropoff_address || dropoff} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
