<script setup lang="ts">
import { computed } from 'vue'
import StudioGenerationBloom from './studio-generation-bloom.vue'

const props = defineProps<{
  prompt: string
  error: string
  phase: 'idle' | 'thinking' | 'preparing' | 'revealing'
  toolbarBottom: number
  replacing: boolean
}>()
const emit = defineEmits<{ 'update:prompt': [value: string], 'generate': [], 'close': [] }>()
const busy = computed(() => props.phase !== 'idle')
const status = computed(() => props.phase === 'revealing' ? '花束正在成形' : props.phase === 'preparing' ? '正在准备花叶与花器' : '正在搭配你的花束')
</script>

<template>
  <view class="generation-layer" @touchmove.stop.prevent>
    <view class="generation-shield" :class="{ 'shield-paper': !busy }" @tap="!busy && emit('close')" />
    <view v-if="busy" class="generation-toolbar" :style="{ bottom: `${toolbarBottom}px` }" role="status">
      <StudioGenerationBloom :revealing="phase === 'revealing'" :message="status" />
    </view>
    <view v-else class="generation-sheet" @tap.stop>
      <view class="sheet-tape" aria-hidden="true" />
      <text class="sheet-kicker">
        一句生花 / 一页花事
      </text>
      <view class="sheet-heading">
        <text>写一句话，让花开出来</text><button class="sheet-close" aria-label="关闭一句话生花" @tap="emit('close')">
          ×
        </button>
      </view>
      <text class="sheet-note">
        想送给谁，发生了什么，或只是此刻的心情。
      </text>
      <view class="writing-paper">
        <textarea class="generation-input" :value="prompt" :maxlength="1000" :adjust-position="true" :cursor-spacing="24" placeholder-style="color: #a49a88; font-size: 26rpx; line-height: 48rpx;" placeholder="比如：忙完这一周，想让晚饭的小桌子温柔一点。" @input="emit('update:prompt', $event.detail.value)" />
      </view>
      <view class="sheet-footnote">
        <text>{{ replacing ? '新花束会替换画布，之后可以撤销恢复' : '花束会直接在眼前生成，还能继续调整' }}</text><text>{{ prompt.length }}/1000</text>
      </view>
      <text v-if="error" class="generation-error" role="alert">
        {{ error }}
      </text>
      <view class="submit-sketch" :class="{ 'submit-disabled': !prompt.trim() }">
        <view class="submit-outline outline-back" aria-hidden="true" />
        <view class="submit-outline outline-front" aria-hidden="true" />
        <button class="generation-submit" :disabled="!prompt.trim()" @tap="emit('generate')">
          <view class="submit-paper">
            让这句话开成花 <text>✿</text>
          </view>
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/flower-studio.scss' as *;
.generation-layer { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 16; color: #655c50; }
.generation-shield { position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: transparent; }
.shield-paper { background: rgba(72, 62, 49, .14); }
.generation-sheet { position: absolute; right: 38rpx; bottom: 30rpx; bottom: calc(30rpx + env(safe-area-inset-bottom)); left: 38rpx; padding: 32rpx 30rpx 28rpx; border: 1rpx solid $studio-border; border-radius: 3rpx 7rpx 4rpx 5rpx; background: $studio-panel; box-shadow: 4rpx 6rpx 0 #e9e1d2, 6rpx 8rpx 0 rgba(112, 91, 68, .16); }
.generation-sheet::before { position: absolute; top: 5rpx; right: 5rpx; bottom: -3rpx; left: -4rpx; border: 1rpx solid rgba(112, 91, 68, .14); border-radius: 7rpx 2rpx 5rpx 3rpx; content: ''; pointer-events: none; transform: rotate(-.3deg); }
.sheet-tape { position: absolute; top: -12rpx; left: 46rpx; width: 92rpx; height: 25rpx; border-right: 1rpx solid rgba(168, 151, 111, .08); border-left: 1rpx solid rgba(168, 151, 111, .08); background: rgba(224, 211, 173, .44); transform: rotate(-4deg); pointer-events: none; }
.sheet-kicker { display: block; margin: 0 0 10rpx 2rpx; color: #8a957b; font-size: 19rpx; letter-spacing: 2rpx; }
.sheet-heading { display: flex; align-items: center; justify-content: space-between; color: $studio-ink; font-family: STSong, SimSun, serif; font-size: 32rpx; }
.sheet-close { width: 72rpx; height: 72rpx; margin: -28rpx -15rpx -12rpx 0; padding: 0; border-radius: 0; background: transparent; color: $studio-muted; font-size: 38rpx; font-weight: 300; line-height: 72rpx; transform: rotate(-5deg); }
.sheet-note { display: block; margin: 13rpx 0 24rpx; color: $studio-muted; font-size: 23rpx; font-weight: 400; line-height: 1.7; }
.writing-paper { padding: 10rpx 16rpx; border-top: 1rpx solid rgba(112, 91, 68, .11); border-bottom: 1rpx solid rgba(112, 91, 68, .22); background: #faf6ec; }
.generation-input { box-sizing: border-box; width: 100%; height: 192rpx; padding: 0; border: 0; border-radius: 0; background: repeating-linear-gradient(to bottom, transparent 0, transparent 47rpx, rgba(112, 91, 68, .1) 47rpx, rgba(112, 91, 68, .1) 48rpx); color: $studio-ink; font-size: 26rpx; line-height: 48rpx; }
.sheet-footnote { display: flex; justify-content: space-between; gap: 16rpx; margin-top: 14rpx; color: #9b907e; font-size: 20rpx; line-height: 1.6; }
.generation-error { display: block; margin-top: 18rpx; color: #a35e56; font-size: 25rpx; line-height: 1.6; }
.submit-sketch { position: relative; width: 350rpx; height: 86rpx; margin: 28rpx 0 0 auto; }
.submit-outline { position: absolute; top: 0; right: 0; bottom: 0; left: 0; border: 1rpx solid #8f9c81; pointer-events: none; }
.outline-back { top: 2rpx; right: -3rpx; bottom: -2rpx; left: 3rpx; border-color: #b3bba4; border-radius: 255rpx 16rpx 225rpx 20rpx / 19rpx 225rpx 23rpx 255rpx; transform: rotate(-.7deg); }
.outline-front { border-radius: 17rpx 255rpx 19rpx 225rpx / 225rpx 19rpx 255rpx 17rpx; transform: rotate(.4deg); }
.generation-submit { position: relative; width: 100%; height: 86rpx; margin: 0; padding: 5rpx; border: 0; border-radius: 8rpx; background: transparent; color: #58684c; font-size: 25rpx; line-height: 1.5; }
.submit-paper { display: flex; height: 76rpx; align-items: center; justify-content: center; gap: 14rpx; border-radius: 8rpx 12rpx 10rpx 7rpx; background: $studio-accent; box-shadow: 2rpx 3rpx 0 rgba(105, 121, 89, .1); }
.submit-paper text { color: #82936e; font-size: 26rpx; transform: rotate(10deg); }
.generation-submit:active .submit-paper { transform: translateY(2rpx); }
.submit-disabled { opacity: .65; }
.generation-submit[disabled] { background: transparent; color: #68715e; }
.sheet-close::after, .generation-submit::after { border: 0; }
.generation-toolbar { position: absolute; right: 38rpx; left: 38rpx; height: 88rpx; box-sizing: border-box; border-top: 1rpx solid rgba(112, 91, 68, .14); pointer-events: none; }
</style>
