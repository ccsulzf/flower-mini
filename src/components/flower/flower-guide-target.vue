<script setup lang="ts">
import type { Ref } from 'vue'
import type { ReportFlowerGuideTarget } from '@/models/flower-guide'
import { computed, getCurrentInstance, inject, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{ step: string, text: string, placement?: 'above' | 'below' | 'right', enabled?: boolean, workspace?: boolean }>(), { placement: 'above', enabled: true })
const currentStep = inject<Readonly<Ref<string | null>>>('studioGuideStep')
const report = inject<ReportFlowerGuideTarget>('studioGuideTarget')
const instance = getCurrentInstance()
const active = computed(() => props.enabled && currentStep?.value === props.step)
let revision = 0
let timer: ReturnType<typeof setTimeout> | undefined

async function measure() {
  const request = ++revision
  clearTimeout(timer)
  if (!active.value || !instance?.proxy) {
    if (instance)
      report?.(null, instance.uid)
    return
  }
  await nextTick()
  if (request !== revision)
    return
  function query(attempt: number) {
    if (request !== revision || !instance?.proxy)
      return
    const owner = instance.uid
    uni.createSelectorQuery().in(instance.proxy).select('.guide-target-anchor').boundingClientRect((result) => {
      if (request !== revision || !active.value)
        return
      if (!result || Array.isArray(result)) {
        if (attempt < 3)
          timer = setTimeout(() => query(attempt + 1), 50)
        return
      }
      const { left, top, width, height } = result
      if (typeof left === 'number' && typeof top === 'number' && width && height) {
        report?.({ step: props.step, text: props.text, placement: props.placement, left, top, width, height }, owner)
      }
      else if (attempt < 3) {
        timer = setTimeout(() => query(attempt + 1), 50)
      }
    }).exec()
  }
  timer = setTimeout(() => query(0), 32)
}
watch([active, () => props.text, () => props.placement], measure, { flush: 'post' })
onMounted(measure)
onBeforeUnmount(() => {
  revision++
  clearTimeout(timer)
  if (instance)
    report?.(null, instance.uid)
})
</script>

<template>
  <view v-if="active" class="guide-target-anchor" aria-hidden="true" />
</template>

<style scoped lang="scss">
.guide-target-anchor { position:absolute; top:0; right:0; bottom:0; left:0; pointer-events:none; }
</style>
