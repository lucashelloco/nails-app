import Dexie, { type EntityTable } from 'dexie'
import type { Client, ClientInput, Product, ProductInput, Service, ServiceInput } from '../types'
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
  services!: EntityTable<Service, 'id'>

  constructor() {
    super('nail-app')
    this.version(1).stores({
      products: 'id, name, category, quantity',
      clients: 'id, lastName, firstName, phone',
    })
    this.version(2).stores({
      products: 'id, name, category, quantity',
      clients: 'id, lastName, firstName, phone',
      services: 'id, name, duration, price',
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

export const defaultServices: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Manucure russe', duration: 30, price: 55, color: '#CFE8FF', notes: 'Manucure soin' },
  { name: 'Renfort', duration: 90, price: 70, color: '#F9DCE8', notes: 'Renfort sur gel' },
  { name: 'Gainage', duration: 105, price: 85, color: '#D9F0D3', notes: 'Gainage renforcé' },
  { name: 'Semi pieds', duration: 45, price: 60, color: '#F9C98D', notes: 'Semi-permanent pieds' },
  { name: 'Rallongement', duration: 120, price: 95, color: '#E5D5FF', notes: 'Rallongement complet' },
  { name: 'Semi mains + pieds', duration: 135, price: 100, color: '#E9A8C8', notes: 'Semi-permanent mains et pieds' },
  { name: 'Gainage mains + pieds', duration: 150, price: 120, color: '#8CCF8F', notes: 'Gainage mains et pieds' },
  { name: 'Rallongement mains + pieds', duration: 165, price: 140, color: '#B69AEF', notes: 'Rallongement mains et pieds' },
  { name: 'Dépose', duration: 45, price: 30, color: '#CFE8FF', notes: 'Dépose plus soin' },
]

export async function seedDefaultServices() {
  const existingServices = await db.services.toArray()
  const existingNames = new Set(existingServices.map((service) => service.name))
  const missingServices = defaultServices.filter((service) => !existingNames.has(service.name))
  if (missingServices.length === 0) return

  const now = new Date().toISOString()
  const services = missingServices.map((service) => ({
    ...service,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }))

  await db.services.bulkPut(services)
}

export async function addService(input: ServiceInput) {
  const service: Service = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await db.services.put(service)
  return service
}

export async function updateService(id: string, changes: Partial<ServiceInput>) {
  const current = await db.services.get(id)
  if (!current) return
  const next: Service = {
    ...current,
    ...changes,
    updatedAt: new Date().toISOString(),
  }
  await db.services.put(next)
  return next
}

export async function deleteService(id: string) {
  await db.services.delete(id)
}

/** Vide la copie locale (à la déconnexion). */
export async function clearLocalData() {
  await db.transaction('rw', db.products, db.clients, db.services, async () => {
    await db.products.clear()
    await db.clients.clear()
    await db.services.clear()
  })
}
