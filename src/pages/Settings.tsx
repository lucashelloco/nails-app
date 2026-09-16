import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type FormEvent } from 'react'
import { addService, db, deleteService, updateService } from '../db/db'
import type { Service, ServiceInput } from '../types'
import Modal from '../components/Modal'

export default function Settings() {
  const services = useLiveQuery(() => db.services.orderBy('name').toArray(), []) ?? []
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Service | 'new' | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return services
    return services.filter((service) =>
      service.name.toLowerCase().includes(q) || service.notes?.toLowerCase().includes(q),
    )
  }, [query, services])

  async function handleSubmit(input: ServiceInput) {
    if (editing && editing !== 'new') {
      await updateService(editing.id, input)
    } else {
      await addService(input)
    }
    setEditing(null)
  }

  async function handleDelete(id: string) {
    if (confirm('Supprimer cette prestation ?')) {
      await deleteService(id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#ead8c7] bg-white p-4">
        <h2 className="text-base font-semibold text-neutral-800">Prestations</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Gère les types de prestations, leur durée et leur prix.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une prestation…"
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
        />
        <button
          onClick={() => setEditing('new')}
          className="shrink-0 rounded-lg bg-[#8a6448] px-4 py-2 text-sm font-medium text-white"
        >
          + Ajouter
        </button>
      </div>

      {services.length === 0 && (
        <p className="text-sm text-neutral-500">Aucune prestation pour l'instant.</p>
      )}

      <ul className="space-y-2">
        {filtered.map((service) => (
          <li key={service.id} className="rounded-xl border border-[#ead8c7] bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: service.color || '#d1d5db' }}
                  />
                  <span className="font-medium text-neutral-800">{service.name}</span>
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {service.duration} min · {service.price} €
                </div>
                {service.notes && (
                  <p className="mt-1 text-xs text-neutral-500">{service.notes}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(service)}
                  className="rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(service.id)}
                  className="rounded-lg border border-[#d7bda3] px-2 py-1 text-xs font-medium text-[#8f6a52]"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <Modal
          title={editing === 'new' ? 'Nouvelle prestation' : 'Modifier la prestation'}
          onClose={() => setEditing(null)}
        >
          <ServiceForm
            initial={editing === 'new' ? undefined : editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  )
}

interface ServiceFormProps {
  initial?: Service
  onSubmit: (input: ServiceInput) => void
  onCancel: () => void
}

function ServiceForm({ initial, onSubmit, onCancel }: ServiceFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [duration, setDuration] = useState(initial?.duration ?? 60)
  const [price, setPrice] = useState(initial?.price ?? 60)
  const [color, setColor] = useState(initial?.color ?? '#CFE8FF')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      duration,
      price,
      color,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Nom</label>
        <input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Durée (min)</label>
          <input
            type="number"
            min={15}
            step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Prix (€)</label>
          <input
            type="number"
            min={0}
            step={5}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Couleur</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-14 rounded border border-neutral-300 bg-white p-1"
          />
          <span className="text-sm text-neutral-500">{color}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Note</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
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
