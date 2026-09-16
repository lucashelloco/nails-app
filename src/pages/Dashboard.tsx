import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import UpcomingAppointments from '../components/UpcomingAppointments'

export default function Dashboard() {
  const products = useLiveQuery(() => db.products.toArray(), [])
  const clients = useLiveQuery(() => db.clients.toArray(), [])

  const lowStock = products?.filter((p) => p.quantity <= p.lowStockThreshold) ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/stock"
          className="bg-white rounded-xl border border-rose-100 p-4 flex flex-col gap-1"
        >
          <span className="text-2xl font-semibold text-rose-600">
            {products?.length ?? '…'}
          </span>
          <span className="text-sm text-neutral-500">produits en stock</span>
        </Link>
        <Link
          to="/clientes"
          className="bg-white rounded-xl border border-rose-100 p-4 flex flex-col gap-1"
        >
          <span className="text-2xl font-semibold text-rose-600">
            {clients?.length ?? '…'}
          </span>
          <span className="text-sm text-neutral-500">clientes enregistrées</span>
        </Link>
      </div>

      <UpcomingAppointments />

      <div className="bg-white rounded-xl border border-rose-100 p-4">
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
    </div>
  )
}
