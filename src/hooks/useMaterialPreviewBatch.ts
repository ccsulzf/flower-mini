import type { UploadedMaterial } from '@/models/material'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'

export function useMaterialPreviewBatch(items: () => UploadedMaterial[]) {
  const catalog = useFlowerCatalogStore()
  const limit = ref(12)
  const loading = ref(false)
  const failed = ref(false)
  const visible = computed(() => items().slice(0, limit.value))
  const hasMore = computed(() => limit.value < items().length)
  const revision = ref(0)
  let version = 0

  watch(() => items().map(item => `${item.id}:${item.updatedAt}`).join('|'), () => {
    limit.value = 12
  }, { flush: 'sync' })

  watch([visible, revision], async ([records], _, onCleanup) => {
    const current = ++version
    let active = true
    onCleanup(() => { active = false })
    loading.value = true
    failed.value = false
    const queue = records.map(item => item.id)
    await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
      while (active && queue.length) {
        const id = queue.shift()!
        try { await catalog.ensure(id) }
        catch {
          if (active)
            failed.value = true
        }
      }
    }))
    if (current === version)
      loading.value = false
  }, { immediate: true })

  onScopeDispose(() => { version++ })

  function loadMore() {
    if (!loading.value && hasMore.value)
      limit.value += 12
  }

  function retry() {
    revision.value++
  }

  return { visible, loading, failed, hasMore, loadMore, retry }
}
