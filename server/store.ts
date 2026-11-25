import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  CustomerPublic,
  Order,
  OrderStatus,
  Product,
} from '../src/types.ts';

export interface StoredCustomer extends CustomerPublic {
  passwordHash: string;
}

export interface MpesaPendingSession {
  checkoutRequestId: string;
  phone: string;
  amountKes: number;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  shippingCity: string;
  shippingAddress: string;
  items: { productId: string; variant: string; quantity: number }[];
  status: 'PENDING_PIN' | 'CONFIRMED' | 'FAILED';
  receiptNumber?: string;
  orderNumber?: string;
  createdAt: string;
}

export interface DatabaseState {
  products: Product[];
  customers: StoredCustomer[];
  orders: Order[];
  mpesaSessions: MpesaPendingSession[];
  adminPasswordHash: string | null;
  nextOrderSeq: number;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_PATH = path.join(DATA_DIR, 'kipepeo-db.json');

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-audio-01',
    sku: 'KM-AUD-101',
    name: 'Studio ANC Wireless Headphones',
    brand: 'Amani Audio',
    category: 'Electronics',
    priceKes: 18500,
    compareAtKes: 21500,
    stock: 14,
    imageUrl: '/src/assets/images/prod_headphones_studio_1795603349358.jpg',
    description:
      'Active noise-cancelling over-ear headphones crafted with brushed aluminum yokes, breathable memory-foam ear cushions, and 38-hour USB-C fast-charging battery life.',
    variants: ['Matte Charcoal', 'Brushed Silver'],
    featured: true,
    createdAt: '2026-10-12T08:00:00.000Z',
  },
  {
    id: 'prod-kit-02',
    sku: 'KM-KIT-204',
    name: 'Precision Gooseneck Kettle & Mug Set',
    brand: 'Savanna Craft',
    category: 'Kitchen & Dining',
    priceKes: 11200,
    stock: 9,
    imageUrl: '/src/assets/images/prod_kettle_ceramics_1795603349585.jpg',
    description:
      'Variable-temperature electric pour-over kettle with steady 1200W quick heat and two speckled stoneware mugs glazed for daily morning coffee rituals.',
    variants: ['Matte Black + Sand Mugs', 'Matte Black Only'],
    featured: true,
    createdAt: '2026-10-15T09:30:00.000Z',
  },
  {
    id: 'prod-app-03',
    sku: 'KM-APP-309',
    name: 'Waxed Canvas Commuter Backpack',
    brand: 'Rift Goods',
    category: 'Apparel & Carry',
    priceKes: 9800,
    compareAtKes: 11500,
    stock: 18,
    imageUrl: '/src/assets/images/prod_backpack_canvas_1795603350164.jpg',
    description:
      'Weather-resistant 18oz waxed cotton canvas pack with full-grain vegetable-tanned leather trim, padded 16-inch laptop sleeve, and brass hardware.',
    variants: ['Field Olive', 'Slate Charcoal'],
    featured: true,
    createdAt: '2026-10-18T11:15:00.000Z',
  },
  {
    id: 'prod-bty-04',
    sku: 'KM-BTY-412',
    name: 'Botanical Baobab Serum & Night Cream Duo',
    brand: 'Nuru Botanicals',
    category: 'Beauty & Wellness',
    priceKes: 6400,
    stock: 22,
    imageUrl: '/src/assets/images/prod_skincare_botanical_1795603350181.jpg',
    description:
      'Cold-pressed East African baobab seed oil, rosehip, and vitamin E facial serum paired with a deeply hydrating shea and neroli night moisturizer.',
    variants: ['Full Duo Set', 'Serum 30ml Only'],
    featured: true,
    createdAt: '2026-10-20T14:00:00.000Z',
  },
  {
    id: 'prod-hom-05',
    sku: 'KM-HOM-518',
    name: 'Architectural Brass Task Lamp',
    brand: 'Studio Luma',
    category: 'Home & Living',
    priceKes: 13900,
    stock: 7,
    imageUrl: '/src/assets/images/prod_lamp_desk_1795603350899.jpg',
    description:
      'Dual-articulated brushed brass and matte charcoal LED desk lamp with stepless warm-to-neutral dimming and braided fabric cord.',
    variants: ['Brushed Brass / Charcoal', 'Matte Black'],
    featured: false,
    createdAt: '2026-10-25T10:00:00.000Z',
  },
  {
    id: 'prod-app-06',
    sku: 'KM-APP-602',
    name: 'Field Automatic Stainless Watch',
    brand: 'Kibo Horology',
    category: 'Apparel & Carry',
    priceKes: 24500,
    stock: 4,
    imageUrl: '/src/assets/images/prod_watch_chrono_1795603350652.jpg',
    description:
      '39mm brushed 316L stainless steel field timepiece featuring sapphire crystal, 100m water resistance, and a quick-dry forest weave nylon strap.',
    variants: ['Forest Strap 39mm', 'Sand Strap 39mm'],
    featured: true,
    createdAt: '2026-11-01T08:45:00.000Z',
  },
  {
    id: 'prod-kit-07',
    sku: 'KM-KIT-715',
    name: 'High-Torque Glass Countertop Blender',
    brand: 'Oak & Stone',
    category: 'Kitchen & Dining',
    priceKes: 15800,
    stock: 11,
    imageUrl: '/src/assets/images/prod_blender_kitchen_1795603350949.jpg',
    description:
      '1000W quiet-drive blender with 1.5L borosilicate glass pitcher, forged stainless blades, and precision rotary speed dial for smoothies and spice pastes.',
    variants: ['Matte Sage', 'Warm Stone'],
    featured: false,
    createdAt: '2026-11-05T13:20:00.000Z',
  },
  {
    id: 'prod-hom-08',
    sku: 'KM-HOM-820',
    name: 'Heavyweight Organic Linen Throw',
    brand: 'Tana Loom',
    category: 'Home & Living',
    priceKes: 7600,
    stock: 16,
    imageUrl: '/src/assets/images/prod_linen_throw_1795603352170.jpg',
    description:
      'Stone-washed 100% organic flax linen blanket woven in oatmeal and charcoal stripes with hand-knotted fringe for year-round breathable comfort.',
    variants: ['Oatmeal & Charcoal', 'Natural Sand'],
    featured: false,
    createdAt: '2026-11-09T16:10:00.000Z',
  },
];

