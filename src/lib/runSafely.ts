import { OfflineError } from '../db/db'

/** Exécute une modification et prévient l'utilisatrice en cas d'échec. */
export async function runSafely(action: () => Promise<unknown>) {
  try {
    await action()
  } catch (e) {
    console.error(e)
    alert(
      e instanceof OfflineError
        ? e.message
        : "L'enregistrement a échoué. Vérifie ta connexion et réessaie.",
    )
  }
}
