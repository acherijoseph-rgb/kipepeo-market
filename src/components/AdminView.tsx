import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Edit3,
  Lock,
  LogOut,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  PRODUCT_CATEGORIES,
  formatKES,
  type AdminOverviewResponse,
  type OrderStatus,
  type Product,
  type ProductCategory,
} from '../types';

interface AdminViewProps {
  products: Product[];
  adminToken: string | null;
  onAdminAuthenticated: (token: string) => void;
  onAdminLogout: () => void;
  onProductsChanged: () => void;
}

const IMAGE_PRESETS = [
  {
    label: 'Studio Wireless Headphones',
    url: '/src/assets/images/prod_headphones_studio_1795603349358.jpg',
  },
  {
    label: 'Pour-Over Kettle & Mugs',
    url: '/src/assets/images/prod_kettle_ceramics_1795603349585.jpg',
  },
  {
    label: 'Waxed Canvas Backpack',
    url: '/src/assets/images/prod_backpack_canvas_1795603350164.jpg',
  },
  {
    label: 'Botanical Skincare Set',
    url: '/src/assets/images/prod_skincare_botanical_1795603350181.jpg',
  },
  {
    label: 'Architectural Brass Desk Lamp',
    url: '/src/assets/images/prod_lamp_desk_1795603350899.jpg',
  },
  {
    label: 'Field Stainless Watch',
    url: '/src/assets/images/prod_watch_chrono_1795603350652.jpg',
  },
  {
    label: 'Glass Countertop Blender',
    url: '/src/assets/images/prod_blender_kitchen_1795603350949.jpg',
  },
  {
    label: 'Organic Linen Throw',
    url: '/src/assets/images/prod_linen_throw_1795603352170.jpg',
  },
];

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Packed',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export function AdminView({
  products,
  adminToken,
  onAdminAuthenticated,
  onAdminLogout,
  onProductsChanged,
}: AdminViewProps) {
  const [adminStatus, setAdminStatus] = useState<{
    configuredViaEnv: boolean;
    claimed: boolean;
  } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [tab, setTab] = useState<'overview' | 'products' | 'orders' | 'customers'>('overview');
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Add / Edit Product modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Electronics');
  const [formPrice, setFormPrice] = useState('5000');
  const [formStock, setFormStock] = useState('10');
  const [formImage, setFormImage] = useState(IMAGE_PRESETS[0].url);
  const [formDescription, setFormDescription] = useState('');
  const [formFeatured, setFormFeatured] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);

  useEffect(() => {
    fetch('/api/admin/status')
      .then((r) => r.json())
      .then((data) => setAdminStatus(data))
      .catch(() => setAdminStatus({ configuredViaEnv: false, claimed: false }));
  }, []);

  const loadOverview = async (token: string) => {
    setLoadingOverview(true);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        onAdminLogout();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as AdminOverviewResponse;
        setOverview(data);
      }
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadOverview(adminToken);
    }
  }, [adminToken]);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    const isClaimMode =
      adminStatus && !adminStatus.configuredViaEnv && !adminStatus.claimed;
    const endpoint = isClaimMode ? '/api/admin/claim' : '/api/admin/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      setPasswordInput('');
      setAdminStatus((prev) => (prev ? { ...prev, claimed: true } : prev));
      onAdminAuthenticated(data.token);
    } catch {
      setAuthError('Network error authenticating admin session.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBrand('');
    setFormSku('');
    setFormCategory('Electronics');
    setFormPrice('5000');
    setFormStock('12');
    setFormImage(IMAGE_PRESETS[0].url);
    setFormDescription('');
    setFormFeatured(true);
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBrand(p.brand);
    setFormSku(p.sku);
    setFormCategory(p.category);
    setFormPrice(String(p.priceKes));
    setFormStock(String(p.stock));
    setFormImage(p.imageUrl);
    setFormDescription(p.description);
    setFormFeatured(p.featured);
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSavingProduct(true);
    try {
      const payload = {
        name: formName,
        brand: formBrand,
        sku: formSku,
        category: formCategory,
        priceKes: Number(formPrice),
        stock: Number(formStock),
        imageUrl: formImage,
        description: formDescription,
        featured: formFeatured,
      };
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setProductModalOpen(false);
        onProductsChanged();
        loadOverview(adminToken);
      }
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!adminToken) return;
    const res = await fetch(`/api/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      onProductsChanged();
      loadOverview(adminToken);
    }
  };

  const handleOrderStatusChange = async (orderNumber: string, status: OrderStatus) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/orders/${orderNumber}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      loadOverview(adminToken);
    }
  };

  if (!adminToken) {
    const isClaimMode =
      adminStatus && !adminStatus.configuredViaEnv && !adminStatus.claimed;

    return (
      <section className="max-w-md mx-auto px-4 sm:px-6 py-14">
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="w-11 h-11 rounded-xl bg-[#18181B] text-white flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-[#18181B]">
              {isClaimMode ? 'Claim Admin Access' : 'Store Operations Login'}
            </h1>
            <p className="text-sm text-[#52525B] mt-1">
              {isClaimMode
                ? 'First-run setup: choose an admin password to protect your Kipepeo Market inventory, orders, and customer console.'
                : 'Enter your store admin password to manage products, inventory, and customer orders.'}
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/5 text-sm text-[#B91C1C]">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                {isClaimMode ? 'Create Admin Password (min 6 chars)' : 'Admin Password'}
              </label>
              <input
                type="password"
                required
                minLength={isClaimMode ? 6 : 1}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting || adminStatus === null}
              className="w-full py-3 px-4 rounded-lg bg-[#18181B] text-white text-sm font-semibold hover:bg-[#065F46] transition-colors cursor-pointer disabled:opacity-50"
            >
              {authSubmitting
                ? 'Verifying...'
                : isClaimMode
                ? 'Set Admin Password & Enter'
                : 'Sign In to Admin'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  const filteredProducts = products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E4E4E7]">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#065F46]">
            Kipepeo Market Operations
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#18181B] mt-0.5">
            Admin Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openAddProduct}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>

          <button
            type="button"
            onClick={onAdminLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E4E4E7] bg-white text-sm font-medium text-[#52525B] hover:text-[#18181B] cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'products', label: `Products (${products.length})` },
            { id: 'orders', label: `Orders (${overview?.orders.length ?? 0})` },
            { id: 'customers', label: 'Customers & Payments' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              tab === item.id
                ? 'bg-[#18181B] text-white'
                : 'bg-white border border-[#E4E4E7] text-[#52525B] hover:text-[#18181B]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E4E4E7] rounded-xl p-5">
              <p className="text-xs font-medium text-[#71717A]">Paid Revenue</p>
              <p className="font-display text-2xl font-bold text-[#18181B] tabular-nums mt-2">
                {overview ? formatKES(overview.stats.totalRevenueKes) : '—'}
              </p>
            </div>
            <div className="bg-white border border-[#E4E4E7] rounded-xl p-5">
              <p className="text-xs font-medium text-[#71717A]">Active Orders</p>
              <p className="font-display text-2xl font-bold text-[#18181B] tabular-nums mt-2">
                {overview ? overview.stats.activeOrders : '—'}
              </p>
            </div>
            <div className="bg-white border border-[#E4E4E7] rounded-xl p-5">
              <p className="text-xs font-medium text-[#71717A]">Catalogue Products</p>
              <p className="font-display text-2xl font-bold text-[#18181B] tabular-nums mt-2">
                {products.length}{' '}
                <span className="text-xs font-normal text-[#B45309]">
                  ({overview?.stats.lowStockCount ?? 0} low stock)
                </span>
              </p>
            </div>
            <div className="bg-white border border-[#E4E4E7] rounded-xl p-5">
              <p className="text-xs font-medium text-[#71717A]">Registered Customers</p>
              <p className="font-display text-2xl font-bold text-[#18181B] tabular-nums mt-2">
                {overview ? overview.stats.totalCustomers : '—'}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E4E4E7] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E4E7] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#18181B]">Recent Orders</h2>
              <button
                type="button"
                onClick={() => setTab('orders')}
                className="text-xs font-medium text-[#065F46] hover:underline cursor-pointer"
              >
                Manage All Orders
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FAFAF9] text-xs text-[#71717A] border-b border-[#E4E4E7]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Order</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Payment</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5]">
                  {loadingOverview && !overview ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-[#71717A]">
                        Loading store records...
                      </td>
                    </tr>
                  ) : (
                    overview?.orders.slice(0, 5).map((o) => (
                      <tr key={o.orderNumber} className="hover:bg-[#FAFAF9]">
                        <td className="px-5 py-3 font-mono font-semibold text-[#18181B]">
                          {o.orderNumber}
                        </td>
                        <td className="px-5 py-3 text-[#3F3F46]">{o.customerName}</td>
                        <td className="px-5 py-3 text-[#52525B]">
                          {o.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Card'} ·{' '}
                          <span className="font-mono text-xs">{o.paymentReference}</span>
                        </td>
                        <td className="px-5 py-3 font-medium text-[#065F46]">{o.status}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">
                          {formatKES(o.totalKes)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="bg-white border border-[#E4E4E7] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#E4E4E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="search"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Filter inventory by name, SKU, or category..."
              className="w-full sm:w-80 px-3.5 py-2 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFAF9] text-xs text-[#71717A] border-b border-[#E4E4E7]">
                <tr>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium text-right">Price</th>
                  <th className="px-5 py-3 font-medium text-right">Stock</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F5]">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAFAF9]">
                    <td className="px-5 py-3 font-mono text-xs text-[#71717A]">{p.sku}</td>
                    <td className="px-5 py-3 font-medium text-[#18181B]">
                      {p.name}{' '}
                      <span className="text-xs font-normal text-[#71717A]">· {p.brand}</span>
                    </td>
                    <td className="px-5 py-3 text-[#52525B]">{p.category}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatKES(p.priceKes)}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-semibold tabular-nums ${
                        p.stock <= 5 ? 'text-[#B45309]' : 'text-[#18181B]'
                      }`}
                    >
                      {p.stock}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditProduct(p)}
                          className="p-1.5 rounded hover:bg-[#F4F4F5] text-[#52525B] hover:text-[#18181B] cursor-pointer"
                          aria-label={`Edit ${p.name}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded hover:bg-[#B91C1C]/10 text-[#71717A] hover:text-[#B91C1C] cursor-pointer"
                          aria-label={`Delete ${p.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="bg-white border border-[#E4E4E7] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFAF9] text-xs text-[#71717A] border-b border-[#E4E4E7]">
                <tr>
                  <th className="px-5 py-3 font-medium">Order #</th>
                  <th className="px-5 py-3 font-medium">Customer & City</th>
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium">Fulfillment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F5]">
                {overview?.orders.map((o) => (
                  <tr key={o.orderNumber} className="hover:bg-[#FAFAF9]">
                    <td className="px-5 py-3.5 font-mono font-semibold text-[#18181B]">
                      {o.orderNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[#18181B]">{o.customerName}</p>
                      <p className="text-xs text-[#71717A]">{o.shippingCity}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[#52525B]">
                      <p className="font-medium text-[#18181B]">
                        {o.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Card'} · {o.paymentStatus}
                      </p>
                      <p className="text-xs font-mono text-[#71717A]">{o.paymentReference}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                      {formatKES(o.totalKes)}
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={o.status}
                        onChange={(e) =>
                          handleOrderStatusChange(o.orderNumber, e.target.value as OrderStatus)
                        }
                        aria-label={`Fulfillment status for ${o.orderNumber}`}
                        className="px-3 py-1.5 rounded-lg border border-[#E4E4E7] bg-white text-xs font-medium text-[#18181B] focus:outline-none focus:border-[#065F46] cursor-pointer"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customers & Payment Config Tab */}
      {tab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-[#E4E4E7] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E4E4E7]">
              <h2 className="text-sm font-semibold text-[#18181B]">Registered Customers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FAFAF9] text-xs text-[#71717A] border-b border-[#E4E4E7]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Contact</th>
                    <th className="px-5 py-3 font-medium text-right">Orders</th>
                    <th className="px-5 py-3 font-medium text-right">Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F4F5]">
                  {!overview || overview.customers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-[#71717A]">
                        No registered customer accounts yet.
                      </td>
                    </tr>
                  ) : (
                    overview.customers.map((c) => (
                      <tr key={c.id}>
                        <td className="px-5 py-3 font-medium text-[#18181B]">{c.name}</td>
                        <td className="px-5 py-3 text-xs text-[#52525B]">
                          <div>{c.email}</div>
                          <div className="font-mono">{c.phone || 'No phone'}</div>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">{c.orderCount ?? 0}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">
                          {formatKES(c.totalSpentKes ?? 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-[#E4E4E7] rounded-xl p-6 space-y-4 self-start">
            <h2 className="text-sm font-semibold text-[#18181B]">Payment Gateway Configuration</h2>
            <p className="text-xs text-[#52525B] leading-relaxed">
              Live M-Pesa Daraja and Card Gateway keys are read exclusively from server environment variables.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-lg border border-[#E4E4E7] flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#18181B]">M-Pesa Daraja STK Push</p>
                  <p className="text-xs text-[#71717A]">
                    MPESA_CONSUMER_KEY, SECRET, SHORTCODE, PASSKEY
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#065F46]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {overview?.paymentConfig.mpesaConfigured ? 'Live Ready' : 'Sandbox Active'}
                  </span>
                </span>
              </div>

              <div className="p-4 rounded-lg border border-[#E4E4E7] flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#18181B]">Card Gateway</p>
                  <p className="text-xs text-[#71717A]">CARD_GATEWAY_SECRET_KEY</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#065F46]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {overview?.paymentConfig.cardConfigured ? 'Live Ready' : 'Sandbox Active'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {productModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label={editingProduct ? 'Edit Product' : 'Add Product'}
        >
          <form
            onSubmit={handleSaveProduct}
            className="bg-white border border-[#E4E4E7] rounded-2xl max-w-xl w-full p-6 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7]">
              <h2 className="font-display text-lg font-bold text-[#18181B]">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#52525B] hover:bg-[#F4F4F5] cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1">Brand</label>
                <input
                  type="text"
                  required
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1">SKU</label>
                <input
                  type="text"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  placeholder="KM-109"
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] text-sm font-mono focus:outline-none focus:border-[#065F46]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1">Price (KES)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] text-sm tabular-nums focus:outline-none focus:border-[#065F46]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1">Stock Qty</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] text-sm tabular-nums focus:outline-none focus:border-[#065F46]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] text-sm bg-white focus:outline-none focus:border-[#065F46]"
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3F3F46] mb-1">
                  Studio Image Preset
                </label>
                <select
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] text-sm bg-white focus:outline-none focus:border-[#065F46]"
                >
                  {IMAGE_PRESETS.map((img) => (
                    <option key={img.url} value={img.url}>
                      {img.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3F3F46] mb-1">Description</label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-[#3F3F46] cursor-pointer">
              <input
                type="checkbox"
                checked={formFeatured}
                onChange={(e) => setFormFeatured(e.target.checked)}
                className="rounded border-[#D4D4D8]"
              />
              <span>Feature on storefront top row</span>
            </label>

            <div className="pt-3 border-t border-[#E4E4E7] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#E4E4E7] text-sm font-medium text-[#52525B] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProduct}
                className="px-5 py-2 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] cursor-pointer disabled:opacity-50"
              >
                {savingProduct ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
