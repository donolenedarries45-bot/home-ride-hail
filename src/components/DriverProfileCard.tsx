import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Car, User } from "lucide-react";

interface DriverProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  vehicle_make_model?: string | null;
  vehicle_color?: string | null;
  vehicle_plate?: string | null;
  vehicle_year?: number | null;
}

export function DriverProfileCard({ driverId }: { driverId: string }) {
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", driverId)
        .maybeSingle();

      const { data: app } = await supabase
        .from("driver_applications")
        .select("vehicle_make_model, vehicle_color, vehicle_plate, vehicle_year, profile_photo_path")
        .eq("user_id", driverId)
        .eq("status", "approved")
        .maybeSingle();

      if (cancelled) return;
      setDriver({ ...(profile ?? { id: driverId, full_name: null, avatar_url: null }), ...app });

      // Try to sign a URL for the driver's profile photo
      if (app?.profile_photo_path) {
        const { data: signed } = await supabase
          .storage
          .from("driver-documents")
          .createSignedUrl(app.profile_photo_path, 3600);
        if (!cancelled && signed?.signedUrl) setPhotoUrl(signed.signedUrl);
      } else if (profile?.avatar_url) {
        setPhotoUrl(profile.avatar_url);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [driverId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-input/30 p-4 flex items-center gap-4 animate-pulse">
        <div className="size-14 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/2 bg-muted rounded" />
          <div className="h-3 w-3/4 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!driver) return null;

  const initials = (driver.full_name ?? "?")
    .split(" ")
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-border bg-input/30 p-4">
      <div className="flex items-center gap-4">
        {photoUrl ? (
          <img src={photoUrl} alt={driver.full_name ?? "Driver"} className="size-14 rounded-full object-cover border-2 border-primary/40" />
        ) : (
          <div className="size-14 rounded-full bg-secondary border-2 border-primary/40 flex items-center justify-center text-sm font-semibold">
            {initials || <User className="size-5 text-muted-foreground" />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Your driver</p>
          <p className="font-display text-lg font-medium truncate">{driver.full_name ?? "Driver"}</p>
        </div>
      </div>

      {(driver.vehicle_make_model || driver.vehicle_plate) && (
        <div className="mt-4 flex items-center gap-3 pt-4 border-t border-border">
          <Car className="size-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">
              {[driver.vehicle_color, driver.vehicle_year, driver.vehicle_make_model].filter(Boolean).join(" ")}
            </p>
          </div>
          {driver.vehicle_plate && (
            <span className="font-mono text-xs px-2 py-1 rounded-md bg-background border border-border tracking-widest">
              {driver.vehicle_plate}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
