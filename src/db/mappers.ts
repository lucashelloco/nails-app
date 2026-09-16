// Conversion entre les lignes Supabase (snake_case) et les objets de l'appli (camelCase).
import type { Client, ClientInput, Product, ProductCategory, ProductInput } from '../types'

export interface ProductRow {
  id: string
  name: string
  category: ProductCategory
  brand: string | null
  quantity: number
  unit: string
  low_stock_threshold: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ClientRow {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    brand: r.brand ?? undefined,
    quantity: r.quantity,
    unit: r.unit,
    lowStockThreshold: r.low_stock_threshold,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function rowToClient(r: ClientRow): Client {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// Seuls les champs présents dans l'objet sont envoyés ; un champ présent mais
// `undefined` (ex. marque effacée) devient `null` pour être vidé en base.
export function productToRow(p: Partial<ProductInput>) {
  const row: Record<string, unknown> = {}
  if ('name' in p) row.name = p.name
  if ('category' in p) row.category = p.category
  if ('brand' in p) row.brand = p.brand ?? null
  if ('quantity' in p) row.quantity = p.quantity
  if ('unit' in p) row.unit = p.unit
  if ('lowStockThreshold' in p) row.low_stock_threshold = p.lowStockThreshold
  if ('notes' in p) row.notes = p.notes ?? null
  return row
}

export function clientToRow(c: Partial<ClientInput>) {
  const row: Record<string, unknown> = {}
  if ('firstName' in c) row.first_name = c.firstName
  if ('lastName' in c) row.last_name = c.lastName
  if ('phone' in c) row.phone = c.phone ?? null
  if ('email' in c) row.email = c.email ?? null
  if ('notes' in c) row.notes = c.notes ?? null
  return row
}
