/**
 * Favorite Section component
 */

'use client';

import { useState } from 'react';
import { useFavoriteOrder } from '../hooks/useFavoriteOrder';
import { Heart, Trash2, Loader2, ShoppingBag } from 'lucide-react';
import { formatEur } from '@/shared/utils/currency';

export function FavoriteSection() {
  const { favorite, loading, error, remove, loadToCart } = useFavoriteOrder();
  const [loadingCart, setLoadingCart] = useState(false);

  const handleLoadToCart = async () => {
    setLoadingCart(true);
    const result = await loadToCart();
    if (result.success) {
      // Redirect to checkout
      window.location.href = '/checkout';
    }
    setLoadingCart(false);
  };

  const handleRemove = async () => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε το αγαπημένο παραγγελία;')) {
      return;
    }
    await remove();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Αγαπημένη Παραγγελία</h2>
        <p className="text-sm text-white/60">Η αγαπημένη σας παραγγελία για γρήγορη παραγγελία</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!favorite ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center">
          <Heart className="mx-auto mb-4 h-12 w-12 text-white/20" />
          <p className="text-white/40">Δεν έχετε αποθηκευμένη αγαπημένη παραγγελία</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-primary fill-current" />
              <span className="font-medium text-white">Αγαπημένη Παραγγελία</span>
            </div>
            <p className="text-xs text-white/50">
              {favorite.length} προϊόν
              {favorite.length === 1 ? '' : 'τα'}
            </p>
          </div>

          <div className="mb-4">
            <p className="text-sm text-white/80 line-clamp-3">
              {favorite.map((item) => `${item.qty}x ${item.name}`).join(', ')}
            </p>
            <p className="mt-2 font-semibold text-white">
              {formatEur(favorite.reduce((sum, item) => sum + item.qty * item.price, 0))}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLoadToCart}
              disabled={loadingCart}
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingCart ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
              <span>Παραγγελία Τώρα</span>
            </button>
            <button
              onClick={handleRemove}
              disabled={loading}
              className="rounded-full bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              title="Διαγραφή"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
