import 'dotenv/config';
import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import {
  FREE_DELIVERY_THRESHOLD_KES,
  PRODUCT_CATEGORIES,
  STANDARD_DELIVERY_FEE_KES,
  type AdminOverviewResponse,
  type Order,
  type OrderItem,
  type PaymentConfigStatus,
  type Product,
  type ProductCategory,
} from './src/types.ts';
import {
  generateMpesaReceipt,
  hashPassword,
  isValidOrderStatus,
  loadDatabase,
  normalizeKenyanPhone,
  sanitizeCustomer,
  saveDatabase,
  signToken,
  verifyPassword,
  verifyToken,
  type TokenPayload,
} from './server/store.ts';

interface AuthenticatedRequest extends Request {
  auth?: TokenPayload;
}

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '1mb' }));

function getPaymentConfigStatus(): PaymentConfigStatus {
  const mpesaConfigured = Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY
  );
  const cardConfigured = Boolean(process.env.CARD_GATEWAY_SECRET_KEY);
  const modeLabel =
    mpesaConfigured && cardConfigured
      ? 'Live Gateway Mode'
      : mpesaConfigured || cardConfigured
      ? 'Hybrid Live / Sandbox Mode'
      : 'Interactive Sandbox Checkout';
  return { mpesaConfigured, cardConfigured, modeLabel };
}

function extractBearer(req: Request): TokenPayload | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  return verifyToken(token);
}

function requireCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const auth = extractBearer(req);
  if (!auth || auth.role !== 'customer') {
    res.status(401).json({ error: 'Customer sign-in required.' });
    return;
  }
  req.auth = auth;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const auth = extractBearer(req);
  if (!auth || auth.role !== 'admin') {
    res.status(403).json({ error: 'Admin authorization required.' });
    return;
  }
  req.auth = auth;
  next();
}

function validateAndPriceItems(
  requestedItems: { productId: string; variant: string; quantity: number }[],
  products: Product[]
): { ok: true; orderItems: OrderItem[]; subtotalKes: number } | { ok: false; error: string } {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return { ok: false, error: 'Your shopping bag is empty.' };
  }
  const orderItems: OrderItem[] = [];
  let subtotalKes = 0;

  for (const item of requestedItems) {
    if (!item || typeof item.productId !== 'string' || typeof item.quantity !== 'number') {
      return { ok: false, error: 'Invalid bag item payload.' };
    }
    const qty = Math.floor(item.quantity);
    if (qty < 1 || qty > 50) {
      return { ok: false, error: 'Item quantity must be between 1 and 50.' };
    }
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return { ok: false, error: 'One or more products are no longer available.' };
    }
    if (product.stock < qty) {
      return {
        ok: false,
        error: `Only ${product.stock} unit(s) left in stock for ${product.name}.`,
      };
    }
    const chosenVariant =
      typeof item.variant === 'string' && product.variants.includes(item.variant)
        ? item.variant
        : product.variants[0] || 'Standard';

    orderItems.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      variant: chosenVariant,
      unitPriceKes: product.priceKes,
      quantity: qty,
      imageUrl: product.imageUrl,
    });
    subtotalKes += product.priceKes * qty;
  }

  return { ok: true, orderItems, subtotalKes };
}

function safeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('/src/assets/images/') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return '/src/assets/images/prod_headphones_studio_1795603349358.jpg';
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'kipepeo-market' });
});

// Payment configuration status (never exposes secrets)
app.get('/api/payments/status', (_req, res) => {
  res.json(getPaymentConfigStatus());
});

// Public catalogue listing with search, category, and sorting
app.get('/api/products', (req, res) => {
  const db = loadDatabase();
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : 'All';
  const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'featured';

  let list = [...db.products];

  if (category && category !== 'All') {
    list = list.filter((p) => p.category === category);
  }
  if (search) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.brand.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
    );
  }

  if (sort === 'price-asc') {
    list.sort((a, b) => a.priceKes - b.priceKes);
  } else if (sort === 'price-desc') {
    list.sort((a, b) => b.priceKes - a.priceKes);
  } else if (sort === 'newest') {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else {
    list.sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  res.json({ products: list });
});

app.get('/api/products/:id', (req, res) => {
  const db = loadDatabase();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  res.json({ product });
});

