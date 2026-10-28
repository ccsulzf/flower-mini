<script setup lang="ts">
import type { FlowerGreetingText } from '@/models/flower-creation'
import { computed, ref, watch } from 'vue'
import { getDailyFlowerByDate } from '@/api/flower-daily'
import FlowerArtworkPreview from '@/components/flower/flower-artwork-preview.vue'
import { useDevice } from '@/hooks/useDevice'
import { useFlowerPageArtwork } from '@/hooks/useFlowerPageArtwork'
import { validateCard } from '@/utils/flower/creation-storage'
import { resolveDailyFlowerImage } from '@/utils/flower/daily-flower-image-cache'
import { greetingLines, renderFlowerCard } from '@/utils/flower/render-flower-card'

definePage({ style: { navigationBarTitleText: '制作贺卡', navigationBarBackgroundColor: '#f6f3eb' } })
const { draft, loading, error, images, retry } = useFlowerPageArtwork({
  loadDailyFlower: async (date) => {
    const flower = await getDailyFlowerByDate(date)
    if (!flower)
      throw new Error('今日花束不存在或已下架')
    return {
      draft: {
        artwork: flower.artwork,
        card: { blessing: '', signature: '' },
        updatedAt: Date.now(),
      },
      resolveImagePath: () => resolveDailyFlowerImage(flower),
      title: '今日花束',
      description: flower.description,
    }
  },
})
const { exportingCard, cardImageError } = images
const { deviceWidth, deviceHeight } = useDevice()
const text = ref<FlowerGreetingText>({ recipient: '', blessing: '', signature: '' })
const appliedText = ref<FlowerGreetingText>({ recipient: '', blessing: '', signature: '' })
const showEditor = ref(false)
const cardScale = computed(() => {
  const rpx = deviceWidth.value / 750
  return Math.max(0.1, Math.min(
    1,
    (deviceWidth.value - 68 * rpx) / 698,
    (deviceHeight.value - 250 * rpx) / 1260,
  ))
})
const cardStageStyle = computed(() => `width:${698 * cardScale.value}px;height:${1260 * cardScale.value}px;`)
const cardPreviewStyle = computed(() => `transform:scale(${cardScale.value});`)
const previewBlessingLines = computed(() => greetingLines(appliedText.value.blessing))
const canShare = computed(() => !loading.value && !error.value && Boolean(draft.value) && !exportingCard.value)
const blessingCount = computed(() => text.value.blessing.length)
let initialized = false
watch(draft, (value) => {
  if (value && !initialized) {
    const greeting = { ...value.card, recipient: '' }
    text.value = { ...greeting }
    appliedText.value = { ...greeting }
    initialized = true
  }
}, { immediate: true })
async function share() {
  if (!canShare.value)
    return
  const greeting = { ...validateCard(appliedText.value), recipient: appliedText.value.recipient.trim() }
  if (await images.exportCard(greeting, (artworkPath, card) => renderFlowerCard(artworkPath, card, draft.value?.artwork)))
    images.shareImage('card')
}
function openEditor() {
  text.value = { ...appliedText.value }
  showEditor.value = true
}
function cancelEditor() {
  if (exportingCard.value)
    return
  text.value = { ...appliedText.value }
  showEditor.value = false
}
function applyEditor() {
  if (exportingCard.value)
    return
  appliedText.value = { ...validateCard(text.value), recipient: text.value.recipient.trim() }
  showEditor.value = false
}
</script>

