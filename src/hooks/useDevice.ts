import { computed, ref } from 'vue'

const DESIGN_WIDTH = 750
const DEFAULT_DEVICE_WIDTH = 375
const DEFAULT_DEVICE_HEIGHT = 667

export function useDevice() {
  const systemInfo = uni.getSystemInfoSync?.()
  const deviceWidth = ref(systemInfo?.windowWidth || DEFAULT_DEVICE_WIDTH)
  const deviceHeight = ref(systemInfo?.windowHeight || DEFAULT_DEVICE_HEIGHT)
  const rpxUnit = computed(() => deviceWidth.value / DESIGN_WIDTH)

  function contentWidth(horizontalPaddingRpx: number) {
    return Math.floor(deviceWidth.value - horizontalPaddingRpx * rpxUnit.value)
  }

  return { deviceWidth, deviceHeight, rpxUnit, contentWidth }
}
