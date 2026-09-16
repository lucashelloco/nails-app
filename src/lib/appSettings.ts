const APP_NAME_KEY = 'nail-app-name'
export const DEFAULT_APP_NAME = 'Mon Institut'

export function getAppName() {
  try {
    return localStorage.getItem(APP_NAME_KEY)?.trim() || DEFAULT_APP_NAME
  } catch {
    return DEFAULT_APP_NAME
  }
}

export function saveAppName(name: string) {
  const value = name.trim() || DEFAULT_APP_NAME
  try {
    localStorage.setItem(APP_NAME_KEY, value)
    window.dispatchEvent(new Event('app-name-change'))
  } catch {
    // Ignore storage errors and keep the current in-memory display.
  }
  return value
}
