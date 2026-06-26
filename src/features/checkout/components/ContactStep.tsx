import { CheckoutField } from "./CheckoutField";
import { useCheckoutForm } from "../hooks/useCheckoutForm";
import { isGreekLandline } from "@/shared/utils/validation";
import { useEffect, useState } from "react";
import type { RefObject } from "react";

type ContactStepProps = {
  errors: Record<string, string>;
  showErrors: boolean;
  validationAttempt: number;
  phoneRef?: RefObject<HTMLInputElement | null>;
  nameRef?: RefObject<HTMLInputElement | null>;
};

export function ContactStep({
  errors,
  showErrors,
  validationAttempt,
  phoneRef,
  nameRef,
}: ContactStepProps) {
  const { phone, setPhone, name, setName } = useCheckoutForm();
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [phoneEditedWhileFocused, setPhoneEditedWhileFocused] = useState(false);
  const hidePhoneErrorWhileTyping = phoneFocused && phoneEditedWhileFocused;
  const phoneError =
    !hidePhoneErrorWhileTyping && (showErrors || phoneTouched) ? errors.phone : undefined;
  const phoneHelperText = phoneFocused
    ? "Κινητό ή σταθερό τηλέφωνο"
    : isGreekLandline(phone)
      ? "Για ταχύτερη επικοινωνία με τον διανομέα προτιμάται κινητό τηλέφωνο."
      : "Θα επικοινωνήσουμε μόνο αν υπάρξει θέμα με την παραγγελία.";

  useEffect(() => {
    setPhoneEditedWhileFocused(false);
  }, [validationAttempt]);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (phoneFocused) {
      setPhoneEditedWhileFocused(true);
    }
  };

  return (
    <section className="space-y-3 rounded-3xl glass p-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-white/50">Βήμα 2</p>
        <h2 className="text-lg font-semibold text-white">Στοιχεία επικοινωνίας</h2>
      </div>

      <CheckoutField
        ref={phoneRef}
        label="Τηλέφωνο επικοινωνίας *"
        value={phone}
        onChange={handlePhoneChange}
        onBlur={() => {
          setPhoneTouched(true);
          setPhoneFocused(false);
          setPhoneEditedWhileFocused(false);
        }}
        onFocus={() => {
          setPhoneFocused(true);
          setPhoneEditedWhileFocused(false);
        }}
        placeholder="69XXXXXXXX ή 27210XXXXX"
        helperText={phoneHelperText}
        error={phoneError}
        shakeOnErrorKey={validationAttempt}
        type="tel"
      />

      <CheckoutField
        ref={nameRef}
        label="Ονοματεπώνυμο"
        value={name}
        onChange={setName}
        placeholder="Π.χ. Γιώργος Παπαδόπουλος"
        error={showErrors ? errors.name : undefined}
      />
    </section>
  );
}
