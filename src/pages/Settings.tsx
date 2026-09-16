import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type FormEvent } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faPen, faPlus, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'
import { addService, db, deleteService, updateService } from '../db/db'
import type { Service, ServiceInput } from '../types'
import Modal from '../components/Modal'
import { getAppName, saveAppName } from '../lib/appSettings'

export default function Settings() {
  const services = useLiveQuery(() => db.services.orderBy('name').toArray(), []) ?? []
  const [appName, setAppName] = useState(getAppName)
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
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setAppName(saveAppName(appName))
        }}
        className="rounded-xl border border-[#ead8c7] bg-white p-4"
      >
        <label className="block text-sm font-semibold text-neutral-800" htmlFor="app-name">
          Nom de l’institut
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="app-name"
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            maxLength={40}
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b48f74]"
          />
          <button
            type="submit"
            aria-label="Enregistrer le nom de l’institut"
            className="mobile-icon-button rounded-lg bg-[#8a6448] px-4 py-2 text-sm font-medium text-white"
          >
            <FontAwesomeIcon icon={faCheck} className="sm:mr-2" />
            <span className="hidden sm:inline">Enregistrer</span>
          </button>
        </div>
      </form>

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
          aria-label="Ajouter une prestation"
          className="mobile-icon-button shrink-0 rounded-lg bg-[#8a6448] px-4 py-2 text-sm font-medium text-white"
        >
          <FontAwesomeIcon icon={faPlus} className="sm:mr-2" />
          <span className="hidden sm:inline">Ajouter</span>
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
                  aria-label="Modifier la prestation"
                  className="mobile-icon-button rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700"
                >
                  <FontAwesomeIcon icon={faPen} className="sm:mr-1" />
                  <span className="hidden sm:inline">Modifier</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(service.id)}
                  aria-label="Supprimer la prestation"
                  className="mobile-icon-button rounded-lg border border-[#d7bda3] px-2 py-1 text-xs font-medium text-[#8f6a52]"
                >
                  <FontAwesomeIcon icon={faTrash} className="sm:mr-1" />
                  <span className="hidden sm:inline">Supprimer</span>
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
          aria-label="Annuler"
          className="mobile-icon-button flex-1 rounded-lg border border-neutral-300 py-2.5 font-medium text-neutral-600"
        >
          <FontAwesomeIcon icon={faXmark} className="sm:mr-2" />
          <span className="hidden sm:inline">Annuler</span>
        </button>
        <button
          type="submit"
          aria-label="Enregistrer"
          className="mobile-icon-button flex-1 rounded-lg bg-[#8a6448] py-2.5 font-medium text-white"
        >
          <FontAwesomeIcon icon={faCheck} className="sm:mr-2" />
          <span className="hidden sm:inline">Enregistrer</span>
        </button>
      </div>
    </form>
  )
}
