import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addClient, db, deleteClient, updateClient } from '../db/db'
import type { Client, ClientInput } from '../types'
import Modal from '../components/Modal'
import ClientForm from '../components/forms/ClientForm'
import { runSafely } from '../lib/runSafely'
import ClientAppointments from '../components/ClientAppointments'

export default function Clients() {
  const clients = useLiveQuery(() => db.clients.orderBy('lastName').toArray(), [])
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Client | 'new' | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!clients) return []
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    )
  }, [clients, query])

  async function handleSubmit(input: ClientInput) {
    await runSafely(async () => {
      if (editing && editing !== 'new') {
        await updateClient(editing.id, input)
      } else {
        await addClient(input)
      }
      setEditing(null)
    })
  }

  async function handleDelete(id: string) {
    if (confirm('Supprimer cette fiche cliente ?')) {
      await runSafely(async () => {
        await deleteClient(id)
        setOpenId(null)
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une cliente…"
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        <button
          onClick={() => setEditing('new')}
          className="shrink-0 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
        >
          + Ajouter
        </button>
      </div>

      {clients && clients.length === 0 && (
        <p className="text-center text-sm text-neutral-500 py-10">
          Aucune cliente pour l'instant. Ajoute ta première fiche cliente.
        </p>
      )}

      <ul className="space-y-2">
        {filtered.map((client) => {
          const isOpen = openId === client.id
          return (
            <li key={client.id} className="bg-white rounded-xl border border-rose-100 overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : client.id)}
                className="w-full text-left p-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-semibold shrink-0">
                  {client.firstName[0]}
                  {client.lastName[0]}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-neutral-800">
                    {client.firstName} {client.lastName}
                  </div>
                  {client.phone && <div className="text-xs text-neutral-500">{client.phone}</div>}
                </div>
                <span className="text-neutral-300">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-rose-50 pt-2">
                  {client.email && (
                    <div className="text-sm text-neutral-600">✉️ {client.email}</div>
                  )}
                  {client.notes && (
                    <p className="text-sm text-neutral-600 whitespace-pre-wrap">{client.notes}</p>
                  )}
                  <ClientAppointments client={client} />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setEditing(client)}
                      className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-600"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="flex-1 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-500"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {editing && (
        <Modal
          title={editing === 'new' ? 'Nouvelle cliente' : 'Modifier la fiche'}
          onClose={() => setEditing(null)}
        >
          <ClientForm
            initial={editing === 'new' ? undefined : editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  )
}
