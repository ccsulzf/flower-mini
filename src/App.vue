<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { initializeAppAuth } from '@/utils/appAuth'

onLaunch(() => {
  initializeAppAuth().catch(() => {})
})
</script>
