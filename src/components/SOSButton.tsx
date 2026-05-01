import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  rideId: string;
  userId: string;
  role: "rider" | "driver";
}

/**
 * Emergency SOS button — triggers an alert that admins see in real time.
 * Captures the user's last known GPS location if available.
 */
export function SOSButton({ rideId, userId, role }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trigger = async () => {
    setSubmitting(true);

    // Best-effort location capture (don't block on it)
    const getLocation = (): Promise<{ lat: number; lng: number } | null> =>
      new Promise((resolve) => {
        if (!("geolocation" in navigator)) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 5000 }
        );
      });

    const loc = await getLocation();

    const { error } = await supabase.from("sos_alerts").insert({
      ride_id: rideId,
      triggered_by: userId,
      triggered_role: role,
      latitude: loc?.lat ?? null,
      longitude: loc?.lng ?? null,
      message: message.trim() || null,
    });

    setSubmitting(false);

    if (error) {
      toast.error("Could not send SOS — please call 10111 immediately.");
      return;
    }

    toast.success("Emergency alert sent. Stay on the line — help is being notified.", {
      duration: 8000,
    });
    setOpen(false);
    setMessage("");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-12 rounded-2xl border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground font-semibold"
        >
          <ShieldAlert className="size-4 mr-2" /> Emergency SOS
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" /> Send emergency alert?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will alert the KYK N LYN safety team with your live location and ride details.
            For immediate police response, also call <strong>10111</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Textarea
          placeholder="Quick note (optional) — e.g. what's happening?"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 300))}
          rows={3}
          className="bg-secondary/60 border-0 rounded-xl"
        />

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); trigger(); }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {submitting ? <><Loader2 className="size-4 mr-2 animate-spin" /> Sending…</> : "Send SOS"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
