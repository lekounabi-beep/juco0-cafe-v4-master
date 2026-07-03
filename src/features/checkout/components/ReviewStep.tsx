import { CartItemComponent } from "@/features/cart/components/CartItem";
import { CartSummary } from "@/features/cart/components/CartSummary";
import { useCart } from "@/lib/cart-store";
import { calcDeliveryFee } from "@/shared/utils/currency";
import { useCheckoutForm } from "../hooks/useCheckoutForm";
import { formatAddressArea, formatAddressLine } from "@/features/location/utils/address-formatter";

type ReviewStepProps = {
  onEditAddress: () => void;
};

function paymentLabel(payment: string, fulfillment: string) {
  if (payment === "card") return "Κάρτα / Apple Pay / Google Pay";
  return fulfillment === "pickup" ? "Πληρωμή στο κατάστημα" : "Μετρητά στην παράδοση";
}

export function ReviewStep({ onEditAddress }: ReviewStepProps) {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const { fulfillment, phone, deliveryAddress, payment } = useCheckoutForm();
  const isPickup = fulfillment === "pickup";
  const deliveryFee = isPickup ? 0 : calcDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;
  const preferences = deliveryAddress?.deliveryPreferences?.join(" · ") ?? "";

  return (
    <section className="space-y-4 rounded-3xl glass p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-white/50">
          Βήμα {isPickup ? "4" : "5"}
        </p>
        <h2 className="text-lg font-semibold text-white">Έλεγχος παραγγελίας</h2>
        <p className="mt-1 text-sm text-white/55">
          Έλεγξε τα στοιχεία πριν στείλουμε την παραγγελία στο κατάστημα.
        </p>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <CartItemComponent key={item.name} name={item.name} />
        ))}
      </ul>

      <CartSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} compact />

      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
        <ReviewRow label="Τρόπος" value={isPickup ? "Παραλαβή από το κατάστημα" : "Παράδοση"} />
        <ReviewRow label="Τηλέφωνο" value={phone || "Δεν έχει συμπληρωθεί"} />
        {!isPickup && (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <span className="text-white/50">Διεύθυνση</span>
              <div className="min-w-0 text-right">
                <p className="text-white">
                  {deliveryAddress ? formatAddressLine(deliveryAddress) : "Δεν έχει επιλεγεί"}
                </p>
                {deliveryAddress && (
                  <>
                    <p className="text-xs text-white/45">
                      {formatAddressArea(deliveryAddress) || deliveryAddress.formattedAddress}
                    </p>
                    <p className="text-xs text-white/45">
                      Αριθμός οδού:{" "}
                      {deliveryAddress.number ||
                        (deliveryAddress.manualPinConfirmed ? "Επιβεβαιωμένη καρφίτσα" : "Λείπει")}
                    </p>
                    {deliveryAddress.floor && (
                      <p className="text-xs text-white/45">Όροφος: {deliveryAddress.floor}</p>
                    )}
                    {deliveryAddress.bell && (
                      <p className="text-xs text-white/45">Κουδούνι: {deliveryAddress.bell}</p>
                    )}
                    {preferences && (
                      <p className="text-xs text-white/45">Παράδοση: {preferences}</p>
                    )}
                    {deliveryAddress.notes && (
                      <p className="text-xs text-white/45">Οδηγίες: {deliveryAddress.notes}</p>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={onEditAddress}
                  className="mt-2 inline-flex min-h-11 items-center rounded-full px-3 text-xs font-semibold text-primary"
                >
                  Επεξεργασία
                </button>
              </div>
            </div>
          </div>
        )}
        <ReviewRow label="Πληρωμή" value={paymentLabel(payment, fulfillment)} />
      </div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/50">{label}</span>
      <span className="min-w-0 truncate text-right text-white">{value}</span>
    </div>
  );
}
