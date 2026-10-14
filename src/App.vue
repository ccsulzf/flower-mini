<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { useDailyFlowerStore } from '@/stores/dailyFlowerStore'
import { initializeAppAuth } from '@/utils/appAuth'

onLaunch(() => {
  initializeAppAuth().then(() => {
    void useDailyFlowerStore().checkToday()
    return useFlowerCatalogStore().preload()
  }).catch((error) => {
    uni.showToast({ title: error instanceof Error ? error.message : '登录失败，请稍后重试', icon: 'none' })
  })
})

onShow(() => {
  void useDailyFlowerStore().checkToday()
})
</script>
