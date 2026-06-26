/**
 * Order Card component
 */

'use client';

import { Order } from '../types/account.types';
import { formatEur } from '@/shared/utils/currency';
import { Clock, Package, CreditCard, Wallet, RotateCcw, Loader2 } from 'lucide-react';
import { useReorder } from '../hooks/useReorder';

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const { reorder, loading } = useReorder();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-200';
      case 'accepted':
      case 'preparing':
        return 'bg-blue-500/20 text-blue-200';
      case 'ready':
        return 'bg-green-500/20 text-green-200';
      case 'delivered':
        return 'bg-gray-500/20 text-gray-200';
      default:
        return 'bg-gray-500/20 text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Εκκρεμεί';
      case 'accepted':
      case 'preparing':
        return 'Ετοιμάζεται';
      case 'ready':
        return 'Έτοιμο';
      case 'delivered':
        return 'Παραδόθηκε';
      default:
        return status;
    }
  };

  const handleReorder = () => {
    reorder(order);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">#{order.order_number}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </span>
          </div>
          <p className="text-xs text-white/50">{formatDate(order.created_at)}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-white">{formatEur(order.total)}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
          <Package className="h-3 w-3" />
          <span>
            {order.items.length} προϊόν
            {order.items.length === 1 ? '' : 'τα'}
          </span>
        </div>
        <p className="text-xs text-white/40 line-clamp-2">
          {order.items.map((item) => `${item.qty}x ${item.name}`).join(', ')}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-white/50">
          <div className="flex items-center gap-1">
            {order.payment_method === 'card' ? (
              <CreditCard className="h-3 w-3" />
            ) : (
              <Wallet className="h-3 w-3" />
            )}
            <span>{order.payment_method === 'card' ? 'Κάρτα' : 'Μετρητά'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDate(order.created_at)}</span>
          </div>
        </div>
        <button
          onClick={handleReorder}
          disabled={loading}
          className="flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
          <span>Ξαναπαραγγελία</span>
        </button>
      </div>
    </div>
  );
}
