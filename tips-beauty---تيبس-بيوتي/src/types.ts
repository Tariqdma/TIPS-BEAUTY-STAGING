
export interface Review {
  id: string;
  productId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
}

export interface ProductVariant {
  id: string;
  name_ar: string;
  name_en: string;
  priceOverride?: number;
  stock: number;
}

export interface Product {
  id: string;
  name_ar: string;
  name_en: string;
  price: number;
  discountPercentage?: number;
  costPrice?: number;
  category: string;
  brand: string;
  image: string;
  images?: string[];
  description: string;
  benefits: string[];
  ingredients: string[];
  usage: string;
  origin: string;
  expiry: string;
  stock: number;
  isImported: boolean;
  skinType?: string[];
  reviews?: Review[];
  rating?: number; // Average rating
  reviewCount?: number;
  variants?: ProductVariant[];
  createdAt: string;
}

export interface Category {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  company?: string;
  status: 'active' | 'busy' | 'offline';
}

export interface Promotion {
  id: string;
  name: string;
  type: 'product' | 'category' | 'all';
  targetId?: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  discountedPrice?: number;
  selectedVariantId?: string;
}

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'COD' | 'Fawry' | 'Mychashi';

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed';
  state: string;
  city: string;
  address: string;
  createdAt: string;
  assignedDriverId?: string;
  adminNotes?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  discountFromPoints?: number;
}

export type AppView = 'home' | 'product' | 'cart' | 'checkout' | 'admin' | 'ai-chat' | 'success' | 'profile' | 'order-tracking';
export type AdminSubView = 'dashboard' | 'orders' | 'products' | 'delivery' | 'accounting' | 'ai-insights' | 'promotions' | 'categories';