const SEED_ORDERS: Order[] = [
  {
    orderNumber: 'KM-1041',
    customerName: 'Wanjiku Mwangi',
    customerEmail: 'wanjiku.m@example.co.ke',
    customerPhone: '254712345678',
    shippingCity: 'Nairobi — Kilimani',
    shippingAddress: 'Argwings Kodhek Rd, Apt 4B',
    items: [
      {
        productId: 'prod-kit-02',
        sku: 'KM-KIT-204',
        name: 'Precision Gooseneck Kettle & Mug Set',
        variant: 'Matte Black + Sand Mugs',
        unitPriceKes: 11200,
        quantity: 1,
        imageUrl: '/src/assets/images/prod_kettle_ceramics_1795603349585.jpg',
      },
    ],
    subtotalKes: 11200,
    deliveryFeeKes: 0,
    totalKes: 11200,
    paymentMethod: 'mpesa',
    paymentStatus: 'Paid',
    paymentReference: 'TJK82M49PL',
    status: 'Delivered',
    timeline: [
      {
        status: 'Pending',
        note: 'Order received and awaiting M-Pesa confirmation.',
        timestamp: '2026-11-18T09:12:00.000Z',
      },
      {
        status: 'Confirmed',
        note: 'M-Pesa receipt TJK82M49PL verified.',
        timestamp: '2026-11-18T09:13:00.000Z',
      },
      {
        status: 'Packed',
        note: 'Quality checked and packed at Nairobi Hub.',
        timestamp: '2026-11-18T11:40:00.000Z',
      },
      {
        status: 'Out for Delivery',
        note: 'Dispatched with Nairobi Express rider.',
        timestamp: '2026-11-18T13:15:00.000Z',
      },
      {
        status: 'Delivered',
        note: 'Signed and delivered at Kilimani address.',
        timestamp: '2026-11-18T14:48:00.000Z',
      },
    ],
    createdAt: '2026-11-18T09:12:00.000Z',
    updatedAt: '2026-11-18T14:48:00.000Z',
  },
  {
    orderNumber: 'KM-1042',
    customerName: 'David Ochieng',
    customerEmail: 'david.ochieng@example.co.ke',
    customerPhone: '254722890123',
    shippingCity: 'Nairobi — Westlands',
    shippingAddress: 'Waiyaki Way, Delta Corner Suites',
    items: [
      {
        productId: 'prod-audio-01',
        sku: 'KM-AUD-101',
        name: 'Studio ANC Wireless Headphones',
        variant: 'Matte Charcoal',
        unitPriceKes: 18500,
        quantity: 1,
        imageUrl: '/src/assets/images/prod_headphones_studio_1795603349358.jpg',
      },
      {
        productId: 'prod-bty-04',
        sku: 'KM-BTY-412',
        name: 'Botanical Baobab Serum & Night Cream Duo',
        variant: 'Full Duo Set',
        unitPriceKes: 6400,
        quantity: 1,
        imageUrl: '/src/assets/images/prod_skincare_botanical_1795603350181.jpg',
      },
    ],
    subtotalKes: 24900,
    deliveryFeeKes: 0,
    totalKes: 24900,
    paymentMethod: 'card',
    paymentStatus: 'Paid',
    paymentReference: 'CRD-884120',
    cardLast4: '4242',
    status: 'Out for Delivery',
    timeline: [
      {
        status: 'Pending',
        note: 'Order placed via Visa card ending 4242.',
        timestamp: '2026-11-24T08:30:00.000Z',
      },
      {
        status: 'Confirmed',
        note: 'Card authorization CRD-884120 cleared.',
        timestamp: '2026-11-24T08:31:00.000Z',
      },
      {
        status: 'Packed',
        note: 'Items sealed and labeled at Nairobi Westlands Depot.',
        timestamp: '2026-11-24T10:15:00.000Z',
      },
      {
        status: 'Out for Delivery',
        note: 'Courier en route to Westlands — ETA today before 17:00.',
        timestamp: '2026-11-24T12:05:00.000Z',
      },
    ],
    createdAt: '2026-11-24T08:30:00.000Z',
    updatedAt: '2026-11-24T12:05:00.000Z',
  },
];

