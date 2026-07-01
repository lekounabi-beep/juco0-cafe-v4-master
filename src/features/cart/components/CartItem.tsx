/**
 * Cart Item component
 */

import Image from 'next/image';
import { ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import { useCartItem } from '@/lib/cart-store';
import { productImages } from '@/data/productImages';
import { formatEur } from '@/shared/utils/currency';

interface CartItemProps {
  name: string;
}

export function CartItemComponent({ name }: CartItemProps) {
  const { item, setQty, remove } = useCartItem(name);

  if (!item) return null;

  const productImage = productImages[item.name] || item.image;

  return (
    <li className="flex items-center gap-3 rounded-2xl glass p-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10">
        {productImage ? (
          <Image 
            src={productImage} 
            alt={item.name} 
            width={128} 
            height={128} 
            className="h-full w-full object-cover" 
            quality={90} 
          />
        ) : (
          <ShoppingBag className="h-5 w-5 text-white/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{item.name}</p>
        <p className="text-xs text-white/60">{formatEur(item.price)}</p>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
        <button 
          onClick={() => setQty(item.qty - 1)} 
          className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" 
          aria-label="Μείωση"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-6 text-center text-sm font-semibold text-white">{item.qty}</span>
        <button 
          onClick={() => setQty(item.qty + 1)} 
          className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground" 
          aria-label="Προσθήκη"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <button 
        onClick={remove} 
        className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:text-destructive" 
        aria-label="Αφαίρεση"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
