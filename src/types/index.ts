export type ProductCategory =
  | 'vernis'
  | 'gel'
  | 'capsule'
  | 'outillage'
  | 'consommable'
  | 'autre'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  brand?: string
  quantity: number
  unit: string // ex: "unités", "ml", "boîte"
  lowStockThreshold: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  phone?: string
  email?: string
  // Préférences, allergies, techniques habituelles, etc.
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  name: string
  duration: number
  price?: number
  color: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
export type ServiceInput = Omit<Service, 'id' | 'createdAt' | 'updatedAt'>
