export interface FlowerGuideTarget {
  step: string
  text: string
  placement: 'above' | 'below' | 'right'
  left: number
  top: number
  width: number
  height: number
}

export type ReportFlowerGuideTarget = (target: FlowerGuideTarget | null, owner: number) => void
