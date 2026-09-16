import { supabase } from './supabase'
import { clearLocalData } from '../db/db'

export async function signOut() {
  // scope "local" : fonctionne même hors ligne, ne déconnecte que cet appareil
  await supabase.auth.signOut({ scope: 'local' })
  await clearLocalData()
}
