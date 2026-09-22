import { computed, ref } from 'vue'

const DESIGN_WIDTH = 750

export function useDevice() {
  const deviceWidth = ref(uni.getSystemInfoSync().windowWidth)
  const rpxUnit = computed(() => deviceWidth.value / DESIGN_WIDTH)

  function contentWidth(horizontalPaddingRpx: number) {
    return Math.floor(deviceWidth.value - horizontalPaddingRpx * rpxUnit.value)
  }

  return { deviceWidth, rpxUnit, contentWidth }
}
