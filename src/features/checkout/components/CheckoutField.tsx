/**
 * Checkout Field component - reusable form field
 */

import React from 'react';

interface CheckoutFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}

export const CheckoutField = React.forwardRef<HTMLInputElement, CheckoutFieldProps>(
  ({ label, value, onChange, placeholder, type = "text", textarea = false }, forwardedRef) => {
    return (
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-white/60">{label}</span>
        {textarea ? (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        ) : (
          <input
            ref={textarea ? undefined : forwardedRef}
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={200}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        )}
      </label>
    );
  }
);

CheckoutField.displayName = 'CheckoutField';
