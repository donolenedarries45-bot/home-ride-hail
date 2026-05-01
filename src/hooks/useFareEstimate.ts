import { useEffect, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";

interface FareResult {
  loading: boolean;
  error: string | null;
  distanceKm: number | null;
  durationMin: number | null;
  fare: number | null;
}

// Local fare formula (ZAR): R15 base + R7/km + R1.20/min, min R25.
function calcFare(distanceKm: number, durationMin: number) {
  const raw = 15 + distanceKm * 7 + durationMin * 1.2;
  return Math.max(25, Math.round(raw));
}

let mapsKeyPromise: Promise<string> | null = null;
async function getMapsKey() {
  if (!mapsKeyPromise) {
    mapsKeyPromise = (async () => {
      const { data, error } = await supabase.functions.invoke("get-maps-key");
      if (error || !data?.key) throw new Error("Could not load Google Maps key");
      return data.key as string;
    })();
  }
  return mapsKeyPromise;
}

export function useFareEstimate(pickup: string, dropoff: string): FareResult {
  const [state, setState] = useState<FareResult>({
    loading: false, error: null, distanceKm: null, durationMin: null, fare: null,
  });

  useEffect(() => {
    const p = pickup.trim();
    const d = dropoff.trim();
    if (p.length < 3 || d.length < 3) {
      setState({ loading: false, error: null, distanceKm: null, durationMin: null, fare: null });
      return;
    }

    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));

    const handle = setTimeout(async () => {
      try {
        const key = await getMapsKey();
        setOptions({ key, v: "weekly" });
        await importLibrary("routes");
        if (cancelled) return;

        const region = ", Elsies River, Cape Town, South Africa";
        const service = new google.maps.DistanceMatrixService();

        service.getDistanceMatrix(
          {
            origins: [p + region],
            destinations: [d + region],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
          },
          (res, status) => {
            if (cancelled) return;
            if (status !== "OK" || !res) {
              setState({ loading: false, error: "Could not calculate fare", distanceKm: null, durationMin: null, fare: null });
              return;
            }
            const elem = res.rows?.[0]?.elements?.[0];
            if (!elem || elem.status !== "OK") {
              setState({ loading: false, error: "Route not found", distanceKm: null, durationMin: null, fare: null });
              return;
            }
            const km = elem.distance.value / 1000;
            const min = elem.duration.value / 60;
            setState({
              loading: false,
              error: null,
              distanceKm: Math.round(km * 10) / 10,
              durationMin: Math.round(min),
              fare: calcFare(km, min),
            });
          }
        );
      } catch (e: any) {
        if (!cancelled) setState({ loading: false, error: e.message ?? "Fare unavailable", distanceKm: null, durationMin: null, fare: null });
      }
    }, 600);

    return () => { cancelled = true; clearTimeout(handle); };
  }, [pickup, dropoff]);

  return state;
}
