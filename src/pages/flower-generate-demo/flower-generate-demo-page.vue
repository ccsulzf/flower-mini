<script setup lang="ts">
import type { FlowerGenerationResult } from '@/api/flower-generate'
import { computed, ref } from 'vue'
import { generateFlower } from '@/api/flower-generate'
import FlowerArtworkPreview from '@/components/flower/flower-artwork-preview.vue'
import { useUserInfoStore } from '@/stores/userInfoStore'
import { waitForAppAuthReady } from '@/utils/appAuth'
import { parseArtwork } from '@/utils/flower/artwork'
import { stageGeneratedArtwork } from '@/utils/flower/generated-transfer'

definePage({ layout: 'default', style: { navigationBarTitleText: '一句话生花 · Demo', } })

const prompt = ref('')
const busy = ref(false)
const opening = ref(false)
const error = ref('')
const result = ref<FlowerGenerationResult | null>(null)
const generatedPrompt = ref('')
const resultOwner = ref('')
let backgroundHistory: string[] = []
let historyOwner = ''
const debugVisible = ref(false)
const details = computed(() => result.value ? JSON.stringify({ ...result.value.debug,
  background: result.value.artwork.background, container: result.value.artwork.container,
  design: result.value.design,
  boundaryAdjustedIds: result.value.boundaryAdjustedIds }, null, 2) : '')
const scale = Math.max(0.1, (uni.getSystemInfoSync().windowWidth - 32) / 698)
const examples = [
  '妈妈退休了，想谢谢她这些年总把家里照顾得很好，也希望她以后多为自己开心。',
  '外面一直在下雨，终于忙完了这一周，想让一个人吃晚饭的小桌子温柔一点。',
  '最好的朋友搬进了自己的新家，想带一份礼物去，祝她从今天开始过喜欢的生活。',
]

async function generate() {
  if (busy.value || opening.value) return
  const text = prompt.value.trim()
  error.value = ''
  if (!text || text.length > 1000) {
    error.value = '请写下 1 至 1000 字的花束描述'
    return
  }
  busy.value = true
  try {
    await waitForAppAuthReady()
    const uid = await useUserInfoStore().requireUid('请先登录后生成花束')
    if (historyOwner !== uid) {
      backgroundHistory = []
      historyOwner = uid
    }
    const response = await generateFlower(text, backgroundHistory)
    response.artwork = parseArtwork(JSON.stringify(response.artwork))
    if (await useUserInfoStore().requireUid() !== uid)
      throw new Error('账号已变化，请重新生成')
    result.value = response
    resultOwner.value = uid
    backgroundHistory = [response.artwork.background.materialId,
      ...backgroundHistory.filter(id => id !== response.artwork.background.materialId)].slice(0, 3)
    generatedPrompt.value = text
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '生成失败，请稍后重试' }
  finally { busy.value = false }
}

async function edit() {
  if (!result.value || busy.value || opening.value) return
  opening.value = true
  error.value = ''
  try {
    await waitForAppAuthReady()
    const uid = await useUserInfoStore().requireUid()
    if (uid !== resultOwner.value) throw new Error('账号已变化，请重新生成')
    const key = stageGeneratedArtwork(uid, result.value.artwork)
    await uni.navigateTo({ url: `/pages/flower-studio/flower-studio-page?generated=${key}` })
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '打开创作台失败' }
  finally { opening.value = false }
}

function copy() {
  if (result.value) uni.setClipboardData({ data: JSON.stringify(result.value.artwork, null, 2) })
}
</script>

