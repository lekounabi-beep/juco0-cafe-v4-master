/**
 * Profile Section component
 */

'use client';

import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { Loader2, Check } from 'lucide-react';

export function ProfileSection() {
  const { profile, loading, error, update } = useProfile();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);

    const result = await update({
      full_name: fullName || undefined,
      phone: phone || undefined,
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setSaving(false);
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Προφίλ</h2>
        <p className="text-sm text-white/60">Διαχειριστείτε τις πληροφορίες του προφίλ σας</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/80">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={profile?.email || ''}
            disabled
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/50 cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-white/80">
            Ονοματεπώνυμο
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Γιώργος Παπαδόπουλος"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
            disabled={saving}
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-white/80">
            Τηλέφωνο
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="69XXXXXXXX"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
            disabled={saving}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/20 px-4 py-3 text-sm text-green-200">
            <Check className="h-4 w-4" />
            Αποθηκεύτηκε επιτυχώς
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Αποθήκευση...
            </span>
          ) : (
            'Αποθήκευση'
          )}
        </button>
      </div>
    </div>
  );
}
