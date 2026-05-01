import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
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

// Light, Uber/Bolt-style minimal map
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f3eee4" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f3eee4" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a6f5f" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#e6dfd1" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e6dfd1" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d9cfb8" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#5a4f3f" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe2e8" }] },
];

interface Props {
  pickupAddress?: string;
  dropoffAddress?: string;
  liveDriver?: { lat: number; lng: number } | null;
}

export function MapView({ pickupAddress, dropoffAddress, liveDriver }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const driverMarkersRef = useRef<google.maps.Marker[]>([]);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const liveDriverMarkerRef = useRef<google.maps.Marker | null>(null);
  const liveRouteRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("get-maps-key");
        if (fnErr || !data?.key) throw new Error("Could not load map key");
        setOptions({ key: data.key, v: "weekly" });
        await Promise.all([
          importLibrary("maps"),
          importLibrary("marker"),
          importLibrary("routes"),
          importLibrary("geocoding"),
        ]);
        if (cancelled || !containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center: ELSIES_RIVER,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          styles: MAP_STYLE,
          backgroundColor: "#f3eee4",
          gestureHandling: "greedy",
        });
        mapRef.current = map;

        // Pickup pin (center)
        pickupMarkerRef.current = new google.maps.Marker({
          position: ELSIES_RIVER,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#F58A6F",
            fillOpacity: 1,
            strokeColor: "#ffffff",
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
              path: "M -8,-4 L -8,4 L 8,4 L 8,-4 Z",
              scale: 1,
              fillColor: "#1a1a1a",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              rotation: Math.random() * 360,
            },
          })
        );

        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: { strokeColor: "#1a1a1a", strokeWeight: 5, strokeOpacity: 0.95 },
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

  // Live driver marker — animates to new position as updates arrive
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;

    if (!liveDriver) {
      liveDriverMarkerRef.current?.setMap(null);
      liveDriverMarkerRef.current = null;
      return;
    }

    const target = new google.maps.LatLng(liveDriver.lat, liveDriver.lng);

    if (!liveDriverMarkerRef.current) {
      liveDriverMarkerRef.current = new google.maps.Marker({
        position: target,
        map,
        zIndex: 999,
        title: "Your driver",
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: "#22d3ee",
          fillOpacity: 1,
          strokeColor: "#0f1115",
          strokeWeight: 3,
        },
      });
      map.panTo(target);
      return;
    }

    // Smoothly tween from current to new position
    const marker = liveDriverMarkerRef.current;
    const start = marker.getPosition();
    if (!start) {
      marker.setPosition(target);
      return;
    }
    const startLat = start.lat();
    const startLng = start.lng();
    const endLat = target.lat();
    const endLng = target.lng();
    const t0 = performance.now();
    const duration = 1200;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      marker.setPosition({
        lat: startLat + (endLat - startLat) * k,
        lng: startLng + (endLng - startLng) * k,
      });
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [liveDriver, ready]);


  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground bg-muted">
          Loading map…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs font-mono text-destructive bg-muted">
          {error}
        </div>
      )}
    </div>
  );
}
