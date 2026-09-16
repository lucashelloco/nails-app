import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addProduct, adjustProductQuantity, db, deleteProduct, updateProduct } from '../db/db'
import type { Product, ProductInput } from '../types'
import Modal from '../components/Modal'
import ProductForm from '../components/forms/ProductForm'
import { runSafely } from '../lib/runSafely'

export default function Stock() {
  const products = useLiveQuery(() => db.products.orderBy('name').toArray(), [])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  const filtered = useMemo(() => {
    if (!products) return []
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q),
    )
  }, [products, query])

  async function handleSubmit(input: ProductInput) {
    await runSafely(async () => {
      if (editing && editing !== 'new') {
        await updateProduct(editing.id, input)
      } else {
        await addProduct(input)
      }
      setEditing(null)
    })
  }

  async function handleDelete(id: string) {
    if (confirm('Supprimer ce produit du stock ?')) {
      await runSafely(() => deleteProduct(id))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un produit…"
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        <button
          onClick={() => setEditing('new')}
          className="shrink-0 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
        >
          + Ajouter
        </button>
      </div>

      {products && products.length === 0 && (
        <p className="text-center text-sm text-neutral-500 py-10">
          Aucun produit pour l'instant. Ajoute ton premier produit de stock.
        </p>
      )}

      <ul className="space-y-2">
        {filtered.map((product) => {
          const low = product.quantity <= product.lowStockThreshold
          return (
            <li
              key={product.id}
              className="bg-white rounded-xl border border-rose-100 p-3 flex items-center gap-3"
            >
              <button
                onClick={() => setEditing(product)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-800">{product.name}</span>
                  {low && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                      Stock bas
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-500">
                  {product.brand ? `${product.brand} · ` : ''}
                  {product.category}
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => runSafely(() => adjustProductQuantity(product.id, -1))}
                  aria-label="Retirer une unité"
                  className="w-8 h-8 rounded-full border border-neutral-300 text-neutral-600 flex items-center justify-center"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">
                  {product.quantity}
                </span>
                <button
                  onClick={() => runSafely(() => adjustProductQuantity(product.id, 1))}
                  aria-label="Ajouter une unité"
                  className="w-8 h-8 rounded-full border border-neutral-300 text-neutral-600 flex items-center justify-center"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => handleDelete(product.id)}
                aria-label="Supprimer"
                className="text-neutral-300 hover:text-red-500 px-1 shrink-0"
              >
                🗑
              </button>
            </li>
          )
        })}
      </ul>

      {editing && (
        <Modal
          title={editing === 'new' ? 'Nouveau produit' : 'Modifier le produit'}
          onClose={() => setEditing(null)}
        >
          <ProductForm
            initial={editing === 'new' ? undefined : editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  )
}
