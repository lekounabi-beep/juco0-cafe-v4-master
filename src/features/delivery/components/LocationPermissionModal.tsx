/**
 * Prompts the driver to enable location before pickup / during delivery.
 */

import { MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LocationPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
}

export function LocationPermissionModal({ open, onOpenChange, onRetry }: LocationPermissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Ενεργοποίηση τοποθεσίας</DialogTitle>
          <DialogDescription className="text-center">
            Χρειάζεται πρόσβαση στην τοποθεσία για την παραλαβή και την παράδοση. Ενεργοποίησε την
            τοποθεσία στις ρυθμίσεις του browser ή πάτα «Δοκιμή ξανά».
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            type="button"
            onClick={onRetry}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition"
          >
            Δοκιμή ξανά
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full h-11 rounded-xl border border-white/10 text-white/80 hover:bg-white/5 transition"
          >
            Ακύρωση
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