<template>
  <view class="greeting-page">
    <canvas canvas-id="flower-card-canvas" class="card-canvas" width="698" height="1260" />
    <view v-if="loading || error" class="greeting-state">
      <text>{{ loading ? '正在准备贺卡…' : error }}</text>
      <button v-if="error" @click="retry">
        重新加载
      </button>
    </view>
    <template v-else>
      <view class="greeting-preview">
        <view class="preview-tape preview-tape-left" aria-hidden="true" />
        <view class="preview-tape preview-tape-right" aria-hidden="true" />
        <view class="live-card-stage" :style="cardStageStyle">
          <view class="live-card" :style="cardPreviewStyle">
            <text class="live-card-title">花间寄语</text>
            <text v-if="appliedText.recipient" class="live-card-recipient">送给 {{ appliedText.recipient }}</text>
            <view class="live-card-artwork">
              <FlowerArtworkPreview
                v-if="draft" :artwork="draft.artwork" :scale="0.78" :hide-background="true"
              />
            </view>
            <view class="live-card-letter-divider" aria-hidden="true" />
            <view class="live-card-blessing">
              <text v-for="(line, index) in previewBlessingLines" :key="index">{{ line }}</text>
            </view>
            <text v-if="appliedText.signature" class="live-card-signature">—— {{ appliedText.signature }}</text>
          </view>
        </view>
      </view>
      <view class="greeting-actions">
        <button class="greeting-edit" :disabled="exportingCard" @click="openEditor">
          <view class="greeting-action-content">
            <view class="i-carbon-edit greeting-action-icon" />
            <text>填写内容</text>
          </view>
        </button>
        <button class="greeting-primary" :disabled="!canShare" @click="share">
          <view class="greeting-action-content">
            <view
              class="greeting-action-icon"
              :class="exportingCard ? 'i-carbon-circle-dash' : 'i-carbon-share'"
            />
            <text>{{ exportingCard ? '正在准备…' : '分享贺卡' }}</text>
          </view>
        </button>
      </view>
      <view v-if="cardImageError" class="greeting-error">
        {{ cardImageError }}
      </view>
      <view v-if="showEditor" class="editor-backdrop" @click="cancelEditor">
        <view class="editor-sheet" @click.stop>
          <view class="editor-heading">
            <view>
              <text class="editor-title">填写贺卡内容</text>
            </view>
            <button aria-label="取消编辑" @click="cancelEditor">
              ×
            </button>
          </view>
          <uni-forms class="greeting-form" :model="text" label-position="top" label-width="100%">
            <uni-forms-item name="recipient">
              <template #label>
                <view class="field-label-row">
                  <text class="field-label">
                    送给
                  </text>
                </view>
              </template>
              <view class="paper-field paper-field-recipient">
                <input
                  v-model="text.recipient" class="paper-input" :maxlength="24"
                  placeholder="昵称"
                >
              </view>
            </uni-forms-item>
            <uni-forms-item name="blessing">
              <template #label>
                <view class="field-label-row">
                  <text class="field-label">
                    祝福的话
                  </text>
                </view>
              </template>
              <view class="paper-field paper-field-blessing">
                <view class="paper-margin" aria-hidden="true" />
                <view class="paper-line paper-line-one" aria-hidden="true" />
                <view class="paper-line paper-line-two" aria-hidden="true" />
                <view class="paper-line paper-line-three" aria-hidden="true" />
                <textarea
                  v-model="text.blessing" class="paper-textarea" :maxlength="120"
                  placeholder="愿你的每一天，都有花开。"
                />
              </view>
              <view class="field-footer">
                <text class="field-hint">
                  慢慢写，想说的话都放在这里
                </text>
                <text class="field-count" :class="{ 'field-count-limit': blessingCount >= 120 }">
                  {{ blessingCount }}/120
                </text>
              </view>
            </uni-forms-item>
            <uni-forms-item name="signature">
              <template #label>
                <view class="field-label-row field-label-row-signature">
                  <text class="field-label">
                    署名
                  </text>
                </view>
              </template>
              <view class="paper-field paper-field-signature">
                <input
                  v-model="text.signature" class="paper-input" :maxlength="24"
                  placeholder="你的名字"
                >
              </view>
            </uni-forms-item>
          </uni-forms>
          <button class="greeting-primary editor-done" :disabled="exportingCard" @click="applyEditor">
            <text>写好了</text>
          </button>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.greeting-page {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  box-sizing: border-box;
  color: #574d40;
  padding: 28rpx 30rpx calc(24rpx + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 18% 8%, rgba(193, 171, 139, .07) 0 2rpx, transparent 3rpx),
    radial-gradient(circle at 72% 28%, rgba(193, 171, 139, .05) 0 2rpx, transparent 3rpx),
    #f8f3e9;
  background-size: 34rpx 34rpx, 46rpx 46rpx, auto;
}

.card-canvas {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 698px;
  height: 1260px;
}

