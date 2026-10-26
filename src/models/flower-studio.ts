export type StudioTab = 'flowers' | 'vases' | 'backgrounds' | 'selection'
export type StudioSelectionFilter = 'all' | 'flowers' | 'foliage'
export type StudioSelectionMenuLevel = 'closed' | 'material'

export type StudioSelectionState
  = | { mode: 'closed' }
    | { mode: 'browse', filter: StudioSelectionFilter }
    | { mode: 'material', filter: Exclude<StudioSelectionFilter, 'all'>, materialId: string, menuLevel: StudioSelectionMenuLevel }
    | { mode: 'instance', filter: Exclude<StudioSelectionFilter, 'all'>, materialId: string, instanceId: number, menuLevel: StudioSelectionMenuLevel }