// Customer Registration & Login
app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password, city, address } = req.body ?? {};
  if (
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    typeof email !== 'string' ||
    !email.includes('@') ||
    typeof password !== 'string' ||
    password.length < 6
  ) {
    res.status(400).json({
      error: 'Please enter a valid full name, email address, and a password of at least 6 characters.',
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = loadDatabase();
  if (db.customers.some((c) => c.email === normalizedEmail)) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const newCustomer = {
    id: `cust-${crypto.randomUUID().slice(0, 8)}`,
    name: name.trim(),
    email: normalizedEmail,
    phone: typeof phone === 'string' ? normalizeKenyanPhone(phone) : '',
    city: typeof city === 'string' && city.trim() ? city.trim() : 'Nairobi',
    address: typeof address === 'string' ? address.trim() : '',
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  db.customers.push(newCustomer);
  saveDatabase(db);

  const token = signToken({ sub: newCustomer.id, role: 'customer', email: newCustomer.email });
  res.status(201).json({
    token,
    customer: sanitizeCustomer(newCustomer),
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const db = loadDatabase();
  const customer = db.customers.find((c) => c.email === normalizedEmail);
  if (!customer || !verifyPassword(password, customer.passwordHash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }
  const token = signToken({ sub: customer.id, role: 'customer', email: customer.email });
  res.json({
    token,
    customer: sanitizeCustomer(customer),
  });
});

app.get('/api/auth/me', requireCustomer, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const customer = db.customers.find((c) => c.id === req.auth?.sub);
  if (!customer) {
    res.status(404).json({ error: 'Customer account not found.' });
    return;
  }
  const orders = db.orders
    .filter(
      (o) =>
        o.customerId === customer.id ||
        o.customerEmail.toLowerCase() === customer.email.toLowerCase()
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({
    customer: sanitizeCustomer(customer),
    orders,
  });
});

app.patch('/api/auth/profile', requireCustomer, (req: AuthenticatedRequest, res) => {
  const { name, phone, city, address } = req.body ?? {};
  const db = loadDatabase();
  const customer = db.customers.find((c) => c.id === req.auth?.sub);
  if (!customer) {
    res.status(404).json({ error: 'Customer account not found.' });
    return;
  }
  if (typeof name === 'string' && name.trim().length >= 2) customer.name = name.trim();
  if (typeof phone === 'string') customer.phone = normalizeKenyanPhone(phone);
  if (typeof city === 'string' && city.trim()) customer.city = city.trim();
  if (typeof address === 'string') customer.address = address.trim();
  saveDatabase(db);
  res.json({ customer: sanitizeCustomer(customer) });
});

// M-Pesa STK Push initiation
app.post('/api/checkout/mpesa-stk', async (req, res) => {
  const auth = extractBearer(req);
  const {
    customerName,
    customerEmail,
    customerPhone,
    shippingCity,
    shippingAddress,
    mpesaPhone,
    items,
  } = req.body ?? {};

  if (
    typeof customerName !== 'string' ||
    customerName.trim().length < 2 ||
    typeof customerEmail !== 'string' ||
    !customerEmail.includes('@') ||
    typeof shippingCity !== 'string' ||
    !shippingCity.trim() ||
    typeof shippingAddress !== 'string' ||
    shippingAddress.trim().length < 3
  ) {
    res.status(400).json({ error: 'Please complete all shipping contact and address fields.' });
    return;
  }

  const normalizedMpesa = normalizeKenyanPhone(
    typeof mpesaPhone === 'string' && mpesaPhone.trim() ? mpesaPhone : String(customerPhone || '')
  );
  if (!/^254(7|1)\d{8}$/.test(normalizedMpesa)) {
    res.status(400).json({
      error: 'Enter a valid Kenyan M-Pesa number (e.g. 0712 345 678 or 254712345678).',
    });
    return;
  }

  const db = loadDatabase();
  const check = validateAndPriceItems(items, db.products);
  if (check.ok === false) {
    res.status(400).json({ error: check.error });
    return;
  }

  const deliveryFeeKes =
    check.subtotalKes >= FREE_DELIVERY_THRESHOLD_KES ? 0 : STANDARD_DELIVERY_FEE_KES;
  const totalKes = check.subtotalKes + deliveryFeeKes;
  const checkoutRequestId = `ws_CO_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const configStatus = getPaymentConfigStatus();
  let liveStkInitiated = false;

  // Attempt live Safaricom Daraja STK Push only if all credentials are configured
  if (configStatus.mpesaConfigured) {
    try {
      const authHeader = Buffer.from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
      ).toString('base64');
      const tokenResp = await fetch(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        { headers: { Authorization: `Basic ${authHeader}` } }
      );
      if (tokenResp.ok) {
        const tokenData = (await tokenResp.json()) as { access_token?: string };
        if (tokenData.access_token) {
          const timestamp = new Date()
            .toISOString()
            .replace(/[-:TZ.]/g, '')
            .slice(0, 14);
          const shortcode = process.env.MPESA_SHORTCODE!;
          const passkey = process.env.MPESA_PASSKEY!;
          const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
          const stkResp = await fetch(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: totalKes,
                PartyA: normalizedMpesa,
                PartyB: shortcode,
                PhoneNumber: normalizedMpesa,
                CallBackURL:
                  process.env.MPESA_CALLBACK_URL ||
                  `${process.env.APP_URL || 'https://example.com'}/api/mpesa/callback`,
                AccountReference: 'KipepeoMarket',
                TransactionDesc: 'Kipepeo Market Order',
              }),
            }
          );
          if (stkResp.ok) {
            liveStkInitiated = true;
          }
        }
      }
    } catch {
      liveStkInitiated = false;
    }
  }

  db.mpesaSessions.push({
    checkoutRequestId,
    phone: normalizedMpesa,
    amountKes: totalKes,
    customerId: auth?.role === 'customer' ? auth.sub : undefined,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    shippingCity: shippingCity.trim(),
    shippingAddress: shippingAddress.trim(),
    items,
    status: 'PENDING_PIN',
    createdAt: new Date().toISOString(),
  });
  saveDatabase(db);

  res.status(201).json({
    checkoutRequestId,
    phone: normalizedMpesa,
    amountKes: totalKes,
    liveStkInitiated,
    message: liveStkInitiated
      ? `STK Push sent to ${normalizedMpesa}. Enter your M-Pesa PIN on your phone.`
      : `STK prompt ready for ${normalizedMpesa} (Sandbox simulation — Daraja credentials not set).`,
  });
});

// Confirm M-Pesa STK payment & finalize order atomically
app.post('/api/checkout/mpesa-confirm', (req, res) => {
  const { checkoutRequestId, simulateOutcome } = req.body ?? {};
  if (typeof checkoutRequestId !== 'string' || !checkoutRequestId.trim()) {
    res.status(400).json({ error: 'Missing checkout request ID.' });
    return;
  }

  const db = loadDatabase();
  const session = db.mpesaSessions.find((s) => s.checkoutRequestId === checkoutRequestId);
  if (!session) {
    res.status(404).json({ error: 'M-Pesa checkout session not found.' });
    return;
  }

  if (session.status === 'CONFIRMED' && session.orderNumber) {
    const existingOrder = db.orders.find((o) => o.orderNumber === session.orderNumber);
    if (existingOrder) {
      res.json({ order: existingOrder });
      return;
    }
  }

  if (simulateOutcome === 'cancel') {
    session.status = 'FAILED';
    saveDatabase(db);
    res.status(402).json({ error: 'M-Pesa prompt was cancelled before PIN confirmation.' });
    return;
  }

  const check = validateAndPriceItems(session.items, db.products);
  if (check.ok === false) {
    res.status(400).json({ error: check.error });
    return;
  }

  // Decrement stock
  for (const item of check.orderItems) {
    const product = db.products.find((p) => p.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
    }
  }

  const deliveryFeeKes =
    check.subtotalKes >= FREE_DELIVERY_THRESHOLD_KES ? 0 : STANDARD_DELIVERY_FEE_KES;
  const totalKes = check.subtotalKes + deliveryFeeKes;
  const receipt = generateMpesaReceipt();
  const orderNumber = `KM-${db.nextOrderSeq++}`;
  const now = new Date().toISOString();

  const newOrder: Order = {
    orderNumber,
    customerId: session.customerId,
    customerName: session.customerName,
    customerEmail: session.customerEmail,
    customerPhone: session.phone,
    shippingCity: session.shippingCity,
    shippingAddress: session.shippingAddress,
    items: check.orderItems,
    subtotalKes: check.subtotalKes,
    deliveryFeeKes,
    totalKes,
    paymentMethod: 'mpesa',
    paymentStatus: 'Paid',
    paymentReference: receipt,
    mpesaCheckoutRequestId: session.checkoutRequestId,
    status: 'Confirmed',
    timeline: [
      {
        status: 'Pending',
        note: `M-Pesa STK Push sent to ${session.phone}.`,
        timestamp: session.createdAt,
      },
      {
        status: 'Confirmed',
        note: `M-Pesa payment confirmed. Receipt ${receipt}.`,
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  session.status = 'CONFIRMED';
  session.receiptNumber = receipt;
  session.orderNumber = orderNumber;
  db.orders.unshift(newOrder);
  saveDatabase(db);

  res.status(201).json({ order: newOrder });
});

// Safaricom Daraja Callback Webhook
app.post('/api/mpesa/callback', (req, res) => {
  const stkCallback = req.body?.Body?.stkCallback;
  if (stkCallback && typeof stkCallback.CheckoutRequestID === 'string') {
    const db = loadDatabase();
    const session = db.mpesaSessions.find(
      (s) => s.checkoutRequestId === stkCallback.CheckoutRequestID
    );
    if (session && stkCallback.ResultCode === 0) {
      session.status = 'CONFIRMED';
      saveDatabase(db);
    }
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// Card Payment Checkout (server-validated, never stores full card numbers or CVV)
app.post('/api/checkout/card', (req, res) => {
  const auth = extractBearer(req);
  const {
    customerName,
    customerEmail,
    customerPhone,
    shippingCity,
    shippingAddress,
    cardHolder,
    cardNumber,
    expiry,
    cvv,
    items,
  } = req.body ?? {};

  if (
    typeof customerName !== 'string' ||
    customerName.trim().length < 2 ||
    typeof customerEmail !== 'string' ||
    !customerEmail.includes('@') ||
    typeof shippingCity !== 'string' ||
    !shippingCity.trim() ||
    typeof shippingAddress !== 'string' ||
    shippingAddress.trim().length < 3
  ) {
    res.status(400).json({ error: 'Please complete all shipping contact and address fields.' });
    return;
  }

  const digits = typeof cardNumber === 'string' ? cardNumber.replace(/\D/g, '') : '';
  const cvvDigits = typeof cvv === 'string' ? cvv.replace(/\D/g, '') : '';
  if (
    typeof cardHolder !== 'string' ||
    cardHolder.trim().length < 2 ||
    digits.length < 13 ||
    digits.length > 19 ||
    typeof expiry !== 'string' ||
    !/^\d{2}\/\d{2}$/.test(expiry.trim()) ||
    cvvDigits.length < 3 ||
    cvvDigits.length > 4
  ) {
    res.status(400).json({
      error: 'Please enter valid cardholder name, card number, MM/YY expiry, and 3-4 digit CVV.',
    });
    return;
  }

  const db = loadDatabase();
  const check = validateAndPriceItems(items, db.products);
  if (check.ok === false) {
    res.status(400).json({ error: check.error });
    return;
  }

  for (const item of check.orderItems) {
    const product = db.products.find((p) => p.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
    }
  }

  const deliveryFeeKes =
    check.subtotalKes >= FREE_DELIVERY_THRESHOLD_KES ? 0 : STANDARD_DELIVERY_FEE_KES;
  const totalKes = check.subtotalKes + deliveryFeeKes;
  const last4 = digits.slice(-4);
  const authRef = `CRD-${crypto.randomInt(100000, 999999)}`;
  const orderNumber = `KM-${db.nextOrderSeq++}`;
  const now = new Date().toISOString();

  const newOrder: Order = {
    orderNumber,
    customerId: auth?.role === 'customer' ? auth.sub : undefined,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    customerPhone: normalizeKenyanPhone(String(customerPhone || '')),
    shippingCity: shippingCity.trim(),
    shippingAddress: shippingAddress.trim(),
    items: check.orderItems,
    subtotalKes: check.subtotalKes,
    deliveryFeeKes,
    totalKes,
    paymentMethod: 'card',
    paymentStatus: 'Paid',
    paymentReference: authRef,
    cardLast4: last4,
    status: 'Confirmed',
    timeline: [
      {
        status: 'Pending',
        note: `Card payment initiated for card ending in ${last4}.`,
        timestamp: now,
      },
      {
        status: 'Confirmed',
        note: `Card authorization ${authRef} approved.`,
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  db.orders.unshift(newOrder);
  saveDatabase(db);

  res.status(201).json({ order: newOrder });
});

// Public Order Tracking
app.get('/api/orders/track', (req, res) => {
  const orderNumber =
    typeof req.query.orderNumber === 'string' ? req.query.orderNumber.trim().toUpperCase() : '';
  const contact =
    typeof req.query.contact === 'string' ? req.query.contact.trim().toLowerCase() : '';

  if (!orderNumber) {
    res.status(400).json({ error: 'Please provide an order number (e.g. KM-1042).' });
    return;
  }

  const db = loadDatabase();
  const order = db.orders.find((o) => o.orderNumber.toUpperCase() === orderNumber);
  if (!order) {
    res.status(404).json({ error: `No order found matching ${orderNumber}.` });
    return;
  }

  // Optional contact verification when supplied
  if (contact) {
    const normContactPhone = normalizeKenyanPhone(contact);
    const matchesEmail = order.customerEmail.toLowerCase() === contact;
    const matchesPhone =
      Boolean(normContactPhone) && order.customerPhone.endsWith(normContactPhone.slice(-9));
    if (!matchesEmail && !matchesPhone) {
      res.status(403).json({
        error: 'Contact email or phone number does not match this order record.',
      });
      return;
    }
  }

  res.json({ order });
});

// Admin Auth Status, First-Run Claim, and Login
app.get('/api/admin/status', (_req, res) => {
  const db = loadDatabase();
  const configuredViaEnv = Boolean(
    process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0
  );
  res.json({
    configuredViaEnv,
    claimed: Boolean(db.adminPasswordHash),
  });
});

app.post('/api/admin/claim', (req, res) => {
  const configuredViaEnv = Boolean(
    process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0
  );
  if (configuredViaEnv) {
    res.status(403).json({
      error: 'Admin passcode is managed by server environment configuration.',
    });
    return;
  }

  const db = loadDatabase();
  if (db.adminPasswordHash) {
    res.status(409).json({
      error: 'Admin access has already been claimed. Please sign in with your admin password.',
    });
    return;
  }

  const { password } = req.body ?? {};
  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Choose an admin password of at least 6 characters.' });
    return;
  }

  db.adminPasswordHash = hashPassword(password);
  saveDatabase(db);

  const token = signToken({ sub: 'admin', role: 'admin' });
  res.status(201).json({ token });
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== 'string' || !password) {
    res.status(400).json({ error: 'Admin password is required.' });
    return;
  }

  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) {
    const a = Buffer.from(password);
    const b = Buffer.from(envPass);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(401).json({ error: 'Incorrect admin passcode.' });
      return;
    }
    const token = signToken({ sub: 'admin', role: 'admin' });
    res.json({ token });
    return;
  }

  const db = loadDatabase();
  if (!db.adminPasswordHash) {
    res.status(400).json({ error: 'Admin access has not been set up yet.' });
    return;
  }

  if (!verifyPassword(password, db.adminPasswordHash)) {
    res.status(401).json({ error: 'Incorrect admin password.' });
    return;
  }

  const token = signToken({ sub: 'admin', role: 'admin' });
  res.json({ token });
});

// Admin Overview & Management
app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  const db = loadDatabase();
  const totalRevenueKes = db.orders
    .filter((o) => o.status !== 'Cancelled' && o.paymentStatus === 'Paid')
    .reduce((sum, o) => sum + o.totalKes, 0);

  const activeOrders = db.orders.filter(
    (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
  ).length;

  const lowStockCount = db.products.filter((p) => p.stock <= 5).length;

  const customersWithStats = db.customers.map((c) => {
    const customerOrders = db.orders.filter(
      (o) => o.customerId === c.id || o.customerEmail.toLowerCase() === c.email.toLowerCase()
    );
    return {
      ...sanitizeCustomer(c),
      orderCount: customerOrders.length,
      totalSpentKes: customerOrders
        .filter((o) => o.status !== 'Cancelled')
        .reduce((sum, o) => sum + o.totalKes, 0),
    };
  });

  const payload: AdminOverviewResponse = {
    stats: {
      totalRevenueKes,
      totalOrders: db.orders.length,
      activeOrders,
      totalProducts: db.products.length,
      lowStockCount,
      totalCustomers: db.customers.length,
    },
    orders: db.orders,
    customers: customersWithStats,
    paymentConfig: getPaymentConfigStatus(),
  };
  res.json(payload);
});

app.post('/api/products', requireAdmin, (req, res) => {
  const { name, brand, sku, category, priceKes, compareAtKes, stock, imageUrl, description, variants, featured } =
    req.body ?? {};

  if (
    typeof name !== 'string' ||
    name.trim().length < 2 ||
    typeof brand !== 'string' ||
    brand.trim().length < 1 ||
    typeof priceKes !== 'number' ||
    priceKes <= 0 ||
    typeof stock !== 'number' ||
    stock < 0
  ) {
    res.status(400).json({ error: 'Provide valid product name, brand, price, and stock.' });
    return;
  }

  const validCat: ProductCategory = PRODUCT_CATEGORIES.includes(category)
    ? category
    : 'Home & Living';

  const db = loadDatabase();
  const newProduct: Product = {
    id: `prod-${crypto.randomUUID().slice(0, 8)}`,
    sku:
      typeof sku === 'string' && sku.trim()
        ? sku.trim().toUpperCase()
        : `KM-${crypto.randomInt(100, 999)}`,
    name: name.trim(),
    brand: brand.trim(),
    category: validCat,
    priceKes: Math.round(priceKes),
    compareAtKes:
      typeof compareAtKes === 'number' && compareAtKes > priceKes
        ? Math.round(compareAtKes)
        : undefined,
    stock: Math.floor(stock),
    imageUrl: typeof imageUrl === 'string' ? safeImageUrl(imageUrl) : safeImageUrl(''),
    description:
      typeof description === 'string' && description.trim()
        ? description.trim()
        : 'Curated everyday essential from Kipepeo Market.',
    variants:
      Array.isArray(variants) && variants.length > 0
        ? variants.map((v) => String(v).trim()).filter(Boolean)
        : ['Standard'],
    featured: Boolean(featured),
    createdAt: new Date().toISOString(),
  };

  db.products.unshift(newProduct);
  saveDatabase(db);
  res.status(201).json({ product: newProduct });
});

app.patch('/api/products/:id', requireAdmin, (req, res) => {
  const db = loadDatabase();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const { name, brand, sku, category, priceKes, stock, description, featured, imageUrl } =
    req.body ?? {};
  if (typeof name === 'string' && name.trim().length >= 2) product.name = name.trim();
  if (typeof brand === 'string' && brand.trim()) product.brand = brand.trim();
  if (typeof sku === 'string' && sku.trim()) product.sku = sku.trim().toUpperCase();
  if (PRODUCT_CATEGORIES.includes(category)) product.category = category;
  if (typeof priceKes === 'number' && priceKes > 0) product.priceKes = Math.round(priceKes);
  if (typeof stock === 'number' && stock >= 0) product.stock = Math.floor(stock);
  if (typeof description === 'string' && description.trim()) {
    product.description = description.trim();
  }
  if (typeof featured === 'boolean') product.featured = featured;
  if (typeof imageUrl === 'string' && imageUrl.trim()) product.imageUrl = safeImageUrl(imageUrl);

  saveDatabase(db);
  res.json({ product });
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = loadDatabase();
  const index = db.products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  db.products.splice(index, 1);
  saveDatabase(db);
  res.json({ ok: true });
});

app.patch('/api/admin/orders/:orderNumber', requireAdmin, (req, res) => {
  const { status, note } = req.body ?? {};
  if (typeof status !== 'string' || !isValidOrderStatus(status)) {
    res.status(400).json({ error: 'Invalid order fulfillment status.' });
    return;
  }

  const db = loadDatabase();
  const order = db.orders.find(
    (o) => o.orderNumber.toUpperCase() === req.params.orderNumber.toUpperCase()
  );
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const now = new Date().toISOString();
  order.status = status;
  order.updatedAt = now;
  order.timeline.push({
    status,
    note:
      typeof note === 'string' && note.trim()
        ? note.trim()
        : `Order status updated to ${status} by store operations.`,
    timestamp: now,
  });

  saveDatabase(db);
  res.json({ order });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kipepeo Market server listening on http://localhost:${PORT}`);
  });
}

startServer();