<template>
  <view class="generate-page">
    <text class="eyebrow">花草实验手记 / DEMO</text>
    <text class="title">写一句话，让花开出来</text>
    <text class="note">说说发生了什么、想送给谁，或想留下怎样的心情。花材、配色与场景，交给我们搭配。</text>
    <view class="paper">
      <textarea v-model="prompt" class="prompt" :maxlength="1000" :disabled="busy || opening" :auto-height="false" placeholder="比如：妈妈今天退休了，想谢谢她这些年对家的照顾，也希望她以后多为自己开心。" />
      <text class="count">{{ prompt.length }} / 1000</text>
    </view>
    <view class="examples">
      <text class="note">没有灵感？借一句试试</text>
      <button v-for="(example, index) in examples" :key="example" class="example" :disabled="busy || opening" @click="prompt = example">{{ index + 1 }}. {{ example }}</button>
    </view>
    <button class="action primary" :disabled="busy || opening || !prompt.trim()" :loading="busy" @click="generate">
      <view class="button-paper">{{ busy ? '正在搭配花叶、背景与容器…' : result ? '再生成一束' : '生成我的花束' }}</view>
    </button>
    <text class="hint">喜欢这一束的话，还可以带入创作台慢慢调整。</text>
    <text v-if="error" class="error">{{ error }}</text>
    <view v-if="result" class="result">
      <text class="subtitle">这一束，为你而开</text>
      <text class="note">创作描述：{{ generatedPrompt }}</text>
      <view class="preview" :style="{ height: `${1000 * scale}px` }">
        <FlowerArtworkPreview :artwork="result.artwork" :scale="scale" />
      </view>
      <text class="note">{{ result.reason }}</text>
      <text class="hint">{{ result.artwork.materials.length }} 枝花叶 · {{ result.artwork.container.type === 'bouquet' ? '包装花束' : '瓶插' }} · 含完整背景</text>
      <text v-if="result.design" class="hint">主花 {{ result.design.roles.main }} · 次主花 {{ result.design.roles.secondary }} · 配花 {{ result.design.roles.filler }} · 叶材 {{ result.design.roles.foliage }} · {{ result.design.speciesCount }} 种素材</text>
      <view v-if="result.design?.warnings?.length">
        <text class="note">搭配参考提示（不影响预览和继续编辑）</text>
        <text v-for="warning in result.design.warnings" :key="warning" class="hint">{{ warning }}</text>
      </view>
      <view class="actions">
        <button class="action" :disabled="busy || opening" @click="edit"><view class="button-paper">{{ opening ? '正在打开…' : '带入创作台' }}</view></button>
        <button class="action secondary" :disabled="busy || opening" @click="copy"><view class="button-paper">复制作品 JSON</view></button>
      </view>
      <text class="hint">带入后开启新的编辑会话；继续编辑并保存草稿时，会更新当前账号的本地草稿。</text>
      <button class="debug-toggle" @click="debugVisible = !debugVisible">{{ debugVisible ? '收起' : '查看' }}验证信息</button>
      <text v-if="debugVisible" class="code" selectable>{{ details }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.generate-page { min-height: 100vh; padding: 40rpx 16px 64rpx; box-sizing: border-box; background: var(--app-page); color: var(--app-ink); }
.eyebrow { display: block; color: var(--app-sage); font-size: 22rpx; letter-spacing: 3rpx; }
.title { display: block; margin-top: 22rpx; font-family: STSong, SimSun, serif; font-size: 40rpx; }
.note { display: block; margin: 22rpx 0; font-size: 25rpx; line-height: 1.8; color: var(--app-inkMuted); }
.paper { padding: 24rpx; border: 1rpx solid var(--app-line); background: var(--app-page); box-shadow: 4rpx 6rpx 0 var(--app-surfaceMuted); }
.prompt { display: block; width: 100%; height: 210rpx; font-size: 28rpx; line-height: 1.8; color: var(--app-ink); }
.count { display: block; text-align: right; font-size: 22rpx; color: var(--app-inkMuted); }
button::after { border: none; }
button[disabled] { opacity: .5; color: var(--app-ink); }
.example { margin: 0; padding: 18rpx 0; border-bottom: 1rpx dashed var(--app-line); border-radius: 0; text-align: left; background: transparent; color: var(--app-brandStrong); font-size: 24rpx; line-height: 1.7; }
.action { position: relative; margin: 28rpx 0 0; padding: 5rpx; border: 1rpx solid var(--app-sage); border-radius: 12rpx 23rpx 17rpx 10rpx; background: transparent; color: var(--app-brandStrong); font-size: 26rpx; line-height: 1.5; }
.action::before { content: ''; position: absolute; top: 2rpx; right: -3rpx; bottom: -3rpx; left: 2rpx; border: 1rpx solid var(--app-sage); border-radius: 17rpx 15rpx 24rpx 12rpx; pointer-events: none; transform: rotate(-.5deg); }
.button-paper { padding: 24rpx 12rpx; background: var(--app-sageSoft); border-radius: 10rpx 20rpx 14rpx 8rpx; box-shadow: 2rpx 3rpx 0 var(--app-sageSoft); }
.action:active .button-paper { transform: translateY(2rpx); }
.secondary { border-radius: 22rpx 12rpx 18rpx 15rpx; }
.secondary .button-paper { background: var(--app-surfaceMuted); }
.hint { display: block; margin-top: 20rpx; font-size: 22rpx; line-height: 1.7; color: var(--app-inkMuted); }
.error { display: block; margin-top: 24rpx; font-size: 25rpx; line-height: 1.7; color: var(--app-danger); }
.result { margin-top: 44rpx; padding-top: 28rpx; border-top: 1rpx solid var(--app-line); }
.subtitle { font-family: STSong, SimSun, serif; font-size: 32rpx; }
.preview { position: relative; width: 100%; overflow: hidden; border: 1rpx solid var(--app-line); box-sizing: border-box; }
.actions { display: flex; gap: 20rpx; }
.actions .action { flex: 1; }
.debug-toggle { margin: 30rpx 0 0; padding: 10rpx 0; background: transparent; color: var(--app-inkMuted); text-align: left; font-size: 23rpx; }
.code { display: block; padding: 20rpx; white-space: pre-wrap; overflow-wrap: anywhere; font-family: monospace; font-size: 22rpx; line-height: 1.6; background: var(--app-page); }
</style>