.greeting-preview {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 700rpx;
  align-items: center;
  justify-content: center;
  overflow: visible;
  margin: 12rpx 4rpx 4rpx;
  padding: 16rpx;
  border: 2rpx solid rgba(184, 168, 139, .24);
  border-radius: 18rpx 26rpx 20rpx 30rpx;
  background: rgba(255, 253, 246, .92);
  box-shadow: 0 14rpx 34rpx rgba(88, 74, 55, .075);
}

.live-card-stage {
  position: relative;
  flex-shrink: 0;
}

.live-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 698px;
  height: 1260px;
  overflow: hidden;
  transform-origin: top left;
  border: 1px solid #d5c5a6;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 12% 18%, rgba(162, 137, 102, .065) 0 1px, transparent 2px),
    radial-gradient(circle at 78% 42%, rgba(162, 137, 102, .045) 0 1px, transparent 2px),
    #f8f2e6;
  background-size: 25px 25px, 33px 33px, auto;
  color: #3f463d;
}

.live-card::before {
  position: absolute;
  top: 17px;
  right: 19px;
  bottom: 18px;
  left: 16px;
  border: 1px solid rgba(177, 153, 117, .42);
  border-radius: 3px 8px 4px 7px;
  content: '';
  pointer-events: none;
}

.live-card-title {
  position: absolute;
  top: 48px;
  left: 284px;
  width: 130px;
  box-sizing: border-box;
  padding: 5px 0 6px;
  color: #64705b;
  background: #e4e7da;
  font-family: sans-serif;
  font-size: 20px;
  line-height: 25px;
  text-align: center;
  transform: rotate(-.6deg);
}

.live-card-recipient {
  position: absolute;
  top: 105px;
  left: 69px;
  box-sizing: border-box;
  width: auto;
  padding: 0;
  color: #565247;
  background: transparent;
  box-shadow: none;
  font-family: sans-serif;
  font-size: 23px;
  line-height: 28px;
}

.live-card-artwork {
  position: absolute;
  top: 140px;
  left: 0;
  width: 698px;
  height: 800px;
  overflow: hidden;
  background: transparent;
}

.live-card-artwork :deep(.artwork-preview) {
  position: relative;
  z-index: 1;
}

.live-card-letter-divider {
  position: absolute;
  top: 970px;
  left: 69px;
  width: 560px;
  height: 1px;
  background: rgba(183, 157, 113, .55);
}

.live-card-letter-divider::after {
  position: absolute;
  top: -3px;
  left: 278px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #b99f71;
  content: '';
}

.live-card-blessing {
  position: absolute;
  top: 998px;
  right: 80px;
  left: 80px;
  display: flex;
  flex-direction: column;
  font-family: sans-serif;
  font-size: 25px;
  line-height: 34px;
}

.live-card-blessing text { display: block; }

.live-card-signature {
  position: absolute;
  right: 52px;
  bottom: 18px;
  color: #625d50;
  font-family: sans-serif;
  font-size: 22px;
  line-height: 26px;
  text-align: right;
}

.preview-tape {
  position: absolute;
  z-index: 3;
  top: -17rpx;
  width: 104rpx;
  height: 32rpx;
  opacity: .72;
  pointer-events: none;
}

.preview-tape-left {
  left: 38rpx;
  transform: rotate(-8deg);
  background: #cbd2af;
}

.preview-tape-right {
  right: 48rpx;
  transform: rotate(7deg);
  background: #e4cfaf;
}

.greeting-actions {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  gap: 16rpx;
  padding: 22rpx 2rpx 4rpx;
}

.greeting-actions button {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 84rpx;
  margin: 0;
  padding: 0;
  border: 2rpx solid rgba(101, 86, 66, .58);
  border-radius: 8rpx 12rpx 7rpx 10rpx;
  background: #f3e3df;
  box-shadow: 3rpx 4rpx 0 rgba(91, 75, 57, .07);
  color: #5c5549;
  line-height: 1;
  font-size: 22rpx;
  white-space: nowrap;
}

.greeting-actions button::before {
  position: absolute;
  top: -5rpx;
  right: 3rpx;
  bottom: 4rpx;
  left: -4rpx;
  border: 2rpx solid rgba(101, 86, 66, .36);
  border-radius: 11rpx 7rpx 13rpx 6rpx;
  content: '';
  pointer-events: none;
}

