import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * While `enabled` is true, watches the driver's GPS and upserts their
 * latest position into `driver_locations` so the rider can track them live.
 */
export function useBroadcastLocation(
  driverId: string | undefined,
  rideId: string | undefined,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled || !driverId || !rideId) return;
    if (!("geolocation" in navigator)) return;

    let lastSent = 0;
    const push = async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSent < 3000) return; // throttle to 1 update / 3s
      lastSent = now;
      await supabase.from("driver_locations").upsert({
        driver_id: driverId,
        ride_id: rideId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        heading: pos.coords.heading ?? null,
        updated_at: new Date().toISOString(),
      });
    };

    // Fallback simulated drift if geolocation denied — keeps demo alive
    let simTimer: number | undefined;
    const startSim = () => {
      let lat = -33.9239 + (Math.random() - 0.5) * 0.01;
      let lng = 18.5483 + (Math.random() - 0.5) * 0.01;
      simTimer = window.setInterval(async () => {
        lat += (Math.random() - 0.5) * 0.0008;
        lng += (Math.random() - 0.5) * 0.0008;
        await supabase.from("driver_locations").upsert({
          driver_id: driverId,
          ride_id: rideId,
          latitude: lat,
          longitude: lng,
          heading: null,
          updated_at: new Date().toISOString(),
        });
      }, 4000);
    };

    const watchId = navigator.geolocation.watchPosition(
      push,
      () => startSim(),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (simTimer) clearInterval(simTimer);
    };
  }, [driverId, rideId, enabled]);
}
