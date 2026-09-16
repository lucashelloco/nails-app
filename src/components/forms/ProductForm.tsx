import { useState, type FormEvent } from 'react'
import type { Product, ProductCategory, ProductInput } from '../../types'

const categories: { value: ProductCategory; label: string }[] = [
  { value: 'vernis', label: 'Vernis' },
  { value: 'gel', label: 'Gel / semi-permanent' },
  { value: 'capsule', label: 'Capsules / tips' },
  { value: 'outillage', label: 'Outillage' },
  { value: 'consommable', label: 'Consommable' },
  { value: 'autre', label: 'Autre' },
]

interface ProductFormProps {
  initial?: Product
  onSubmit: (input: ProductInput) => void
  onCancel: () => void
}

export default function ProductForm({ initial, onSubmit, onCancel }: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<ProductCategory>(initial?.category ?? 'vernis')
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity ?? 0)
  const [unit, setUnit] = useState(initial?.unit ?? 'unités')
  const [lowStockThreshold, setLowStockThreshold] = useState(initial?.lowStockThreshold ?? 2)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      category,
      brand: brand.trim() || undefined,
      quantity,
      unit: unit.trim() || 'unités',
      lowStockThreshold,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">
          Nom du produit
        </label>
        <input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Gel UV rose poudré"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Catégorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ProductCategory)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Marque</label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Optionnel"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Quantité</label>
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Unité</label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Seuil alerte</label>
          <input
            type="number"
            min={0}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Référence fournisseur, teinte, etc."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 font-medium text-neutral-600"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="flex-1 rounded-lg bg-[#8a6448] py-2.5 font-medium text-white"
        >
          Enregistrer
        </button>
      </div>
    </form>
  )
}
