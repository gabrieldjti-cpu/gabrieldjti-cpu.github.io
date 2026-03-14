export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  planId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'SELLER' | 'CUSTOMER';
  joinedAt: Date;
}

export interface Product {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  inventory: number;
  sku: string;
  image: string | null;
  category: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  product?: Product;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  organizationId: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED' | 'REFUNDED';
  totalAmount: number;
  taxAmount: number;
  shippingAmount: number;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  stripePaymentId: string | null;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  type: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  name: string;
  description: string | null;
  price: number;
  stripePriceId: string | null;
  maxProducts: number;
  maxOrders: number;
  maxUsers: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}
