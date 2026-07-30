const MILA_LOCAL_STORAGE_KEYS = [
  'mila_profile',
  'mila-profile-saved',
  'mila-chat',
]

const MILA_LOCAL_STORAGE_PREFIXES = [
  'mila-profile-',
  'mila-expenses-',
  'mila-incomes-',
  'mila-obligations-',
  'mila-documents-',
  'mila-fahrtenbuch-',
  'mila-merchant-memory',
]

export function clearMilaLocalData() {
  if (typeof window === 'undefined') return

  for (const key of MILA_LOCAL_STORAGE_KEYS) {
    window.localStorage.removeItem(key)
  }

  for (const key of Object.keys(window.localStorage)) {
    if (
      MILA_LOCAL_STORAGE_PREFIXES.some((prefix) =>
        key.startsWith(prefix)
      )
    ) {
      window.localStorage.removeItem(key)
    }
  }
}
