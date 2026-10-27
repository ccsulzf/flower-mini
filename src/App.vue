<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useDailyFlowerStore } from '@/stores/dailyFlowerStore'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { initializeAppAuth } from '@/utils/appAuth'

onLaunch(() => {
  const catalogPreparation = useFlowerCatalogStore().preload()
  const authInitialization = initializeAppAuth()
  void authInitialization.then(() => {
    void useDailyFlowerStore().checkToday()
  }, () => {})
  Promise.all([authInitialization, catalogPreparation]).catch((error) => {
    uni.showToast({ title: error instanceof Error ? error.message : '登录失败，请稍后重试', icon: 'none' })
  })
})

onShow(() => {
  void useDailyFlowerStore().checkToday()
})
</script>
