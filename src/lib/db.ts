import { supabase } from './supabase';

export const catalogDb = supabase.schema('catalog');
export const salesDb = supabase.schema('sales');
export const authDb = supabase.schema('app_auth');