function createInitialState(): DatabaseState {
  return {
    products: SEED_PRODUCTS,
    customers: [],
    orders: SEED_ORDERS,
    mpesaSessions: [],
    adminPasswordHash: null,
    nextOrderSeq: 1043,
  };
}

export function loadDatabase(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      const initial = createInitialState();
      saveDatabase(initial);
      return initial;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    return {
      products: Array.isArray(parsed.products) ? parsed.products : SEED_PRODUCTS,
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : SEED_ORDERS,
      mpesaSessions: Array.isArray(parsed.mpesaSessions) ? parsed.mpesaSessions : [],
      adminPasswordHash:
        typeof parsed.adminPasswordHash === 'string' ? parsed.adminPasswordHash : null,
      nextOrderSeq: typeof parsed.nextOrderSeq === 'number' ? parsed.nextOrderSeq : 1043,
    };
  } catch {
    const initial = createInitialState();
    saveDatabase(initial);
    return initial;
  }
}

export function saveDatabase(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${DB_PATH}.tmp.${process.pid}`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export interface TokenPayload {
  sub: string;
  role: 'customer' | 'admin';
  email?: string;
  exp: number;
}

export function signToken(payload: Omit<TokenPayload, 'exp'>, ttlMs = 7 * 24 * 3600 * 1000): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
  };
  const body = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(body)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!decoded || typeof decoded.exp !== 'number' || decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function sanitizeCustomer(c: StoredCustomer): CustomerPublic {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    city: c.city,
    address: c.address,
    createdAt: c.createdAt,
  };
}

export function normalizeKenyanPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) {
    return `254${digits}`;
  }
  return digits;
}

export function generateMpesaReceipt(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'TJ';
  for (let i = 0; i < 8; i++) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

export function isValidOrderStatus(status: string): status is OrderStatus {
  return (
    status === 'Pending' ||
    status === 'Confirmed' ||
    status === 'Packed' ||
    status === 'Out for Delivery' ||
    status === 'Delivered' ||
    status === 'Cancelled'
  );
}
