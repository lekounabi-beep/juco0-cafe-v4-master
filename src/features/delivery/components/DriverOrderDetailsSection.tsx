/**

 * Shared delivery order details — used in active delivery and available order cards.

 */



import { MapPin, Phone, User } from "lucide-react";

import {

  Accordion,

  AccordionContent,

  AccordionItem,

  AccordionTrigger,

} from "@/components/ui/accordion";

import type { DriverOrderDetails } from "../types/driver-order.types";

import {

  buildTelHref,

  formatDriverDateTime,

  formatDriverDeliveryStage,

  formatDriverOrderStatus,

  formatDriverPaymentMethod,

} from "../utils/driver-order-display";



interface DriverOrderDetailsSectionProps {

  order: Partial<DriverOrderDetails> & Pick<DriverOrderDetails, "order_number" | "total" | "address" | "created_at">;

  deliveryStage?: string | null;

  compact?: boolean;

  accordion?: boolean;

  navigationEta?: string | null;

  hideAddressEta?: boolean;

}



function DetailRow({

  label,

  value,

  valueClassName = "text-white/90 text-right max-w-[60%]",

}: {

  label: string;

  value: React.ReactNode;

  valueClassName?: string;

}) {

  return (

    <div className="flex justify-between gap-3 text-sm">

      <span className="text-white/80 shrink-0">{label}</span>

      <span className={valueClassName}>{value}</span>

    </div>

  );

}



function splitAddressNotes(notes: string): string[] {

  return notes

    .split(/\s*·\s*/)

    .map((part) => part.trim())

    .filter(Boolean);

}



function AddressNotesBlock({ notes }: { notes: string }) {

  const lines = splitAddressNotes(notes);



  return (

    <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-3">

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">

        Σημειώσεις διεύθυνσης

      </p>

      <ul className="space-y-2">

        {lines.map((line, index) => (

          <li key={`${line}-${index}`} className="flex gap-2.5 text-sm leading-relaxed text-white/95">

            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/45" aria-hidden />

            <span className="min-w-0 flex-1 break-words">{line}</span>

          </li>

        ))}

      </ul>

    </div>

  );

}



function ExpandedOrderDetails({

  order,

  deliveryStage,

  compact,

}: {

  order: DriverOrderDetailsSectionProps["order"];

  deliveryStage?: string | null;

  compact?: boolean;

}) {

  const items = Array.isArray(order.items) ? order.items : [];



  return (

    <div className="space-y-3">

      <DetailRow label="Αριθμός" value={`#${order.order_number}`} valueClassName="text-white font-semibold" />



      <DetailRow label="Ώρα παραγγελίας" value={formatDriverDateTime(order.created_at)} />



      <DetailRow

        label="Κατάσταση κουζίνας"

        value={formatDriverOrderStatus(order.status)}

      />



      {deliveryStage && (

        <DetailRow

          label="Κατάσταση διανομής"

          value={formatDriverDeliveryStage(deliveryStage)}

        />

      )}



      {!deliveryStage && order.delivery_status && (

        <DetailRow

          label="Κατάσταση διανομής"

          value={formatDriverOrderStatus(order.delivery_status)}

        />

      )}



      {order.estimated_delivery_eta && (

        <DetailRow

          label="Εκτιμώμενη παράδοση"

          value={formatDriverDateTime(order.estimated_delivery_eta)}

        />

      )}



      <DetailRow

        label="Πελάτης"

        value={

          <span className="inline-flex items-center gap-1 justify-end">

            <User className="h-3.5 w-3.5 text-white/50" />

            {order.customer_name ?? "—"}

          </span>

        }

      />



      {order.address_notes && <AddressNotesBlock notes={order.address_notes} />}



      {order.notes && (

        <DetailRow

          label="Οδηγίες"

          value={order.notes}

          valueClassName="text-white/75 text-right max-w-[65%] text-xs"

        />

      )}



      <div className="text-sm">

        <span className="text-white/80">Προϊόντα</span>

        <ul className="mt-1.5 space-y-1 rounded-xl bg-black/20 px-3 py-2">

          {items.length === 0 ? (

            <li className="text-white/50 text-xs">—</li>

          ) : (

            items.map((item, index) => (

              <li key={`${item.name}-${index}`} className="flex justify-between text-white/90 text-xs">

                <span>

                  {item.qty}x {item.name}

                </span>

                {item.price != null && (

                  <span className="text-white/60">{(item.qty * item.price).toFixed(2)}€</span>

                )}

              </li>

            ))

          )}

        </ul>

      </div>



      <DetailRow

        label="Σύνολο"

        value={`${Number(order.total).toFixed(2)}€`}

        valueClassName="text-white font-semibold"

      />

    </div>

  );

}



export function DriverOrderDetailsSection({

  order,

  deliveryStage,

  compact = false,

  accordion = false,
  navigationEta,
  hideAddressEta = false,
}: DriverOrderDetailsSectionProps) {

  const telHref = buildTelHref(order.customer_phone);

  const etaValue =

    navigationEta ??

    (order.estimated_delivery_eta ? formatDriverDateTime(order.estimated_delivery_eta) : "—");



  if (accordion) {

    return (

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">

        <div className="space-y-3">

          {!hideAddressEta && (
            <>
              <DetailRow
                label="Διεύθυνση"
                value={
                  <span className="inline-flex items-start gap-1 justify-end text-right">
                    <MapPin className="h-3.5 w-3.5 text-white/50 mt-0.5 shrink-0" />
                    {order.address}
                  </span>
                }
                valueClassName="text-white/90 text-right max-w-[65%]"
              />

              <DetailRow label="Εκτιμώμενος χρόνος" value={etaValue} valueClassName="text-white font-medium" />
            </>
          )}



          <DetailRow

            label="Πληρωμή"

            value={formatDriverPaymentMethod(order.payment_method)}

            valueClassName="text-white font-medium"

          />



          <DetailRow

            label="Τηλέφωνο"

            value={

              telHref ? (

                <a

                  href={telHref}

                  className="inline-flex items-center gap-1 text-sky-300/90 hover:text-sky-200 hover:underline justify-end"

                >

                  <Phone className="h-3.5 w-3.5" />

                  {order.customer_phone}

                </a>

              ) : (

                order.customer_phone || "—"

              )

            }

          />

        </div>



        <Accordion type="single" collapsible className="mt-2 border-t border-white/10">

          <AccordionItem value="details" className="border-none">

            <AccordionTrigger className="py-3 text-sm font-semibold text-white hover:no-underline">

              Λεπτομέρειες

            </AccordionTrigger>

            <AccordionContent>

              <ExpandedOrderDetails order={order} deliveryStage={deliveryStage} compact={compact} />

            </AccordionContent>

          </AccordionItem>

        </Accordion>

      </div>

    );

  }



  if (compact) {

    return (

      <div className="space-y-2">

        <DetailRow label="Αριθμός" value={`#${order.order_number}`} valueClassName="text-white font-semibold" />

        <DetailRow

          label="Διεύθυνση"

          value={order.address}

          valueClassName="text-white/90 text-right max-w-[65%] text-xs"

        />

        <DetailRow

          label="Πληρωμή"

          value={formatDriverPaymentMethod(order.payment_method)}

          valueClassName="text-white font-medium"

        />

        <DetailRow

          label="Σύνολο"

          value={`${Number(order.total).toFixed(2)}€`}

          valueClassName="text-white font-semibold"

        />

      </div>

    );

  }



  return (

    <ExpandedOrderDetails order={order} deliveryStage={deliveryStage} compact={compact} />

  );

}

