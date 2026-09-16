import Dexie, { type EntityTable } from 'dexie'
import type { Client, Product } from '../types'

// Base locale (IndexedDB). L'appli est "offline-first" : toutes les
// données vivent sur l'appareil, ce qui permet à la PWA de fonctionner
// sans connexion (pratique en institut). Un service de synchronisation
// pourra être branché plus tard sans changer l'UI (voir README).
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

function nowISO() {
  return new Date().toISOString()
}

function newId() {
  return crypto.randomUUID()
}

// --- Produits (stock) ---------------------------------------------------

export async function addProduct(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  const product: Product = {
    ...input,
    id: newId(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  await db.products.add(product)
  return product
}

export async function updateProduct(id: string, changes: Partial<Product>) {
  await db.products.update(id, { ...changes, updatedAt: nowISO() })
}

export async function adjustProductQuantity(id: string, delta: number) {
  const product = await db.products.get(id)
  if (!product) return
  const quantity = Math.max(0, product.quantity + delta)
  await db.products.update(id, { quantity, updatedAt: nowISO() })
}

export async function deleteProduct(id: string) {
  await db.products.delete(id)
}

// --- Clientes -------------------------------------------------------------

export async function addClient(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) {
  const client: Client = {
    ...input,
    id: newId(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  await db.clients.add(client)
  return client
}

export async function updateClient(id: string, changes: Partial<Client>) {
  await db.clients.update(id, { ...changes, updatedAt: nowISO() })
}

export async function deleteClient(id: string) {
  await db.clients.delete(id)
}
