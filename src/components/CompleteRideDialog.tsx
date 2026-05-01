import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rideId: string;
  estimatedFare: number | null;
  onCompleted: () => void;
}

export function CompleteRideDialog({ open, onOpenChange, rideId, estimatedFare, onCompleted }: Props) {
  const [fare, setFare] = useState<string>(estimatedFare ? estimatedFare.toFixed(2) : "");
  const [submitting, setSubmitting] = useState(false);

  const fareNum = parseFloat(fare);
  const valid = !isNaN(fareNum) && fareNum > 0 && fareNum <= 10000;
  const commission = valid ? (fareNum * 0.1).toFixed(2) : "0.00";

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("rides")
      .update({
        status: "completed",
        actual_fare: fareNum,
        completed_at: new Date().toISOString(),
      })
      .eq("id", rideId);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Ride completed · R${commission} commission deducted`);
    onOpenChange(false);
    onCompleted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Complete ride</DialogTitle>
          <DialogDescription>Confirm the cash fare the rider actually paid you. 10% commission will be deducted from your wallet automatically.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Actual cash collected (ZAR)</Label>
            <div className="flex items-center gap-2 mt-2 bg-input p-3 rounded-xl border border-border focus-within:border-primary/50">
              <span className="font-mono text-muted-foreground">R</span>
              <Input type="number" inputMode="decimal" min="1" max="10000" step="0.50" value={fare} onChange={e => setFare(e.target.value)} className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-lg font-display" autoFocus />
            </div>
            {estimatedFare && <p className="text-[10px] font-mono text-muted-foreground mt-1.5">Estimate was R{estimatedFare.toFixed(2)}</p>}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cash you keep</span>
              <span className="font-mono font-medium">R{valid ? (fareNum * 0.9).toFixed(2) : "0.00"}</span>
            </div>
            <div className="flex justify-between text-primary">
              <span>Platform commission (10%)</span>
              <span className="font-mono font-medium">−R{commission}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-border">Cancel</Button>
          <Button onClick={submit} disabled={!valid || submitting} className="bg-pulse text-pulse-foreground hover:bg-pulse/90">
            {submitting ? "Saving…" : "Complete ride"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
