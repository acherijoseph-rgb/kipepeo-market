import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock, Package, Search, Truck, XCircle } from 'lucide-react';
import { formatKES, type Order, type OrderStatus } from '../types';
import { ProductImage } from './ProductImage';

interface OrderTrackingViewProps {
  initialOrderNumber?: string | null;
  customerOrders?: Order[];
}

const MILESTONES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Packed',
  'Out for Delivery',
  'Delivered',
];

export function OrderTrackingView({
  initialOrderNumber,
  customerOrders = [],
}: OrderTrackingViewProps) {
  const [orderNumberInput, setOrderNumberInput] = useState(initialOrderNumber || 'KM-1042');
  const [contactInput, setContactInput] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrder = async (targetNumber: string, contact = '') => {
    const trimmed = targetNumber.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams({ orderNumber: trimmed });
      if (contact.trim()) params.set('contact', contact.trim());
      const res = await fetch(`/api/orders/track?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setOrder(null);
        setErrorMsg(data.error || 'Could not locate that order.');
        return;
      }
      setOrder(data.order);
    } catch {
      setErrorMsg('Unable to check order status right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder(initialOrderNumber || 'KM-1042');
  }, [initialOrderNumber]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchOrder(orderNumberInput, contactInput);
  };

  const currentStageIndex = order ? MILESTONES.indexOf(order.status) : -1;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 sm:p-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#18181B]">
          Track Your Order
        </h1>
        <p className="text-sm text-[#52525B] mt-1 mb-6">
          Enter your Kipepeo Market order number to inspect live packing, courier dispatch, and payment verification.
        </p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search
              className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              required
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              placeholder="Order # (e.g. KM-1042)"
              aria-label="Order number"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm font-mono uppercase focus:outline-none focus:border-[#065F46]"
            />
          </div>

          <div className="sm:col-span-4">
            <input
              type="text"
              value={contactInput}
              onChange={(e) => setContactInput(e.target.value)}
              placeholder="Email or phone (optional)"
              aria-label="Contact verification"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-3 py-2.5 px-4 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Track Order'}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#71717A]">
          <span>Sample orders:</span>
          <button
            type="button"
            onClick={() => {
              setOrderNumberInput('KM-1042');
              setContactInput('');
              fetchOrder('KM-1042');
            }}
            className="font-mono text-[#065F46] hover:underline cursor-pointer"
          >
            KM-1042 (In Transit)
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => {
              setOrderNumberInput('KM-1041');
              setContactInput('');
              fetchOrder('KM-1041');
            }}
            className="font-mono text-[#065F46] hover:underline cursor-pointer"
          >
            KM-1041 (Delivered)
          </button>
        </div>

        {customerOrders.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[#E4E4E7]">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#52525B] mb-2">
              Your Recent Orders
            </p>
            <div className="flex flex-wrap gap-2">
              {customerOrders.map((o) => (
                <button
                  key={o.orderNumber}
                  type="button"
                  onClick={() => {
                    setOrderNumberInput(o.orderNumber);
                    fetchOrder(o.orderNumber);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] text-xs font-mono font-medium text-[#18181B] hover:border-[#065F46] cursor-pointer"
                >
                  {o.orderNumber} · {o.status}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-white border border-[#B91C1C]/30 rounded-2xl p-6 text-sm text-[#B91C1C]">
          {errorMsg}
        </div>
      )}

      {order && (
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 sm:p-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4E4E7]">
            <div>
              <p className="text-xs font-mono text-[#71717A]">
                Placed {new Date(order.createdAt).toLocaleString()}
              </p>
              <h2 className="font-display text-2xl font-bold text-[#18181B] mt-1">
                Order {order.orderNumber}
              </h2>
              <p className="text-sm text-[#52525B] mt-1">
                Delivering to {order.customerName} · {order.shippingCity}, {order.shippingAddress}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${
                  order.status === 'Delivered'
                    ? 'bg-[#15803D]/10 text-[#15803D]'
                    : order.status === 'Cancelled'
                    ? 'bg-[#B91C1C]/10 text-[#B91C1C]'
                    : 'bg-[#B45309]/10 text-[#B45309]'
                }`}
              >
                {order.status === 'Delivered' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : order.status === 'Cancelled' ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <Truck className="w-3.5 h-3.5" />
                )}
                <span>{order.status}</span>
              </span>
              <p className="text-xs font-mono text-[#71717A] mt-2">
                {order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Card'} Ref: {order.paymentReference}
              </p>
            </div>
          </div>

          {/* Progress Stepper */}
          {order.status !== 'Cancelled' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {MILESTONES.map((step, idx) => {
                const completed = currentStageIndex >= idx;
                return (
                  <div
                    key={step}
                    className={`p-3 rounded-xl border ${
                      completed
                        ? 'border-[#065F46]/40 bg-[#065F46]/5'
                        : 'border-[#E4E4E7] bg-[#FAFAF9]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#065F46] shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                      )}
                      <span
                        className={`text-xs font-semibold ${
                          completed ? 'text-[#18181B]' : 'text-[#71717A]'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Timeline + Items */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#52525B]">
                Shipment Activity
              </h3>
              <div className="space-y-4">
                {[...order.timeline].reverse().map((event, i) => (
                  <div
                    key={`${event.timestamp}-${i}`}
                    className="flex items-start gap-3 pb-4 border-b border-[#F4F4F5] last:border-b-0"
                  >
                    <Package className="w-4 h-4 text-[#065F46] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#18181B]">{event.status}</p>
                      <p className="text-sm text-[#52525B]">{event.note}</p>
                      <p className="text-xs font-mono text-[#71717A] mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#52525B]">
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variant}`}
                    className="flex items-center justify-between gap-3 py-2 border-b border-[#F4F4F5]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F4F4F5] border border-[#E4E4E7] shrink-0">
                        <ProductImage src={item.imageUrl} alt={item.name} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#18181B] truncate">{item.name}</p>
                        <p className="text-xs text-[#71717A]">
                          {item.variant} · Qty {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#18181B] tabular-nums shrink-0">
                      {formatKES(item.unitPriceKes * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-1.5 text-sm">
                <div className="flex justify-between text-[#52525B]">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatKES(order.subtotalKes)}</span>
                </div>
                <div className="flex justify-between text-[#52525B]">
                  <span>Delivery</span>
                  <span className="tabular-nums">
                    {order.deliveryFeeKes === 0 ? 'Complimentary' : formatKES(order.deliveryFeeKes)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-[#18181B] pt-2 border-t border-[#E4E4E7]">
                  <span>Total Paid</span>
                  <span className="tabular-nums">{formatKES(order.totalKes)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
