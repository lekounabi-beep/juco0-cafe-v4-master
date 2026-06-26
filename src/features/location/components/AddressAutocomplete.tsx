"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import type { AddressSearchResult } from "../types/address";

type AddressAutocompleteProps = {
  query: string;
  onQueryChange: (query: string) => void;
  results: AddressSearchResult[];
  loading: boolean;
  error: string | null;
  onSelect: (address: AddressSearchResult) => void;
};

export function AddressAutocomplete({
  query,
  onQueryChange,
  results,
  loading,
  error,
  onSelect,
}: AddressAutocompleteProps) {
  const showEmpty = query.trim().length >= 2 && !loading && !error && results.length === 0;

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl border border-white/10 bg-black/35 shadow-lg backdrop-blur-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Γράψε διεύθυνση..."
          className="h-12 w-full rounded-2xl bg-transparent py-3 pl-10 pr-4 text-base text-white outline-none placeholder:text-white/40"
          autoComplete="off"
          inputMode="text"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-primary" />
        )}
      </div>

      {(results.length > 0 || showEmpty || error) && (
        <div className="max-h-[min(34vh,260px)] overflow-y-auto rounded-2xl border border-white/10 bg-black/35 p-1.5 shadow-lg backdrop-blur-md lg:max-h-[42vh]">
          {results.slice(0, 5).map((result) => (
            <button
              key={result.placeId}
              type="button"
              onClick={() => onSelect(result)}
              className="flex min-h-11 w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-white/10 active:bg-white/15"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {result.label}
                </span>
                <span className="block truncate text-xs text-white/55">{result.description}</span>
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
