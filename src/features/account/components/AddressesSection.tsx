/**
 * Addresses Section component
 */

'use client';

import { useState } from 'react';
import { useAddresses } from '../hooks/useAddresses';
import { Plus, MapPin, Home, Briefcase, Trash2, Star, Loader2 } from 'lucide-react';

export function AddressesSection() {
  const { addresses, loading, error, create, remove, setDefault } = useAddresses();
  const [showForm, setShowForm] = useState(false);

  const handleDelete = async (addressId: string) => {
    if (!confirm('Είστετε σίγουροι ότι θέλετε να διαγράψετε αυτή τη διεύθυνση;')) {
      return;
    }
    await remove(addressId);
  };

  const handleSetDefault = async (addressId: string) => {
    await setDefault(addressId);
  };

  if (loading && addresses.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Διευθύνσεις</h2>
          <p className="text-sm text-white/60">Διαχειριστείτε τις αποθηκευμένες διευθύνσεις σας</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Προσθήκη
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {showForm && <AddressForm onSubmit={create} onCancel={() => setShowForm(false)} />}

      {addresses.length === 0 && !showForm && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center">
          <MapPin className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <p className="text-white/40">Δεν έχετε αποθηκευμένες διευθύνσεις</p>
        </div>
      )}

      <div className="space-y-3">
        {addresses.map((address) => (
          <div
            key={address.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {address.label === 'Home' && <Home className="h-4 w-4 text-primary" />}
                  {address.label === 'Work' && <Briefcase className="h-4 w-4 text-primary" />}
                  <span className="font-medium text-white">{address.label}</span>
                  {address.is_default && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                      <Star className="h-3 w-3 fill-current" />
                      Προεπιλογή
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/80">{address.address}</p>
                {address.notes && (
                  <p className="mt-1 text-xs text-white/50">{address.notes}</p>
                )}
              </div>
              <div className="flex gap-2">
                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="rounded-lg bg-white/10 p-2 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
                    title="Ορισμός ως προεπιλογή"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(address.id)}
                  className="rounded-lg bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
                  title="Διαγραφή"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddressForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: any) => Promise<{ success: boolean }>;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('Other');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await onSubmit({ label, address, notes, is_default: false });
    if (result.success) {
      setAddress('');
      setNotes('');
      onCancel();
    }
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">Ετικέτα</label>
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
            disabled={loading}
          >
            <option value="Home">Σπίτι</option>
            <option value="Work">Εργασία</option>
            <option value="Other">Άλλο</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">Διεύθυνση</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Οδός, αριθμός, πόλη"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-white/80">Σημειώσεις (προαιρετικό)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Διακοπή, όροφος, κωδικός εισόδου..."
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 resize-none"
            disabled={loading}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Αποθήκευση...
              </span>
            ) : (
              'Αποθήκευση'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ακύρωση
          </button>
        </div>
      </form>
    </div>
  );
}
