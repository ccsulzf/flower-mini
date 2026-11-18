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
  // 使用已有素材先展示页面，目录检查和文件更新在后台完成。
  void useFlowerCatalogStore().refreshInBackground()
  void useDailyFlowerStore().checkToday()
})
</script>
