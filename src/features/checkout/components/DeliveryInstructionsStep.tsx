import { CheckoutField } from "./CheckoutField";
import { useCheckoutForm } from "../hooks/useCheckoutForm";

const QUICK_INSTRUCTIONS = [
  "Καλέστε με",
  "Αφήστε στην πόρτα",
  "Πλαϊνή είσοδος",
  "Δεν λειτουργεί το κουδούνι",
];

export function DeliveryInstructionsStep() {
  const { floor, setFloor, bell, setBell, deliveryInstructions, setDeliveryInstructions } =
    useCheckoutForm();

  const addInstruction = (instruction: string) => {
    const current = deliveryInstructions.trim();
    if (current.toLowerCase().includes(instruction.toLowerCase())) return;
    setDeliveryInstructions(current ? `${current}, ${instruction}` : instruction);
  };

  return (
    <section className="space-y-3 rounded-3xl glass p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-white/50">Βήμα 4</p>
        <h2 className="text-lg font-semibold text-white">Οδηγίες παράδοσης</h2>
        <p className="mt-1 text-sm text-white/55">Βοήθησε τον διανομέα να σε βρει γρήγορα.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CheckoutField label="Όροφος" value={floor} onChange={setFloor} placeholder="Π.χ. 3ος" />
        <CheckoutField
          label="Κουδούνι"
          value={bell}
          onChange={setBell}
          placeholder="Π.χ. Παπαδόπουλος"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_INSTRUCTIONS.map((instruction) => (
          <button
            key={instruction}
            type="button"
            onClick={() => addInstruction(instruction)}
            className="min-h-11 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
          >
            {instruction}
          </button>
        ))}
      </div>

      <CheckoutField
        label="Οδηγίες για τον διανομέα"
        value={deliveryInstructions}
        onChange={setDeliveryInstructions}
        placeholder="Π.χ. είσοδος από την πλαϊνή πόρτα"
        textarea
      />
    </section>
  );
}
