import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { db } from './db'
import {
  clientToRow,
  productToRow,
  rowToClient,
  rowToProduct,
  type ClientRow,
  type ProductRow,
} from './mappers'

/** Remplace la copie locale par les données du serveur. */
export async function pullAll() {
  const [products, clients] = await Promise.all([
    supabase.from('products').select('*').returns<ProductRow[]>(),
    supabase.from('clients').select('*').returns<ClientRow[]>(),
  ])
  if (products.error) throw products.error
  if (clients.error) throw clients.error

  await db.transaction('rw', db.products, db.clients, async () => {
    await db.products.clear()
    await db.products.bulkPut(products.data.map(rowToProduct))
    await db.clients.clear()
    await db.clients.bulkPut(clients.data.map(rowToClient))
  })
}

/**
 * Au premier login sur un appareil, envoie au serveur les données déjà
 * saisies localement (version sans base de données). Les id étant des
 * UUID, un produit déjà présent n'est pas dupliqué.
 */
async function importLocalDataOnce(userId: string) {
  const key = `local-import-done-${userId}`
  try {
    if (localStorage.getItem(key)) return
  } catch {
    /* stockage indisponible : on tente l'import */
  }

  const [products, clients] = await Promise.all([db.products.toArray(), db.clients.toArray()])
  if (products.length) {
    const { error } = await supabase.from('products').upsert(
      products.map((p) => ({ id: p.id, created_at: p.createdAt, ...productToRow(p) })),
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (error) throw error
  }
  if (clients.length) {
    const { error } = await supabase.from('clients').upsert(
      clients.map((c) => ({ id: c.id, created_at: c.createdAt, ...clientToRow(c) })),
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (error) throw error
  }

  try {
    localStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}

/**
 * Démarre la synchronisation pour l'utilisateur connecté :
 * import initial, téléchargement complet, puis mises à jour en temps réel.
 * Renvoie une fonction d'arrêt.
 */
export function startSync(userId: string) {
  let stopped = false
  let imported = false

  const refresh = async () => {
    if (stopped || !navigator.onLine) return
    try {
      // Tant que l'import local n'a pas réussi, on ne remplace surtout pas
      // la copie locale (on perdrait des données non envoyées).
      if (!imported) {
        await importLocalDataOnce(userId)
        imported = true
      }
      await pullAll()
    } catch (e) {
      console.error('Synchronisation impossible', e)
    }
  }

  refresh()

  const channel = supabase
    .channel(`sync-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      (payload: RealtimePostgresChangesPayload<ProductRow>) => {
        if (payload.eventType === 'DELETE') {
          if (payload.old.id) db.products.delete(payload.old.id)
        } else {
          db.products.put(rowToProduct(payload.new))
        }
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'clients' },
      (payload: RealtimePostgresChangesPayload<ClientRow>) => {
        if (payload.eventType === 'DELETE') {
          if (payload.old.id) db.clients.delete(payload.old.id)
        } else {
          db.clients.put(rowToClient(payload.new))
        }
      },
    )
    .subscribe()

  // Rattrapage quand on revient sur l'appli ou que le réseau revient
  // (le temps réel est coupé quand l'iPhone met l'appli en veille).
  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh()
  }
  window.addEventListener('online', refresh)
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    stopped = true
    supabase.removeChannel(channel)
    window.removeEventListener('online', refresh)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
