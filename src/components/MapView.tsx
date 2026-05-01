import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { supabase } from "@/integrations/supabase/client";

// Elsies River, Cape Town, South Africa
const ELSIES_RIVER = { lat: -33.9239, lng: 18.5483 };

// Mock nearby drivers (offsets in degrees, ~100m each)
const MOCK_DRIVERS = [
  { id: "1", name: "Marcus C.", lat: -33.9215, lng: 18.5460 },
  { id: "2", name: "Elena R.",  lat: -33.9265, lng: 18.5510 },
  { id: "3", name: "Sam T.",    lat: -33.9255, lng: 18.5450 },
  { id: "4", name: "Priya K.",  lat: -33.9220, lng: 18.5520 },
];

// Dark map styling to match the brand
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f1115" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1115" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8f98" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1f232b" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1f232b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f1115" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2a2f3a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9aa0a8" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1420" }] },
];

interface Props {
  pickupAddress?: string;
  dropoffAddress?: string;
}

export function MapView({ pickupAddress, dropoffAddress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const driverMarkersRef = useRef<google.maps.Marker[]>([]);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("get-maps-key");
        if (fnErr || !data?.key) throw new Error("Could not load map key");
        const loader = new Loader({ apiKey: data.key, version: "weekly" });
        await loader.importLibrary("maps");
        await loader.importLibrary("marker");
        await loader.importLibrary("routes");
        await loader.importLibrary("geocoding");
        if (cancelled || !containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center: ELSIES_RIVER,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          styles: MAP_STYLE,
          backgroundColor: "#0f1115",
        });
        mapRef.current = map;

        // Pickup pin (center)
        pickupMarkerRef.current = new google.maps.Marker({
          position: ELSIES_RIVER,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#f5b324",
            fillOpacity: 1,
            strokeColor: "#0f1115",
            strokeWeight: 3,
          },
          title: "Pickup",
        });

        // Driver markers
        driverMarkersRef.current = MOCK_DRIVERS.map(d =>
          new google.maps.Marker({
            position: { lat: d.lat, lng: d.lng },
            map,
            title: d.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#22d3ee",
              fillOpacity: 1,
              strokeColor: "#0f1115",
              strokeWeight: 2,
            },
          })
        );

        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: false,
          polylineOptions: { strokeColor: "#f5b324", strokeWeight: 5, strokeOpacity: 0.9 },
        });

        setReady(true);
      } catch (e: any) {
        setError(e.message ?? "Failed to load map");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Drift drivers slightly to feel alive
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      driverMarkersRef.current.forEach(m => {
        const p = m.getPosition();
        if (!p) return;
        m.setPosition({
          lat: p.lat() + (Math.random() - 0.5) * 0.0006,
          lng: p.lng() + (Math.random() - 0.5) * 0.0006,
        });
      });
    }, 2200);
    return () => clearInterval(t);
  }, [ready]);

  // Geocode + route when pickup/dropoff change
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const renderer = directionsRendererRef.current!;
    const geocoder = new google.maps.Geocoder();
    const region = ", Elsies River, Cape Town, South Africa";

    const geocode = (addr: string) =>
      new Promise<google.maps.LatLng | null>(resolve => {
        geocoder.geocode({ address: addr + region }, (results, status) => {
          if (status === "OK" && results?.[0]) resolve(results[0].geometry.location);
          else resolve(null);
        });
      });

    (async () => {
      const pickup = pickupAddress?.trim();
      const dropoff = dropoffAddress?.trim();

      if (pickup && dropoff && pickup !== "—" && dropoff !== "—") {
        const [from, to] = await Promise.all([geocode(pickup), geocode(dropoff)]);
        if (from && to) {
          const ds = new google.maps.DirectionsService();
          ds.route(
            { origin: from, destination: to, travelMode: google.maps.TravelMode.DRIVING },
            (res, status) => {
              if (status === "OK" && res) {
                renderer.setDirections(res);
                pickupMarkerRef.current?.setMap(null);
              }
            }
          );
          return;
        }
      }

      // No route — recenter on pickup if we can geocode it, else Elsies River
      renderer.set("directions", null);
      pickupMarkerRef.current?.setMap(map);
      if (pickup && pickup !== "—") {
        const loc = await geocode(pickup);
        if (loc) {
          map.panTo(loc);
          pickupMarkerRef.current?.setPosition(loc);
        }
      } else {
        map.panTo(ELSIES_RIVER);
        pickupMarkerRef.current?.setPosition(ELSIES_RIVER);
      }
    })();
  }, [pickupAddress, dropoffAddress, ready]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border surface">
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground">
          Loading map…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs font-mono text-destructive">
          {error}
        </div>
      )}

      <div className="absolute right-4 bottom-4 bg-background/80 backdrop-blur-md border border-border px-3 py-2 rounded-lg pointer-events-none">
        <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Pickup</p>
        <p className="text-xs font-mono">{pickupAddress || "—"}</p>
      </div>

      <div className="absolute left-4 top-4 flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border px-3 py-1.5 rounded-full pointer-events-none">
        <div className="size-1.5 rounded-full bg-pulse animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-widest">Elsies River · Live</span>
      </div>
    </div>
  );
}
