import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "driver" | "rider";

/**
 * While `enabled` is true, watches GPS and upserts the latest position into
 * either `driver_locations` or `rider_locations` so the counterpart can track
 * them live.
 */
export function useBroadcastLocation(
  userId: string | undefined,
  rideId: string | undefined,
  enabled: boolean,
  role: Role = "driver"
) {
  useEffect(() => {
    if (!enabled || !userId || !rideId) return;

    const table = role === "driver" ? "driver_locations" : "rider_locations";
    const idCol = role === "driver" ? "driver_id" : "rider_id";

    const upsert = async (lat: number, lng: number, heading: number | null) => {
      await supabase.from(table as any).upsert({
        [idCol]: userId,
        ride_id: rideId,
        latitude: lat,
        longitude: lng,
        heading,
        updated_at: new Date().toISOString(),
      });
    };

    let lastSent = 0;
    let watchId: number | null = null;
    let simTimer: number | undefined;

    const startSim = () => {
      if (simTimer) return;
      // Random offset around Elsies River so rider/driver don't overlap exactly
      let lat = -33.9239 + (Math.random() - 0.5) * 0.01;
      let lng = 18.5483 + (Math.random() - 0.5) * 0.01;
      // Push immediately so the counterpart sees us right away
      upsert(lat, lng, null);
      simTimer = window.setInterval(() => {
        lat += (Math.random() - 0.5) * 0.0008;
        lng += (Math.random() - 0.5) * 0.0008;
        upsert(lat, lng, null);
      }, 4000);
    };

    const push = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSent < 3000) return;
      lastSent = now;
      upsert(pos.coords.latitude, pos.coords.longitude, pos.coords.heading ?? null);
    };

    if (!("geolocation" in navigator)) {
      startSim();
    } else {
      // If permission is denied / errors out, fall back to sim so the demo stays alive.
      try {
        watchId = navigator.geolocation.watchPosition(
          push,
          () => startSim(),
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
        );
      } catch {
        startSim();
      }
      // Safety net: if no real GPS fix arrives within 6s, also start sim so the
      // counterpart can see *something* on the map.
      const safety = window.setTimeout(() => {
        if (lastSent === 0) startSim();
      }, 6000);
      return () => {
        window.clearTimeout(safety);
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (simTimer) clearInterval(simTimer);
      };
    }

    return () => {
      if (simTimer) clearInterval(simTimer);
    };
  }, [userId, rideId, enabled, role]);
}
