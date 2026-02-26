export type Role = 'admin' | 'client';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
}

export interface Product {
  id: number;
  pt_ref: string;
  description: string;
  category: string;
  brand_id: string;
  created_at: string;
}

export interface Client {
  id: number;
  company_name: string;
  contact_person: string;
  created_by: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Price {
  id: number;
  product_id: number;
  client_id: number | null;
  currency: string;
  min_qty: number;
  price: number;
  created_at: string;
}

export interface QuoteLine {
  product: Product;
  quantity: number;
}
