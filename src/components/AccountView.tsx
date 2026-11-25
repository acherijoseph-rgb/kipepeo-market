import { useState, type FormEvent } from 'react';
import { LogOut, Package, UserCheck } from 'lucide-react';
import { formatKES, type CustomerPublic, type Order } from '../types';

interface AccountViewProps {
  customer: CustomerPublic | null;
  customerToken: string | null;
  orders: Order[];
  onAuthenticated: (token: string, customer: CustomerPublic, orders: Order[]) => void;
  onProfileUpdated: (customer: CustomerPublic) => void;
  onLogout: () => void;
  onTrackOrder: (orderNumber: string) => void;
}

export function AccountView({
  customer,
  customerToken,
  orders,
  onAuthenticated,
  onProfileUpdated,
  onLogout,
  onTrackOrder,
}: AccountViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Nairobi — Westlands');
  const [address, setAddress] = useState('');

  const [profileName, setProfileName] = useState(customer?.name || '');
  const [profilePhone, setProfilePhone] = useState(customer?.phone || '');
  const [profileCity, setProfileCity] = useState(customer?.city || 'Nairobi — Westlands');
  const [profileAddress, setProfileAddress] = useState(customer?.address || '');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body =
        mode === 'login'
          ? { email, password }
          : { name, email, phone, password, city, address };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed.');
        return;
      }
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const meData = meRes.ok ? await meRes.json() : { customer: data.customer, orders: [] };
      setProfileName(meData.customer.name);
      setProfilePhone(meData.customer.phone);
      setProfileCity(meData.customer.city);
      setProfileAddress(meData.customer.address);
      onAuthenticated(data.token, meData.customer, meData.orders || []);
    } catch {
      setErrorMsg('Network error connecting to account service.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerToken) return;
    setSubmitting(true);
    setSaveSuccess(false);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          name: profileName,
          phone: profilePhone,
          city: profileCity,
          address: profileAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update profile.');
        return;
      }
      onProfileUpdated(data.customer);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      setErrorMsg('Network error saving profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!customer) {
    return (
      <section className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#18181B]">Customer Account</h1>
            <p className="text-sm text-[#52525B] mt-1">
              Sign in or create an account to save delivery details and manage your orders.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4F4F5] rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'login' ? 'bg-white text-[#18181B] shadow-sm' : 'text-[#52525B]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                mode === 'register' ? 'bg-white text-[#18181B] shadow-sm' : 'text-[#52525B]'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/5 text-sm text-[#B91C1C]">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Grace Wambui"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0712 345 678"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                      Default City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Kilimani, Ngong Rd"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.co.ke"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-lg bg-[#065F46] text-white text-sm font-semibold hover:bg-[#047857] transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Customer Account'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#065F46]/10 text-[#065F46] flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[#18181B]">{customer.name}</h1>
            <p className="text-sm text-[#52525B]">{customer.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E4E4E7] text-sm font-medium text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F4F5] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Saved Delivery Address */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-5 bg-white border border-[#E4E4E7] rounded-2xl p-6 space-y-4 self-start"
        >
          <h2 className="font-display text-lg font-bold text-[#18181B]">Saved Delivery Profile</h2>
          {errorMsg && <p className="text-xs text-[#B91C1C]">{errorMsg}</p>}
          {saveSuccess && <p className="text-xs text-[#065F46] font-medium">Profile saved.</p>}

          <div>
            <label className="block text-xs font-medium text-[#3F3F46] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#3F3F46] mb-1">Phone Number</label>
            <input
              type="tel"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#E4E4E7] text-sm font-mono focus:outline-none focus:border-[#065F46]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#3F3F46] mb-1">City</label>
            <input
              type="text"
              value={profileCity}
              onChange={(e) => setProfileCity(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#3F3F46] mb-1">Street Address</label>
            <input
              type="text"
              value={profileAddress}
              onChange={(e) => setProfileAddress(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-[#E4E4E7] text-sm focus:outline-none focus:border-[#065F46]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-[#18181B] text-white text-sm font-semibold hover:bg-[#065F46] transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Order History */}
        <div className="lg:col-span-7 bg-white border border-[#E4E4E7] rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#18181B]">Order History</h2>

          {orders.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="w-8 h-8 text-[#A1A1AA] mx-auto mb-3 stroke-[1.5]" />
              <p className="text-sm font-medium text-[#18181B]">No orders placed yet</p>
              <p className="text-xs text-[#71717A] mt-1">
                Orders placed while signed in will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.orderNumber}
                  className="p-4 rounded-xl border border-[#E4E4E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#18181B]">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-[#71717A]">·</span>
                      <span className="text-xs font-medium text-[#065F46]">{order.status}</span>
                    </div>
                    <p className="text-xs text-[#71717A] mt-1">
                      {new Date(order.createdAt).toLocaleDateString()} · {order.items.length} item(s) ·{' '}
                      {order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Card'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-[#18181B] tabular-nums">
                      {formatKES(order.totalKes)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onTrackOrder(order.orderNumber)}
                      className="px-3 py-1.5 rounded-lg border border-[#E4E4E7] text-xs font-semibold text-[#18181B] hover:bg-[#F4F4F5] cursor-pointer"
                    >
                      Track
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
