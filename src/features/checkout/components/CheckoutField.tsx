/**
 * Checkout Field component - reusable form field
 */

import React from "react";

interface CheckoutFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  type?: string;
  textarea?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  shakeOnErrorKey?: number;
}

export const CheckoutField = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  CheckoutFieldProps
>(
  (
    {
      label,
      value,
      onChange,
      placeholder,
      helperText,
      error,
      type = "text",
      textarea = false,
      onBlur,
      onFocus,
      shakeOnErrorKey = 0,
    },
    forwardedRef,
  ) => {
    const [shouldShake, setShouldShake] = React.useState(false);

    React.useEffect(() => {
      if (!error) {
        setShouldShake(false);
        return;
      }

      setShouldShake(false);
      const frame = window.requestAnimationFrame(() => setShouldShake(true));
      const timeout = window.setTimeout(() => setShouldShake(false), 320);

      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timeout);
      };
    }, [error, shakeOnErrorKey]);

    const labelClassName = `mb-1.5 block text-xs uppercase tracking-wider ${
      error ? "text-destructive-foreground" : "text-white/60"
    }`;
    const controlClassName = `w-full rounded-xl border bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 ${
      error
        ? "border-destructive focus:border-destructive focus:ring-destructive/25"
        : "border-white/15 focus:border-primary focus:ring-primary/30"
    } ${shouldShake ? "animate-checkout-shake motion-reduce:animate-none" : ""}`;

    return (
      <label className="block">
        <span className={labelClassName}>{label}</span>
        {textarea ? (
          <textarea
            ref={forwardedRef as React.ForwardedRef<HTMLTextAreaElement>}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={placeholder}
            rows={3}
            maxLength={500}
            className={controlClassName}
          />
        ) : (
          <input
            ref={forwardedRef as React.ForwardedRef<HTMLInputElement>}
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onFocus={onFocus}
            placeholder={placeholder}
            maxLength={200}
            className={controlClassName}
          />
        )}
        {error ? (
          <span className="mt-1.5 block text-xs font-medium text-destructive">{error}</span>
        ) : helperText ? (
          <span className="mt-1.5 block text-xs text-white/45">{helperText}</span>
        ) : null}
      </label>
    );
  },
);

CheckoutField.displayName = "CheckoutField";
