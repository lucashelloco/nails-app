import Dexie, { type EntityTable } from 'dexie'
import type { Client, ClientInput, Product, ProductInput } from '../types'
import { supabase } from '../lib/supabase'
import {
  clientToRow,
  productToRow,
  rowToClient,
  rowToProduct,
  type ClientRow,
  type ProductRow,
} from './mappers'

// Supabase est la source de vérité (données partagées entre Mac, iPhone,
// iPad…). Dexie (IndexedDB) sert de copie locale : les écrans lisent
// dans Dexie, ce qui permet de consulter les données hors ligne.
// Les écritures passent par Supabase puis mettent à jour la copie locale.
class NailAppDB extends Dexie {
  products!: EntityTable<Product, 'id'>
  clients!: EntityTable<Client, 'id'>

  constructor() {
    super('nail-app')
    this.version(1).stores({
      products: 'id, name, category, quantity',
      clients: 'id, lastName, firstName, phone',
    })
  }
}

export const db = new NailAppDB()

export class OfflineError extends Error {
  constructor() {
    super('Pas de connexion internet : les modifications sont impossibles hors ligne.')
  }
}

function ensureOnline() {
  if (!navigator.onLine) throw new OfflineError()
}

// --- Produits (stock) ---------------------------------------------------

export async function addProduct(input: ProductInput) {
  ensureOnline()
  const { data, error } = await supabase
    .from('products')
    .insert(productToRow(input))
    .select()
    .single<ProductRow>()
  if (error) throw error
  const product = rowToProduct(data)
  await db.products.put(product)
  return product
}

export async function updateProduct(id: string, changes: Partial<ProductInput>) {
  ensureOnline()
  const { data, error } = await supabase
    .from('products')
    .update(productToRow(changes))
    .eq('id', id)
    .select()
    .single<ProductRow>()
  if (error) throw error
  await db.products.put(rowToProduct(data))
}

export async function adjustProductQuantity(id: string, delta: number) {
  ensureOnline()
  const { data, error } = await supabase
    .rpc('adjust_product_quantity', { p_id: id, p_delta: delta })
    .single<ProductRow>()
  if (error) throw error
  await db.products.put(rowToProduct(data))
}

export async function deleteProduct(id: string) {
  ensureOnline()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
  await db.products.delete(id)
}

// --- Clientes -------------------------------------------------------------

export async function addClient(input: ClientInput) {
  ensureOnline()
  const { data, error } = await supabase
    .from('clients')
    .insert(clientToRow(input))
    .select()
    .single<ClientRow>()
  if (error) throw error
  const client = rowToClient(data)
  await db.clients.put(client)
  return client
}

export async function updateClient(id: string, changes: Partial<ClientInput>) {
  ensureOnline()
  const { data, error } = await supabase
    .from('clients')
    .update(clientToRow(changes))
    .eq('id', id)
    .select()
    .single<ClientRow>()
  if (error) throw error
  await db.clients.put(rowToClient(data))
}

export async function deleteClient(id: string) {
  ensureOnline()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
  await db.clients.delete(id)
}

/** Vide la copie locale (à la déconnexion). */
export async function clearLocalData() {
  await db.transaction('rw', db.products, db.clients, async () => {
    await db.products.clear()
    await db.clients.clear()
  })
}
