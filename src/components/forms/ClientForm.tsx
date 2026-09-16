import { useState, type FormEvent } from 'react'
import type { Client, ClientInput } from '../../types'

interface ClientFormProps {
  initial?: Client
  onSubmit: (input: ClientInput) => void
  onCancel: () => void
}

export default function ClientForm({ initial, onSubmit, onCancel }: ClientFormProps) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? '')
  const [lastName, setLastName] = useState(initial?.lastName ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Prénom</label>
          <input
            autoFocus
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-600 mb-1">Nom</label>
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Téléphone</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="06 12 34 56 78"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-600 mb-1">
          Notes (préférences, allergies, technique habituelle…)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400"
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
          className="flex-1 rounded-lg bg-rose-600 py-2.5 font-medium text-white"
        >
          Enregistrer
        </button>
      </div>
    </form>
  )
}
