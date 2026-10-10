<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { initializeAppAuth } from '@/utils/appAuth'

onLaunch(() => {
  initializeAppAuth().then(() => useFlowerCatalogStore().preload()).catch((error) => {
    uni.showToast({ title: error instanceof Error ? error.message : '登录失败，请稍后重试', icon: 'none' })
  })
})
</script>
