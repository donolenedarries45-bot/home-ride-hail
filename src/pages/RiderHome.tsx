import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import logoMark from "@/assets/kyk-n-lyn-logo.png";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Navigation, Loader2, Menu, Clock, Users, ChevronUp, X } from "lucide-react";
import { useFareEstimate } from "@/hooks/useFareEstimate";
import { DriverProfileCard } from "@/components/DriverProfileCard";
import { SOSButton } from "@/components/SOSButton";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  driver_id: string | null;
  fare_estimate: number | null;
}

export default function RiderHome() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [postalCodes, setPostalCodes] = useState<{ postal_code: string; area_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const fare = useFareEstimate(pickup, dropoff);

  const isAdmin = roles.includes("admin");
  const isDriver = roles.includes("driver");

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

  useEffect(() => {
    const driverId = activeRide?.driver_id;
    if (!driverId) { setDriverLoc(null); return; }

    let cancelled = false;
    const fetchLoc = async () => {
      const { data } = await supabase
        .from("driver_locations")
        .select("latitude, longitude")
        .eq("driver_id", driverId)
        .maybeSingle();
      if (!cancelled && data) setDriverLoc({ lat: data.latitude, lng: data.longitude });
    };
    fetchLoc();

    const channel = supabase
      .channel(`driver-loc-${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations", filter: `driver_id=eq.${driverId}` },
        (payload: any) => {
          const row = payload.new;
          if (row?.latitude != null && row?.longitude != null) {
            setDriverLoc({ lat: row.latitude, lng: row.longitude });
          }
        }
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [activeRide?.driver_id]);

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
      fare_estimate: fare.fare ?? null,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Ride requested — neighbors are being notified.");
      setPickup(""); setDropoff(""); setNotes(""); setSheetExpanded(false);
    }
  };

  const cancelRide = async () => {
    if (!activeRide) return;
    await supabase.from("rides").update({ status: "cancelled" }).eq("id", activeRide.id);
    toast.message("Ride cancelled.");
  };

  const showMap = !!activeRide || sheetExpanded;

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      {/* Map only shows when actively booking or during a ride */}
      {showMap && (
        <div className="absolute inset-0 animate-in fade-in duration-300">
          <MapView
            pickupAddress={activeRide?.pickup_address || pickup || "—"}
            dropoffAddress={activeRide?.dropoff_address || dropoff}
            liveDriver={driverLoc}
          />
        </div>
      )}

      {/* Idle landing — soft branded background */}
      {!showMap && (
        <div className="absolute inset-0 bg-background">
          <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-glow)" }} />
          <div className="absolute inset-x-0 top-[14%] px-6 text-center">
            <h1 className="font-bold tracking-tight text-5xl text-primary mb-3 font-serif">KYK N LYN</h1>
            <img
              src={logoMark}
              alt="KYK N LYN — hands connecting communities"
              width={480}
              height={270}
              className="mx-auto mb-2 w-80 h-auto object-contain"
            />
            <p className="font-mono uppercase tracking-widest text-muted-foreground mb-6 text-lg shadow-xl">Elsies River</p>
            <h2 className="font-display font-light leading-tight tracking-tight text-2xl">
              Your neighborhood,{" "}
              <span className="text-primary italic font-medium">in motion.</span>
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto">
              Tap below to book a ride with a verified neighbor.
            </p>
          </div>
        </div>
      )}

      {/* Top floating bar — menu + status pill */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-3 p-4 pointer-events-none">
        <Sheet>
          <SheetTrigger asChild>
            <button className="pointer-events-auto size-12 rounded-full bg-card shadow-elevated border border-border flex items-center justify-center hover:bg-secondary transition-colors">
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 bg-card">
            <SheetHeader>
              <SheetTitle><Logo /></SheetTitle>
            </SheetHeader>
            <div className="mt-8 flex flex-col gap-1">
              <Link to="/" className="px-4 py-3 rounded-xl hover:bg-secondary text-sm font-medium">Ride</Link>
              {isDriver
                ? <Link to="/driver" className="px-4 py-3 rounded-xl hover:bg-secondary text-sm font-medium">Drive</Link>
                : <Link to="/become-driver" className="px-4 py-3 rounded-xl hover:bg-secondary text-sm font-medium">Become a driver</Link>}
              {isAdmin && <Link to="/admin" className="px-4 py-3 rounded-xl hover:bg-secondary text-sm font-medium text-primary">Admin</Link>}
              <button
                onClick={async () => { await signOut(); navigate("/auth"); }}
                className="mt-4 px-4 py-3 rounded-xl hover:bg-secondary text-sm font-medium text-left text-muted-foreground"
              >
                Sign out
              </button>

              <div className="mt-6 pt-4 border-t border-border flex flex-col gap-1">
                <Link to="/terms" className="px-4 py-2 rounded-xl hover:bg-secondary text-xs text-muted-foreground">Terms of Service</Link>
                <Link to="/privacy" className="px-4 py-2 rounded-xl hover:bg-secondary text-xs text-muted-foreground">Privacy Policy</Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="pointer-events-auto flex items-center gap-2 bg-card border border-border shadow-elevated px-4 py-2 rounded-full">
          <div className="size-2 rounded-full bg-pulse animate-pulse" />
          <span className="text-xs font-medium">Elsies River</span>
        </div>
      </div>

      {/* Bottom sheet — Uber/Bolt style */}
      <div className="absolute left-0 right-0 bottom-0 z-30">
        {activeRide ? (
          /* Active ride card */
          <div className="bg-card rounded-t-3xl shadow-elevated border-t border-border p-5 pb-7 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-border mb-4" />

            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {activeRide.status === "requested" ? "Finding your driver" : activeRide.status.replace("_", " ")}
                </p>
                {activeRide.fare_estimate != null && (
                  <p className="font-display text-3xl font-medium mt-1">R{activeRide.fare_estimate}</p>
                )}
              </div>
              {activeRide.driver_id && driverLoc && (
                <div className="flex items-center gap-2 text-xs font-medium text-pulse">
                  <span className="size-2 rounded-full bg-pulse animate-pulse" />
                  Live tracking
                </div>
              )}
            </div>

            <div className="space-y-3 py-4 border-y border-border">
              <div className="flex items-start gap-3">
                <div className="size-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Pickup</p>
                  <p className="text-sm truncate">{activeRide.pickup_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="size-2.5 rounded-sm bg-foreground mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Dropoff</p>
                  <p className="text-sm truncate">{activeRide.dropoff_address}</p>
                </div>
              </div>
            </div>

            {activeRide.driver_id && (
              <div className="mt-4">
                <DriverProfileCard driverId={activeRide.driver_id} />
              </div>
            )}

            <Button variant="outline" onClick={cancelRide} className="mt-4 w-full h-12 rounded-2xl">
              <X className="size-4 mr-1" /> Cancel ride
            </Button>

            {(activeRide.status === "accepted" || activeRide.status === "in_progress") && (
              <div className="mt-3">
                <SOSButton rideId={activeRide.id} userId={user!.id} role="rider" />
              </div>
            )}
          </div>
        ) : (
          /* Booking sheet — collapsed/expanded */
          <div className={`bg-card rounded-t-3xl shadow-elevated border-t border-border transition-all duration-300 ${sheetExpanded ? "max-h-[88vh]" : ""}`}>
            <button
              onClick={() => setSheetExpanded(!sheetExpanded)}
              className="w-full pt-3 pb-2 flex flex-col items-center"
            >
              <div className="h-1.5 w-10 rounded-full bg-border" />
            </button>

            {!sheetExpanded ? (
              /* Collapsed peek state */
              <div className="px-5 pb-7">
                <h2 className="font-display text-2xl font-medium mb-1">Where to?</h2>
                <p className="text-sm text-muted-foreground mb-4">Ride with verified neighbors.</p>

                <button
                  onClick={() => setSheetExpanded(true)}
                  className="w-full flex items-center gap-3 bg-secondary hover:bg-accent transition-colors p-4 rounded-2xl text-left"
                >
                  <div className="size-9 rounded-full bg-foreground/10 flex items-center justify-center">
                    <Navigation className="size-4" />
                  </div>
                  <span className="text-base text-muted-foreground flex-1">Enter destination</span>
                  <ChevronUp className="size-4 text-muted-foreground" />
                </button>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-secondary/60">
                    <Users className="size-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold">12 nearby</p>
                      <p className="text-[10px] text-muted-foreground">drivers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-secondary/60">
                    <Clock className="size-4 text-pulse" />
                    <div>
                      <p className="text-xs font-semibold">4-6 min</p>
                      <p className="text-[10px] text-muted-foreground">wait time</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Expanded form state */
              <form onSubmit={requestRide} className="px-5 pb-7 space-y-3 overflow-y-auto max-h-[78vh]">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display text-xl font-medium">Plan your ride</h2>
                  <button type="button" onClick={() => setSheetExpanded(false)} className="size-8 rounded-full hover:bg-secondary flex items-center justify-center">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="bg-secondary/60 rounded-2xl p-1 space-y-1">
                  <div className="flex items-center gap-3 px-4 py-3 bg-card rounded-xl">
                    <div className="size-2.5 rounded-full bg-primary shrink-0" />
                    <Input
                      value={pickup}
                      onChange={e => setPickup(e.target.value)}
                      placeholder="Pickup location"
                      className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-base"
                    />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-card rounded-xl">
                    <div className="size-2.5 rounded-sm bg-foreground shrink-0" />
                    <Input
                      value={dropoff}
                      onChange={e => setDropoff(e.target.value)}
                      placeholder="Where to?"
                      className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-base"
                      autoFocus
                    />
                  </div>
                </div>

                <Select value={postalCode} onValueChange={setPostalCode}>
                  <SelectTrigger className="bg-secondary/60 border-0 h-12 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <SelectValue placeholder="Select neighborhood" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {postalCodes.map(p => (
                      <SelectItem key={p.postal_code} value={p.postal_code}>{p.area_name} · {p.postal_code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Note for driver (optional)"
                  className="bg-secondary/60 border-0 resize-none rounded-2xl"
                  rows={2}
                />

                {(fare.loading || fare.fare != null || fare.error) && (
                  <div className="rounded-2xl bg-secondary/60 p-4 flex items-center justify-between min-h-[64px]">
                    {fare.loading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Estimating…
                      </div>
                    ) : fare.fare != null ? (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">{fare.distanceKm} km · {fare.durationMin} min</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Cash · pay driver</p>
                        </div>
                        <p className="font-display text-2xl font-medium">R{fare.fare}</p>
                      </>
                    ) : (
                      <p className="text-xs text-destructive">{fare.error}</p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-2xl text-base"
                >
                  {submitting ? "Requesting..." : fare.fare ? `Confirm · R${fare.fare}` : "Request a ride"}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
