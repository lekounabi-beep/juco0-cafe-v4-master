"use client";

import { Loader2, MapPin, Search, X } from "lucide-react";
import type { AddressSearchResult } from "../types/address";

type AddressAutocompleteProps = {
  query: string;
  onQueryChange: (query: string) => void;
  results: AddressSearchResult[];
  loading: boolean;
  error: string | null;
  onSelect: (address: AddressSearchResult) => void;
  onInputFocus?: () => void;
  dropdownOpen?: boolean;
  mobile?: boolean;
};

export function AddressAutocomplete({
  query,
  onQueryChange,
  results,
  loading,
  error,
  onSelect,
  onInputFocus,
  dropdownOpen = false,
  mobile = false,
}: AddressAutocompleteProps) {
  const normalizedLength = query.trim().length;
  const shouldPromptMinChars = normalizedLength > 0 && normalizedLength < 3;
  const showEmpty = normalizedLength >= 3 && !loading && !error && results.length === 0;
  const shouldRenderDropdown =
    dropdownOpen && (results.length > 0 || showEmpty || error || shouldPromptMinChars || loading);

  return (
    <div className="space-y-2">
      <div className="relative rounded-[1.4rem] border border-white/10 bg-black/60 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-200 focus-within:border-primary/40 focus-within:shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={onInputFocus}
          placeholder="Γράψε διεύθυνση..."
          aria-label="Αναζήτηση διεύθυνσης"
          className="h-14 w-full rounded-[1.4rem] bg-transparent py-3 pl-11 pr-20 text-base text-white outline-none placeholder:text-white/40"
          autoComplete="off"
          inputMode="text"
        />
        {query.trim().length > 0 && !loading ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Καθαρισμός αναζήτησης"
            className="absolute right-12 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-primary" />
        )}
      </div>

      {shouldRenderDropdown && (
        <div
          className={`max-h-[min(34vh,280px)] overflow-y-auto rounded-[1.4rem] border border-white/10 bg-black/80 p-2 shadow-[0_20px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl lg:max-h-[42vh] ${
            mobile ? "absolute left-0 right-0 top-full mt-2 z-40" : ""
          }`}
        >
          {shouldPromptMinChars && (
            <div className="px-3 py-4 text-sm text-white/55">
              Πληκτρολόγησε τουλάχιστον 3 χαρακτήρες.
            </div>
          )}

          {loading && results.length === 0 && (
            <div className="space-y-2 px-1 py-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-11 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-3"
                >
                  <div className="h-3 w-32 rounded bg-white/10" />
                  <div className="mt-2 h-2.5 w-44 rounded bg-white/5" />
                </div>
              ))}
            </div>
          )}

          {results.slice(0, 5).map((result) => (
            <button
              key={result.placeId}
              type="button"
              onClick={() => onSelect(result)}
              className="flex min-h-12 w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition duration-150 hover:bg-white/10 active:scale-[0.99] active:bg-white/15"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {result.label}
                </span>
                <span className="mt-0.5 block truncate text-xs text-white/55">
                  {result.description}
                </span>
              </span>
            </button>
          ))}

          {showEmpty && (
            <div className="px-3 py-4 text-sm text-white/55">
              Δεν βρέθηκε διεύθυνση. Δοκίμασε με οδό και αριθμό.
            </div>
          )}

          {error && <div className="px-3 py-4 text-sm text-red-300">{error}</div>}
        </div>
      )}
    </div>
  );
}