.greeting-actions button::after {
  border: none;
}

.greeting-action-content {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.greeting-action-icon {
  font-size: 28rpx;
  transform: rotate(-4deg);
}

.greeting-actions .greeting-primary {
  border-color: rgba(99, 108, 87, .62);
  border-radius: 11rpx 7rpx 13rpx 8rpx;
  background: #e4eadc;
  box-shadow: 3rpx 4rpx 0 rgba(81, 98, 74, .08);
  color: #545d4d;
  font-weight: 600;
  transform: rotate(.25deg);
}

.greeting-actions .greeting-primary::before {
  top: -4rpx;
  right: -4rpx;
  bottom: 3rpx;
  left: 4rpx;
  border-color: rgba(99, 108, 87, .38);
  border-radius: 7rpx 13rpx 8rpx 12rpx;
}

.greeting-actions .greeting-edit {
  transform: rotate(-.35deg);
}

.greeting-actions button:not([disabled]):active .greeting-action-content {
  transform: translate(2rpx, 3rpx);
}

.greeting-actions button[disabled] {
  opacity: .42;
}

.greeting-error {
  flex-shrink: 0;
  margin-top: 8rpx;
  color: #a35a47;
  font-size: 24rpx;
  text-align: center;
}

.greeting-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  text-align: center;
  margin: auto;
  padding: 72rpx 54rpx;
  border: 2rpx solid rgba(112, 91, 68, .2);
  border-radius: 22rpx 30rpx 20rpx 28rpx;
  background: #fffaf0;
  box-shadow: 7rpx 9rpx 0 rgba(143, 124, 95, .1);
  font-size: 26rpx;
}

.greeting-state button {
  margin: 0;
  padding: 0 24rpx;
  border: 2rpx solid rgba(105, 88, 68, .28);
  border-radius: 18rpx 12rpx 20rpx 14rpx;
  background: #f3ead8;
  color: #596451;
  font-size: 24rpx;
  line-height: 60rpx;
}

.editor-backdrop {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 5;
  display: flex;
  align-items: flex-end;
  box-sizing: border-box;
  padding: 24rpx;
  background: rgba(63, 55, 45, .34);
}

.editor-sheet {
  position: relative;
  width: 100%;
  max-height: 84vh;
  overflow: auto;
  box-sizing: border-box;
  padding: 38rpx 34rpx 36rpx;
  border: 2rpx solid rgba(112, 91, 68, .3);
  border-radius: 22rpx 30rpx 20rpx 28rpx;
  background:
    radial-gradient(circle at 18% 16%, rgba(174, 147, 111, .08) 0 1rpx, transparent 2rpx),
    radial-gradient(circle at 76% 34%, rgba(174, 147, 111, .06) 0 1rpx, transparent 2rpx),
    #fffaf0;
  background-size: 32rpx 32rpx, 46rpx 46rpx, auto;
  box-shadow: 8rpx 12rpx 0 rgba(101, 83, 61, .07), 0 24rpx 46rpx rgba(54, 46, 37, .12);
}

.editor-sheet::before {
  position: absolute;
  top: -2rpx;
  left: 50%;
  width: 96rpx;
  height: 24rpx;
  transform: translateX(-50%) rotate(2deg);
  background: rgba(218, 180, 173, .58);
  content: '';
}

.editor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30rpx;
}

.editor-kicker {
  display: block;
  margin-bottom: 4rpx;
  color: #a08a70;
  font-family: Georgia, serif;
  font-size: 15rpx;
  letter-spacing: 2rpx;
}

.editor-title {
  display: block;
  color: #574d40;
  font-family: Georgia, 'Songti SC', 'STSong', serif;
  font-size: 32rpx;
  font-weight: 600;
}

.editor-heading button {
  width: 60rpx;
  height: 60rpx;
  margin: 0;
  padding: 0;
  border: 2rpx solid rgba(116, 132, 105, .22);
  border-radius: 52% 44% 48% 42%;
  background: #edf0e5;
  color: #74806b;
  font-size: 38rpx;
  line-height: 60rpx;
}

