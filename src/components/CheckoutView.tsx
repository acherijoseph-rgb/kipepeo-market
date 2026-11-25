import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  Smartphone,
} from 'lucide-react';
import {
  FREE_DELIVERY_THRESHOLD_KES,
  STANDARD_DELIVERY_FEE_KES,
  formatKES,
  type CartItem,
  type CustomerPublic,
  type Order,
  type PaymentConfigStatus,
  type PaymentMethod,
  type Product,
} from '../types';
import { ProductImage } from './ProductImage';

interface CheckoutViewProps {
  items: CartItem[];
  products: Product[];
  customer: CustomerPublic | null;
  customerToken: string | null;
  onBackToShop: () => void;
  onOrderSuccess: (order: Order) => void;
  onTrackOrder: (orderNumber: string) => void;
}

export function CheckoutView({
  items,
  products,
  customer,
  customerToken,
  onBackToShop,
  onOrderSuccess,
  onTrackOrder,
}: CheckoutViewProps) {
  const [customerName, setCustomerName] = useState(customer?.name || '');
  const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || '');
  const [shippingCity, setShippingCity] = useState(customer?.city || 'Nairobi — Westlands');
  const [shippingAddress, setShippingAddress] = useState(customer?.address || '');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState(customer?.phone || '');
  const [cardHolder, setCardHolder] = useState(customer?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [paymentStatus, setPaymentStatus] = useState<PaymentConfigStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [pendingStk, setPendingStk] = useState<{
    checkoutRequestId: string;
    phone: string;
    amountKes: number;
    message: string;
    liveStkInitiated: boolean;
  } | null>(null);

  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetch('/api/payments/status')
      .then((r) => r.json())
      .then((data: PaymentConfigStatus) => setPaymentStatus(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (customer) {
      if (!customerName) setCustomerName(customer.name);
      if (!customerEmail) setCustomerEmail(customer.email);
      if (!customerPhone) setCustomerPhone(customer.phone);
      if (!mpesaPhone) setMpesaPhone(customer.phone);
      if (!shippingCity) setShippingCity(customer.city);
      if (!shippingAddress) setShippingAddress(customer.address);
      if (!cardHolder) setCardHolder(customer.name);
    }
  }, [customer]);

  const resolvedItems = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return { ...item, product };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const subtotalKes = resolvedItems.reduce(
    (sum, entry) => sum + entry.product.priceKes * entry.quantity,
    0
  );
  const deliveryFeeKes =
    resolvedItems.length === 0 || subtotalKes >= FREE_DELIVERY_THRESHOLD_KES
      ? 0
      : STANDARD_DELIVERY_FEE_KES;
  const totalKes = subtotalKes + deliveryFeeKes;

  const formatCardInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiryInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customerToken) {
      headers.Authorization = `Bearer ${customerToken}`;
    }

    try {
      if (paymentMethod === 'mpesa') {
        const res = await fetch('/api/checkout/mpesa-stk', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            customerName,
            customerEmail,
            customerPhone,
            shippingCity,
            shippingAddress,
            mpesaPhone: mpesaPhone || customerPhone,
            items,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'Could not initiate M-Pesa STK Push.');
          return;
        }
        setPendingStk(data);
      } else {
        const res = await fetch('/api/checkout/card', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            customerName,
            customerEmail,
            customerPhone,
            shippingCity,
            shippingAddress,
            cardHolder,
            cardNumber,
            expiry: cardExpiry,
            cvv: cardCvv,
            items,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'Card payment failed. Please verify your details.');
          return;
        }
        setConfirmedOrder(data.order);
        onOrderSuccess(data.order);
      }
    } catch {
      setErrorMsg('Network error while connecting to checkout service.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmStk = async (outcome: 'confirm' | 'cancel') => {
    if (!pendingStk) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout/mpesa-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutRequestId: pendingStk.checkoutRequestId,
          simulateOutcome: outcome,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'M-Pesa payment was not completed.');
        setPendingStk(null);
        return;
      }
      setPendingStk(null);
      setConfirmedOrder(data.order);
      onOrderSuccess(data.order);
    } catch {
      setErrorMsg('Network error confirming M-Pesa transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#065F46]/10 text-[#065F46] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#065F46]">
                Payment Confirmed
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#18181B] mt-1">
                Order {confirmedOrder.orderNumber} Confirmed — Preparing Shipment
              </h1>
              <p className="text-sm text-[#52525B] mt-2">
                A confirmation summary has been recorded for {confirmedOrder.customerEmail}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 border-y border-[#E4E4E7] text-sm">
            <div>
              <span className="block text-xs text-[#71717A]">Payment Method</span>
              <span className="font-semibold text-[#18181B]">
                {confirmedOrder.paymentMethod === 'mpesa'
                  ? 'M-Pesa STK Push'
                  : `Card ending ${confirmedOrder.cardLast4 || '••••'}`}
              </span>
            </div>
            <div>
              <span className="block text-xs text-[#71717A]">Transaction Reference</span>
              <span className="font-mono font-semibold text-[#18181B]">
                {confirmedOrder.paymentReference}
              </span>
            </div>
            <div>
              <span className="block text-xs text-[#71717A]">Total Paid</span>
              <span className="font-bold text-[#18181B] tabular-nums">
                {formatKES(confirmedOrder.totalKes)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#18181B]">Items Ordered</h2>
            {confirmedOrder.items.map((item) => (
              <div
                key={`${item.productId}-${item.variant}`}
                className="flex items-center justify-between gap-4 text-sm py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F4F4F5] border border-[#E4E4E7] shrink-0">
                    <ProductImage src={item.imageUrl} alt={item.name} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#18181B] truncate">{item.name}</p>
                    <p className="text-xs text-[#71717A]">
                      {item.variant} · Qty {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-[#18181B] tabular-nums shrink-0">
                  {formatKES(item.unitPriceKes * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onTrackOrder(confirmedOrder.orderNumber)}
              className="px-5 py-2.5 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] transition-colors cursor-pointer"
            >
              Track This Order
            </button>
            <button
              type="button"
              onClick={onBackToShop}
              className="px-5 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm font-medium text-[#18181B] hover:bg-[#F4F4F5] transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (resolvedItems.length === 0) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-10">
          <h1 className="font-display text-2xl font-bold text-[#18181B]">Your bag is empty</h1>
          <p className="text-sm text-[#52525B] mt-2 mb-6">
            Add products from the Kipepeo Market catalogue before proceeding to checkout.
          </p>
          <button
            type="button"
            onClick={onBackToShop}
            className="px-5 py-2.5 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] transition-colors cursor-pointer"
          >
            Return to Storefront
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={onBackToShop}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#52525B] hover:text-[#18181B] mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Storefront</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Shipping & Payment Form */}
        <form
          onSubmit={handleCheckoutSubmit}
          className="lg:col-span-7 bg-white border border-[#E4E4E7] rounded-2xl p-6 sm:p-8 space-y-8"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-[#18181B]">Checkout</h1>
            <p className="text-sm text-[#52525B] mt-1">
              Complete delivery details and select M-Pesa or Card payment.
            </p>
          </div>

          {errorMsg && (
            <div
              className="p-4 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/5 text-sm text-[#B91C1C]"
              role="alert"
            >
              {errorMsg}
            </div>
          )}

          {/* Delivery Details */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#52525B]">
              1. Delivery Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Amina Kamau"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="amina@example.co.ke"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                  City / Delivery Zone
                </label>
                <select
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm bg-white focus:outline-none focus:border-[#065F46]"
                >
                  <option value="Nairobi — Westlands">Nairobi — Westlands</option>
                  <option value="Nairobi — Kilimani">Nairobi — Kilimani</option>
                  <option value="Nairobi — CBD / Upper Hill">Nairobi — CBD / Upper Hill</option>
                  <option value="Nairobi — Karen / Langata">Nairobi — Karen / Langata</option>
                  <option value="Mombasa">Mombasa</option>
                  <option value="Kisumu">Kisumu</option>
                  <option value="Nakuru">Nakuru</option>
                  <option value="Eldoret">Eldoret</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                Street Address, Building & Landmark
              </label>
              <input
                type="text"
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Riverside Drive, Block C, Suite 12"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4 pt-6 border-t border-[#E4E4E7]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#52525B]">
                2. Payment Method
              </h2>
              {paymentStatus && (
                <span className="text-xs text-[#71717A]">{paymentStatus.modeLabel}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('mpesa');
                  setPendingStk(null);
                  setErrorMsg(null);
                }}
                className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  paymentMethod === 'mpesa'
                    ? 'border-[#065F46] bg-[#065F46]/5'
                    : 'border-[#E4E4E7] bg-white hover:border-[#A1A1AA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-[#065F46]" aria-hidden="true" />
                  <span className="text-sm font-semibold text-[#18181B]">M-Pesa STK Push</span>
                </div>
                <p className="text-xs text-[#52525B] mt-1">
                  Instant Safaricom mobile prompt
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('card');
                  setPendingStk(null);
                  setErrorMsg(null);
                }}
                className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-[#065F46] bg-[#065F46]/5'
                    : 'border-[#E4E4E7] bg-white hover:border-[#A1A1AA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-[#18181B]" aria-hidden="true" />
                  <span className="text-sm font-semibold text-[#18181B]">Card Payment</span>
                </div>
                <p className="text-xs text-[#52525B] mt-1">
                  Visa, Mastercard, or Debit Card
                </p>
              </button>
            </div>

            {paymentMethod === 'mpesa' ? (
              pendingStk ? (
                <div className="p-5 rounded-xl border border-[#065F46] bg-[#065F46]/5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#065F46]">
                      M-Pesa Prompt Sent
                    </p>
                    <h3 className="font-display text-lg font-bold text-[#18181B] mt-1">
                      Check phone {pendingStk.phone} for STK prompt
                    </h3>
                    <p className="text-sm text-[#52525B] mt-1">{pendingStk.message}</p>
                    <p className="text-xs font-mono text-[#71717A] mt-2">
                      Request ID: {pendingStk.checkoutRequestId} · Amount:{' '}
                      {formatKES(pendingStk.amountKes)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleConfirmStk('confirm')}
                      className="px-5 py-2.5 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'Verifying Receipt...' : 'Complete M-Pesa Confirmation'}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleConfirmStk('cancel')}
                      className="px-4 py-2.5 rounded-lg border border-[#E4E4E7] bg-white text-sm font-medium text-[#52525B] hover:text-[#18181B] transition-colors cursor-pointer"
                    >
                      Cancel Prompt
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                      Safaricom M-Pesa Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="0712 345 678 or 254712345678"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm font-mono focus:outline-none focus:border-[#065F46]"
                    />
                    <p className="text-xs text-[#71717A] mt-1.5">
                      {paymentStatus?.mpesaConfigured
                        ? 'Connected to Safaricom Daraja STK Push.'
                        : 'Interactive M-Pesa sandbox active. Configure MPESA_* environment variables to send live Safaricom prompts.'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-5 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submitting
                      ? 'Initiating STK Push...'
                      : `Send M-Pesa STK Push · ${formatKES(totalKes)}`}
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Amina Kamau"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                    Card Number
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm font-mono focus:outline-none focus:border-[#065F46]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))}
                      placeholder="08/28"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm font-mono focus:outline-none focus:border-[#065F46]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                      CVV
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      required
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm font-mono focus:outline-none focus:border-[#065F46]"
                    />
                  </div>
                </div>

                <p className="text-xs text-[#71717A] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {paymentStatus?.cardConfigured
                      ? 'Secured card gateway active. Card numbers are never stored.'
                      : 'Sandbox card checkout active. Configure CARD_GATEWAY_SECRET_KEY for live card processing.'}
                  </span>
                </p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-5 rounded-lg bg-[#18181B] text-white text-sm font-semibold hover:bg-[#065F46] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Authorizing Card...' : `Pay ${formatKES(totalKes)} by Card`}
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 bg-white border border-[#E4E4E7] rounded-2xl p-6 sm:p-8 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-[#18181B]">Order Summary</h2>

          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {resolvedItems.map(({ product, variant, quantity }) => (
              <div key={`${product.id}-${variant}`} className="flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#F4F4F5] border border-[#E4E4E7] shrink-0">
                  <ProductImage src={product.imageUrl} alt={product.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#18181B] truncate">{product.name}</p>
                  <p className="text-xs text-[#71717A]">
                    {variant} · Qty {quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#18181B] tabular-nums shrink-0">
                  {formatKES(product.priceKes * quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#E4E4E7] space-y-2.5 text-sm">
            <div className="flex items-center justify-between text-[#52525B]">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-[#18181B]">
                {formatKES(subtotalKes)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#52525B]">
              <span>Delivery</span>
              <span className="tabular-nums font-medium text-[#18181B]">
                {deliveryFeeKes === 0 ? 'Complimentary' : formatKES(deliveryFeeKes)}
              </span>
            </div>
            <div className="pt-3 border-t border-[#E4E4E7] flex items-center justify-between">
              <span className="text-base font-semibold text-[#18181B]">Total</span>
              <span className="text-xl font-bold text-[#18181B] tabular-nums">
                {formatKES(totalKes)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
