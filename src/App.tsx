import { useCallback, useEffect, useState } from 'react';
import { AccountView } from './components/AccountView';
import { AdminView } from './components/AdminView';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutView } from './components/CheckoutView';
import { Header, type AppRoute } from './components/Header';
import { OrderTrackingView } from './components/OrderTrackingView';
import { StorefrontView } from './components/StorefrontView';
import type { CartItem, CustomerPublic, Order, Product } from './types';

export default function App() {
  const [route, setRoute] = useState<AppRoute>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerPublic | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [trackedOrderNumber, setTrackedOrderNumber] = useState<string | null>('KM-1042');

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = (await res.json()) as { products: Product[] };
        setProducts(data.products);
      }
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddToCart = (product: Product, variant: string, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.variant === variant
      );
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.variant === variant
            ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { productId: product.id, variant, quantity }];
    });
  };

  const handleUpdateQuantity = (productId: string, variant: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    const maxStock = product ? product.stock : 50;
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId || item.variant !== variant) return item;
          const nextQty = Math.min(maxStock, item.quantity + delta);
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        })
        .filter((entry): entry is CartItem => entry !== null)
    );
  };

  const handleRemoveItem = (productId: string, variant: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.variant === variant))
    );
  };

  const handleOrderSuccess = (order: Order) => {
    setCart([]);
    fetchProducts();
    if (customerToken) {
      setCustomerOrders((prev) => [order, ...prev]);
    }
  };

  const handleTrackOrder = (orderNumber: string) => {
    setTrackedOrderNumber(orderNumber);
    setRoute('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (nextRoute: AppRoute) => {
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9] text-[#18181B]">
      <Header
        activeRoute={route}
        onNavigate={handleNavigate}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        {(route === 'shop' || route === 'categories') && (
          <StorefrontView
            products={products}
            loading={loadingProducts}
            focusCategories={route === 'categories'}
            onAddToCart={handleAddToCart}
            onGoToTrack={() => handleNavigate('track')}
          />
        )}

        {route === 'checkout' && (
          <CheckoutView
            items={cart}
            products={products}
            customer={customer}
            customerToken={customerToken}
            onBackToShop={() => handleNavigate('shop')}
            onOrderSuccess={handleOrderSuccess}
            onTrackOrder={handleTrackOrder}
          />
        )}

        {route === 'track' && (
          <OrderTrackingView
            initialOrderNumber={trackedOrderNumber}
            customerOrders={customerOrders}
          />
        )}

        {route === 'account' && (
          <AccountView
            customer={customer}
            customerToken={customerToken}
            orders={customerOrders}
            onAuthenticated={(token, cust, orders) => {
              setCustomerToken(token);
              setCustomer(cust);
              setCustomerOrders(orders);
            }}
            onProfileUpdated={(updated) => setCustomer(updated)}
            onLogout={() => {
              setCustomerToken(null);
              setCustomer(null);
              setCustomerOrders([]);
            }}
            onTrackOrder={handleTrackOrder}
          />
        )}

        {route === 'admin' && (
          <AdminView
            products={products}
            adminToken={adminToken}
            onAdminAuthenticated={(token) => setAdminToken(token)}
            onAdminLogout={() => setAdminToken(null)}
            onProductsChanged={fetchProducts}
          />
        )}
      </main>

      <footer className="border-t border-[#E4E4E7] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#71717A]">
          <div>
            <span className="font-display font-semibold text-sm text-[#18181B]">
              Kipepeo Market
            </span>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <span>Everything you need, all in one place.</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => handleNavigate('shop')}
              className="hover:text-[#18181B] cursor-pointer"
            >
              Shop
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('track')}
              className="hover:text-[#18181B] cursor-pointer"
            >
              Track Order
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('account')}
              className="hover:text-[#18181B] cursor-pointer"
            >
              Account
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('admin')}
              className="hover:text-[#18181B] cursor-pointer"
            >
              Admin
            </button>
            <span>© {new Date().getFullYear()} Kipepeo Market</span>
          </div>
        </div>
      </footer>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        products={products}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setCartOpen(false);
          handleNavigate('checkout');
        }}
      />
    </div>
  );
}
