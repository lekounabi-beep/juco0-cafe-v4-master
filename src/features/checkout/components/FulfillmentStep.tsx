import { Store, Truck } from "lucide-react";
import { PayOption } from "./PayOption";
import { useCheckoutForm } from "../hooks/useCheckoutForm";

export function FulfillmentStep() {
  const { fulfillment, setFulfillment } = useCheckoutForm();

  return (
    <section className="space-y-3 rounded-3xl glass p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-white/50">Βήμα 1</p>
        <h2 className="text-lg font-semibold text-white">Πώς θέλεις την παραγγελία;</h2>
        <p className="mt-1 text-sm text-white/55">
          Επίλεξε πρώτα παράδοση ή παραλαβή για να δεις μόνο τα απαραίτητα πεδία.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PayOption
          active={fulfillment === "delivery"}
          onClick={() => setFulfillment("delivery")}
          icon={<Truck className="h-5 w-5" />}
          title="Παράδοση"
          subtitle="Στο χώρο σου με διανομέα"
        />
        <PayOption
          active={fulfillment === "pickup"}
          onClick={() => setFulfillment("pickup")}
          icon={<Store className="h-5 w-5" />}
          title="Παραλαβή"
          subtitle="Παραλαβή από το κατάστημα"
        />
      </div>
    </section>
  );
}
