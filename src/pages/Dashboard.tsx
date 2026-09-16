import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { addClient, db } from '../db/db'
import UpcomingAppointments from '../components/UpcomingAppointments'
import Modal from '../components/Modal'
import AppointmentForm, { type AppointmentInput } from '../components/forms/AppointmentForm'
import ClientForm from '../components/forms/ClientForm'
import { createAppointment, ensureToken, GoogleAuthError } from '../lib/googleCalendar'
import { useGoogleConnection } from '../lib/useGoogleConnection'
import type { ClientInput } from '../types'

export default function Dashboard() {
  const products = useLiveQuery(() => db.products.toArray(), [])
  const clients = useLiveQuery(() => db.clients.toArray(), [])
  const connected = useGoogleConnection()
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientFormOpen, setClientFormOpen] = useState(false)

  const lowStock = products?.filter((p) => p.quantity <= p.lowStockThreshold) ?? []

  async function handleSubmit(input: AppointmentInput) {
    const selectedClient = clients?.find((client) => client.id === input.clientId)
    if (!selectedClient) {
      setError('Un rendez-vous doit être lié à un(e) client(e) existant(e).')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createAppointment({
        ...input,
        clientId: selectedClient.id,
        clientName: `${selectedClient.firstName} ${selectedClient.lastName}`,
        clientPhone: selectedClient.phone,
      })
      setFormOpen(false)
    } catch (e) {
      console.error(e)
      setError(e instanceof GoogleAuthError ? 'Session Google expirée : reconnecte-toi puis recommence.' : 'Le rendez-vous n’a pas pu être créé.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateClient(input: ClientInput) {
    await addClient(input)
    setClientFormOpen(false)
  }

  function openForm() {
    setError(null)
    if (connected) {
      setFormOpen(true)
      return
    }
    ensureToken().then(() => setFormOpen(true)).catch(() => setError('Connexion Google annulée.'))
  }

  return (
    <div className="space-y-4">
      <div>
        <button
          type="button"
          onClick={openForm}
          aria-label="Créer un rendez-vous"
          className="w-full rounded-lg bg-[#8a6448] px-4 py-2 text-sm font-medium text-white"
        >
          <FontAwesomeIcon icon={faPlus} className="sm:mr-2" />
          <span className="hidden sm:inline">Créer un RDV</span>
        </button>
      </div>

      {error && <p className="text-sm text-[#8f6a52]">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/stock"
          className="bg-white rounded-xl border border-[#ead8c7] p-4 flex flex-col gap-1"
        >
          <span className="text-2xl font-semibold text-[#8a6448]">
            {products?.length ?? '…'}
          </span>
          <span className="text-sm text-neutral-500">produits en stock</span>
        </Link>
        <Link
          to="/clientes"
          className="bg-white rounded-xl border border-[#ead8c7] p-4 flex flex-col gap-1"
        >
          <span className="text-2xl font-semibold text-[#8a6448]">
            {clients?.length ?? '…'}
          </span>
          <span className="text-sm text-neutral-500">client(e)s enregistré(e)s</span>
        </Link>
      </div>

      <UpcomingAppointments />

      <div className="bg-white rounded-xl border border-[#ead8c7] p-4">
        <h2 className="text-sm font-semibold text-neutral-700 mb-2">
          Stock bas ({lowStock.length})
        </h2>
        {lowStock.length === 0 ? (
          <p className="text-sm text-neutral-500">Tout est au vert, aucun produit à recommander.</p>
        ) : (
          <ul className="space-y-1.5">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">{p.name}</span>
                <span className="text-amber-700 font-medium tabular-nums">
                  {p.quantity} {p.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <Modal title="Nouveau rendez-vous" onClose={() => setFormOpen(false)}>
          <AppointmentForm
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={() => setFormOpen(false)}
            submitLabel="Créer le RDV"
            clients={clients ?? []}
            onCreateClient={() => setClientFormOpen(true)}
          />
        </Modal>
      )}

      {clientFormOpen && (
        <Modal title="Nouveau / nouvelle client(e)" onClose={() => setClientFormOpen(false)}>
          <ClientForm
            onSubmit={handleCreateClient}
            onCancel={() => setClientFormOpen(false)}
          />
        </Modal>
      )}
    </div>
  )
}
