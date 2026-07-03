import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export interface Product {
  id: string;
  category: string;
  name: string;
  price: number;
  description: string | null;
  image: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  category: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  is_available?: boolean;
  sort_order?: number;
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getProductsByNames(names: string[]): Promise<Product[]> {
  if (!names.length) return [];

  const { data, error } = await supabase
    .from("products")
    .select("name, price, category, image, is_available")
    .in("name", names);

  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();

  if (error) throw error;
  return data;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const insertData: TablesInsert<"products"> = {
    category: input.category,
    name: input.name,
    price: input.price,
    description: input.description || null,
    image: input.image || null,
    is_available: input.is_available ?? true,
    sort_order: input.sort_order ?? 0,
  };

  const { data, error } = await supabase.from("products").insert(insertData).select().single();

  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const patch: TablesUpdate<"products"> = input;

  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) throw error;
}

export async function bulkUpdateProducts(
  updates: Array<{ id: string; changes: Partial<ProductInput> }>,
): Promise<void> {
  const promises = updates.map(({ id, changes }) => updateProduct(id, changes));
  await Promise.all(promises);
}
