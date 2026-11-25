import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import {
  FREE_DELIVERY_THRESHOLD_KES,
  STANDARD_DELIVERY_FEE_KES,
  formatKES,
  type CartItem,
  type Product,
} from '../types';
import { ProductImage } from './ProductImage';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  products: Product[];
  onUpdateQuantity: (productId: string, variant: string, delta: number) => void;
  onRemoveItem: (productId: string, variant: string) => void;
  onCheckout: () => void;
}

export function CartDrawer({
  open,
  onClose,
  items,
  products,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}: CartDrawerProps) {
  if (!open) return null;

  const resolvedItems = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return { ...item, product };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const subtotalKes = resolvedItems.reduce(
    (sum, item) => sum + item.product.priceKes * item.quantity,
    0
  );
  const qualifiesFreeDelivery = subtotalKes >= FREE_DELIVERY_THRESHOLD_KES;
  const deliveryFeeKes =
    resolvedItems.length === 0 || qualifiesFreeDelivery ? 0 : STANDARD_DELIVERY_FEE_KES;
  const totalKes = subtotalKes + deliveryFeeKes;
  const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD_KES - subtotalKes);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative z-10 w-full max-w-md bg-white h-full flex flex-col border-l border-[#E4E4E7] shadow-xl">
        <div className="px-6 py-5 border-b border-[#E4E4E7] flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#18181B]">Your Bag</h2>
            <p className="text-xs text-[#71717A] tabular-nums">
              {resolvedItems.reduce((sum, i) => sum + i.quantity, 0)} item(s)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#52525B] hover:bg-[#F4F4F5] hover:text-[#18181B] transition-colors cursor-pointer"
            aria-label="Close bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {resolvedItems.length > 0 && (
          <div className="px-6 py-3 bg-[#FAFAF9] border-b border-[#E4E4E7]">
            <p className="text-xs text-[#3F3F46] mb-1.5">
              {qualifiesFreeDelivery
                ? 'You qualify for complimentary Nairobi same-day delivery.'
                : `Add ${formatKES(remainingForFree)} more for complimentary Nairobi delivery.`}
            </p>
            <div className="h-1.5 w-full bg-[#E4E4E7] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#065F46] transition-transform duration-200 origin-left"
                style={{
                  transform: `scaleX(${Math.min(1, subtotalKes / FREE_DELIVERY_THRESHOLD_KES)})`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {resolvedItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-[#F4F4F5] flex items-center justify-center text-[#71717A] mb-4">
                <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="font-display text-base font-semibold text-[#18181B] mb-1">
                Your shopping bag is empty
              </h3>
              <p className="text-sm text-[#71717A] max-w-xs mb-5">
                Explore our electronics, kitchenware, apparel, and wellness essentials to get started.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-[#18181B] text-white text-sm font-medium hover:bg-[#27272A] transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            resolvedItems.map(({ product, variant, quantity }) => (
              <div
                key={`${product.id}-${variant}`}
                className="flex gap-4 pb-5 border-b border-[#F4F4F5] last:border-b-0"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#F4F4F5] shrink-0 border border-[#E4E4E7]">
                  <ProductImage src={product.imageUrl} alt={product.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-[#18181B] truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-[#71717A] mt-0.5">
                        {product.brand} · {variant}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(product.id, variant)}
                      className="text-[#71717A] hover:text-[#B91C1C] p-1 transition-colors cursor-pointer"
                      aria-label={`Remove ${product.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#E4E4E7] rounded-lg bg-white">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, variant, -1)}
                        className="w-8 h-8 inline-flex items-center justify-center text-[#52525B] hover:text-[#18181B] cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-medium tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, variant, 1)}
                        disabled={quantity >= product.stock}
                        className="w-8 h-8 inline-flex items-center justify-center text-[#52525B] hover:text-[#18181B] disabled:opacity-40 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-[#18181B] tabular-nums">
                      {formatKES(product.priceKes * quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {resolvedItems.length > 0 && (
          <div className="p-6 border-t border-[#E4E4E7] bg-[#FAFAF9] space-y-3">
            <div className="flex items-center justify-between text-sm text-[#52525B]">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-[#18181B]">
                {formatKES(subtotalKes)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-[#52525B]">
              <span>Delivery</span>
              <span className="tabular-nums font-medium text-[#18181B]">
                {deliveryFeeKes === 0 ? 'Complimentary' : formatKES(deliveryFeeKes)}
              </span>
            </div>
            <div className="pt-3 border-t border-[#E4E4E7] flex items-center justify-between">
              <span className="text-base font-semibold text-[#18181B]">Total</span>
              <span className="text-lg font-bold text-[#18181B] tabular-nums">
                {formatKES(totalKes)}
              </span>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="w-full py-3 px-4 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] transition-colors cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