.greeting-form :deep(.uni-forms-item) {
  margin-bottom: 26rpx;
}

.greeting-form :deep(.uni-forms-item__label) {
  height: auto;
  padding: 0 4rpx 10rpx;
  color: #3f463d;
  font-size: 26rpx;
}

.greeting-form :deep(.uni-forms-item__content) {
  width: 100%;
}

.paper-field {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  border: 2rpx solid #d9cdb8;
  background: #f8eedb;
  box-shadow: 5rpx 6rpx 0 rgba(121, 99, 69, .09);
}

.paper-field::after {
  position: absolute;
  top: 4rpx;
  right: -3rpx;
  bottom: -4rpx;
  left: 3rpx;
  border: 2rpx solid rgba(139, 122, 94, .2);
  content: '';
  pointer-events: none;
}

.paper-field-recipient {
  width: 86%;
  border-radius: 8rpx 15rpx 7rpx 12rpx;
  transform: rotate(-.4deg);
}

.paper-field-blessing {
  height: 220rpx;
  border-radius: 12rpx 7rpx 15rpx 9rpx;
  background: #fffaf0;
  transform: rotate(.25deg);
}

.paper-field-signature {
  width: 58%;
  margin-left: auto;
  border-radius: 14rpx 8rpx 11rpx 6rpx;
  background: #f1e5ce;
  transform: rotate(-.45deg);
}

.paper-input {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 82rpx;
  box-sizing: border-box;
  padding: 0 24rpx;
  color: #51483d;
  font-size: 27rpx;
}

.paper-textarea {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 220rpx;
  box-sizing: border-box;
  padding: 20rpx 24rpx 18rpx 54rpx;
  color: #51483d;
  font-size: 27rpx;
  line-height: 52rpx;
}

.paper-margin {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 38rpx;
  width: 2rpx;
  background: rgba(188, 128, 119, .26);
  pointer-events: none;
}

.paper-line {
  position: absolute;
  right: 18rpx;
  left: 18rpx;
  height: 2rpx;
  background: rgba(127, 144, 113, .16);
  pointer-events: none;
}

.paper-line-one { top: 70rpx; }
.paper-line-two { top: 122rpx; }
.paper-line-three { top: 174rpx; }

.field-label {
  font-size: 26rpx;
  color: #3f463d;
}

.field-label-row {
  display: flex;
  width: 100%;
  align-items: baseline;
  justify-content: space-between;
}

.field-limit,
.field-hint,
.field-count {
  font-size: 22rpx;
  color: #8a907f;
}

.field-limit {
  font-family: 'Kaiti SC', 'STKaiti', serif;
  transform: rotate(-1.5deg);
}

.field-label-row-signature {
  width: 58%;
  margin-left: auto;
}

.field-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10rpx;
  padding: 0 8rpx;
  font-family: 'Kaiti SC', 'STKaiti', serif;
}

.field-count-limit {
  color: #a35a47;
}

.editor-done {
  position: relative;
  width: 100%;
  margin: 30rpx 0 2rpx;
  border: 2rpx solid #718068;
  border-radius: 23rpx 15rpx 26rpx 17rpx;
  background: #7d8d73;
  box-shadow: 5rpx 6rpx 0 rgba(81, 98, 74, .18);
  color: #fffdf7;
  line-height: 84rpx;
  font-size: 28rpx;
}

.editor-done::before {
  position: absolute;
  top: -6rpx;
  right: 5rpx;
  bottom: 4rpx;
  left: -5rpx;
  border: 2rpx solid rgba(91, 105, 82, .48);
  border-radius: 17rpx 25rpx 15rpx 23rpx;
  content: '';
  pointer-events: none;
}

.editor-done text {
  position: relative;
  display: inline-block;
  letter-spacing: 3rpx;
}

.editor-done:not([disabled]):active,
.editor-heading button:not([disabled]):active,
.greeting-state button:not([disabled]):active {
  transform: translate(2rpx, 3rpx);
}

.greeting-error button {
  display: inline-block;
  margin: 0 0 0 12rpx;
  padding: 0 14rpx;
  color: #995c50;
  background: transparent;
  font-size: 24rpx;
  line-height: 1.5;
}

button::after {
  border: none;
}
</style>
