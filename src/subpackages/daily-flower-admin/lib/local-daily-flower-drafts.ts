const localDrafts = import.meta.glob('../../../../docs/daily-flowers/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

export interface LocalDailyFlowerDraftSource {
  path: string
  filename: string
  source: string
}

function localDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function localDailyFlowerDraft(date = new Date()) {
  const suffix = `/docs/daily-flowers/${localDate(date)}.json`
  const entry = Object.entries(localDrafts).find(([path]) => path.endsWith(suffix))
  return entry ? JSON.stringify(entry[1], null, 2) : ''
}

export function localDailyFlowerDrafts(startDate?: string, endDate?: string): LocalDailyFlowerDraftSource[] {
  return Object.entries(localDrafts)
    .filter(([path]) => {
      const filename = path.split('/').pop() || ''
      const date = filename.slice(0, 10)
      return (!startDate || date >= startDate) && (!endDate || date <= endDate)
    })
    .map(([path, value]) => ({
      path,
      filename: path.split('/').pop() || path,
      source: JSON.stringify(value, null, 2),
    }))
    .sort((left, right) => left.filename.localeCompare(right.filename))
}
