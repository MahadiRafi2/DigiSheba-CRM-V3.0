export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Customer {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  source: string;
  created_at: string;
}

export interface Product {
  id: number;
  user_id: number;
  name: string;
  type: '1month' | '3month' | '6month' | '1year' | '2year' | '3year' | 'lifetime';
  cost_price?: number;
  selling_price: number;
}

export interface Sale {
  id: number;
  user_id: number;
  customer_id: number;
  product_id: number;
  amount: number;
  profit: number;
  payment_method: string;
  date: string;
  renewal_date: string;
  customer_name?: string;
  product_name?: string;
  status?: string;
  email?: string;
  phone?: string;
}

export interface Expense {
  id: number;
  user_id: number;
  category: string;
  amount: number;
  date: string;
  description: string;
}

export interface DashboardStats {
  revenue: number;
  profit: number;
  expenses: number;
  netProfit: number;
  customers: number;
}
