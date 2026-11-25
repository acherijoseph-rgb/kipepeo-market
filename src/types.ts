export type ProductCategory =
  | 'Electronics'
  | 'Home & Living'
  | 'Apparel & Carry'
  | 'Beauty & Wellness'
  | 'Kitchen & Dining';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Electronics',
  'Home & Living',
  'Apparel & Carry',
  'Beauty & Wellness',
  'Kitchen & Dining',
];

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  priceKes: number;
  compareAtKes?: number;
  stock: number;
  imageUrl: string;
  description: string;
  variants: string[];
  featured: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  variant: string;
  quantity: number;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Packed'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type PaymentMethod = 'mpesa' | 'card';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed';

export interface OrderTimelineEvent {
  status: OrderStatus;
  note: string;
  timestamp: string;
}

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  variant: string;
  unitPriceKes: number;
  quantity: number;
  imageUrl: string;
}

export interface Order {
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingCity: string;
  shippingAddress: string;
  items: OrderItem[];
  subtotalKes: number;
  deliveryFeeKes: number;
  totalKes: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  mpesaCheckoutRequestId?: string;
  cardLast4?: string;
  status: OrderStatus;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPublic {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  createdAt: string;
  orderCount?: number;
  totalSpentKes?: number;
}

export interface PaymentConfigStatus {
  mpesaConfigured: boolean;
  cardConfigured: boolean;
  modeLabel: string;
}

export interface AdminOverviewResponse {
  stats: {
    totalRevenueKes: number;
    totalOrders: number;
    activeOrders: number;
    totalProducts: number;
    lowStockCount: number;
    totalCustomers: number;
  };
  orders: Order[];
  customers: CustomerPublic[];
  paymentConfig: PaymentConfigStatus;
}

export const FREE_DELIVERY_THRESHOLD_KES = 5000;
export const STANDARD_DELIVERY_FEE_KES = 350;

export function formatKES(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString('en-KE')}`;
}
