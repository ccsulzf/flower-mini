import type { Artwork, FlowerKind, Stem, VaseName } from '@/models/artwork'
import type { CachedMaterial } from '@/models/material'
import type { StemPosition } from '@/utils/flower/arrangement.cjs'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { createDefaultArtwork, flowerCatalog } from '@/config/flower-materials'
import { useFlowerCatalogStore } from '@/stores/flowerCatalogStore'
import { constrainStem, maxStemHeight, studioMetrics } from '@/utils/flower/arrangement.cjs'
import { anchorY } from '@/utils/flower/artwork'
import { ArtworkHistory, copyContainerLayouts } from '@/utils/flower/artwork-history'
import { vasePlacement } from '@/utils/flower/material-render'

function artworkState() {
  const initial = createDefaultArtwork()
  const stems = ref<Stem[]>(initial.stems)
  const vase = ref<VaseName>(initial.vase)
  const vaseMaterialId = ref<string | undefined>()
  const background = ref<Artwork['background']>(initial.background)
  const backgroundMaterialId = ref<string | undefined>()
  const containerLayouts = ref<NonNullable<Artwork['containerLayouts']>>({})
  const selectedId = ref<number | null>(null)
  const history = reactive(new ArtworkHistory())
  const selected = computed(() => stems.value.find(stem => stem.id === selectedId.value))
  const selectedIndex = computed(() => stems.value.findIndex(stem => stem.id === selectedId.value))
  const canUndo = computed(() => history.past.length > 0)
  const canRedo = computed(() => history.future.length > 0)
  const canClear = computed(() => stems.value.length > 0)
  const canMoveBack = computed(() => selectedIndex.value > 0)
  const canMoveFront = computed(() => selectedIndex.value >= 0 && selectedIndex.value < stems.value.length - 1)
  const selectedControlBounds = computed(() => {
    const stem = selected.value
    if (!stem)
      return null
    const landing = stemLandingBounds()
    const minRatio = Math.max(-1, Math.min(1, (studioMetrics.headMargin - landing.right) / stem.stemHeight))
    const maxRatio = Math.max(-1, Math.min(1, (studioMetrics.width - studioMetrics.headMargin - landing.left) / stem.stemHeight))
    const minAngle = Math.asin(minRatio) * 180 / Math.PI
    const maxAngle = Math.asin(maxRatio) * 180 / Math.PI
    return {
      positionMin: Math.ceil(Math.max(-65, minAngle)),
      positionMax: Math.floor(Math.min(65, maxAngle)),
      heightMin: studioMetrics.minStemHeight,
      heightMax: Math.floor(maxStemHeight(stem)),
    }
  })
  let nextId = 3
  let dragSnapshot: Artwork | null = null
  let dragId: number | null = null
  let dragRecorded = false
  let controlOrigin: Stem | null = null

  function snapshot(): Artwork {
    return { vase: vase.value, ...(vaseMaterialId.value ? { vaseMaterialId: vaseMaterialId.value } : {}), ...(Object.keys(containerLayouts.value).length ? { containerLayouts: copyContainerLayouts(containerLayouts.value) } : {}), background: background.value, ...(backgroundMaterialId.value ? { backgroundMaterialId: backgroundMaterialId.value } : {}), stems: stems.value.map(stem => ({ ...stem, y: anchorY(vase.value) })) }
  }
  function select(id: number | null) {
    selectedId.value = stems.value.some(stem => stem.id === id) ? id : null
  }
  function endStemEdit() { dragSnapshot = null; dragId = null; dragRecorded = false; controlOrigin = null }
  function applyArtwork(artwork: Artwork) {
    endStemEdit()
    stems.value = artwork.stems.map(stem => ({ ...stem, y: anchorY(artwork.vase) }))
    vase.value = artwork.vase
    vaseMaterialId.value = artwork.vaseMaterialId
    containerLayouts.value = copyContainerLayouts(artwork.containerLayouts)
    background.value = artwork.background
    backgroundMaterialId.value = artwork.backgroundMaterialId
    nextId = Math.max(0, ...stems.value.map(stem => stem.id))
    selectedId.value = null
  }
  function initialize(artwork: Artwork = createDefaultArtwork()) {
    applyArtwork(artwork)
    history.past = []; history.future = []
  }
  function remember() { endStemEdit(); history.remember(snapshot()) }
  function replaceArtwork(artwork: Artwork) { remember(); applyArtwork(artwork) }
  function undo() {
    const previous = history.undo(snapshot())
    if (previous)
      applyArtwork(previous)
  }
  function redo() {
    const next = history.redo(snapshot())
    if (next)
      applyArtwork(next)
  }
  function addFlower(kind: FlowerKind): number | null {
    const flower = flowerCatalog.find(item => item.kind === kind)
    if (!flower)
      return null
    remember()
    const id = ++nextId
    stems.value.push({ id, kind, flowerScale: flower.size, color: flower.color, ...constrainStem({ x: 350 + (id % 3 - 1) * 12, y: anchorY(vase.value), angle: (id % 3 - 1) * 18, stemHeight: flower.height + (id % 3 - 1) * 24 }) })
    return id
  }
  function stemLandingBounds() {
    const container = vaseMaterialId.value
      ? useFlowerCatalogStore().get(vaseMaterialId.value)
      : undefined
    const placement = container ? vasePlacement(container) : { mouthLeft: vase.value === '花束' ? 338 : 280, mouthRight: vase.value === '花束' ? 362 : 420 }
    const inset = Math.min(4, (placement.mouthRight - placement.mouthLeft) / 2)
    return { left: placement.mouthLeft + inset, right: placement.mouthRight - inset }
  }
  function distributedFraction(index: number, step: number) {
    return index === 0 ? 0.5 : (index * step) % 1
  }
  function materialLandingX(index: number) {
    const bounds = stemLandingBounds()
    const fraction = distributedFraction(index, 0.6180339887498949)
    return bounds.left + (bounds.right - bounds.left) * fraction
  }
  function materialPose(index: number) {
    const bouquet = vase.value === '花束'
    const angleRange = bouquet ? 48 : 84
    const angle = -angleRange / 2 + angleRange * distributedFraction(index, 0.7548776662466927)
    const minHeight = bouquet ? 350 : 330
    const heightRange = bouquet ? 70 : 140
    return {
      x: materialLandingX(index),
      angle,
      stemHeight: minHeight + heightRange * distributedFraction(index, 0.5698402909980532),
    }
  }
  function addMaterial(material: CachedMaterial): number | null {
    if (material.category !== 'flower')
      return null
    remember()
    const id = ++nextId
    const kind = flowerCatalog.some(item => item.kind === material.id) ? material.id as FlowerKind : material.group === 'foliage' ? 'leaf' : 'rose'
    stems.value.push({ id, kind, materialId: material.id, flowerScale: 1, color: material.colors[0].value, ...constrainStem({ ...materialPose(stems.value.length), y: anchorY(vase.value) }) })
    return id
  }
  function setVaseMaterial(material: CachedMaterial, recordHistory = true) {
    const placement = vasePlacement(material)
    if (vaseMaterialId.value === material.id)
      return
    const enteringBouquet = material.category === 'bouquet' && vase.value !== '花束'
    const leavingBouquet = material.category === 'vase' && vase.value === '花束'
    const targetKey = material.id
    const currentKey = vaseMaterialId.value || `builtin:${vase.value}`
    const previousLayout = containerLayouts.value[targetKey]
    const clustered = material.category === 'vase' && stems.value.length > 1
      && (leavingBouquet || Math.max(...stems.value.map(stem => stem.x)) - Math.min(...stems.value.map(stem => stem.x)) < 8)
    if (recordHistory)
      remember()
    else
      endStemEdit()
    containerLayouts.value[currentKey] = stems.value.map(({ id, x, angle, stemHeight, flowerScale }) => ({ id, x, angle, stemHeight, flowerScale }))
    vase.value = material.category === 'bouquet' ? '花束' : '陶瓶'; vaseMaterialId.value = material.id
    const inset = Math.min(4, (placement.mouthRight - placement.mouthLeft) / 2)
    const left = placement.mouthLeft + inset; const right = placement.mouthRight - inset
    stems.value = stems.value.map((stem, index) => {
      const saved = previousLayout?.find(row => row.id === stem.id)
      if (saved)
        return { ...stem, ...saved, x: Math.max(left, Math.min(right, saved.x)), y: 747 }
      const x = clustered ? left + (right - left) * (0.2 + 0.6 * index / (stems.value.length - 1)) : Math.max(left, Math.min(right, stem.x))
      return { ...stem, x, y: 747, ...(enteringBouquet ? { angle: Math.max(-24, Math.min(24, stem.angle)), stemHeight: stem.kind === 'leaf' ? Math.max(170, Math.min(315, stem.stemHeight * 0.75)) : Math.max(350 / stem.flowerScale, Math.min(420, stem.stemHeight * 0.9)) } : {}), ...(leavingBouquet ? constrainStem({ x, y: 747, angle: stem.angle, stemHeight: stem.stemHeight / (stem.kind === 'leaf' ? 0.75 : 0.9) }) : {}) }
    })
  }
  function adjustSelected(field: 'angle' | 'height' | 'size', delta: number) {
    const stem = selected.value
    if (!stem || !Number.isFinite(delta))
      return
    const position = constrainStem({ x: stem.x, y: stem.y, angle: stem.angle + (field === 'angle' ? delta : 0), stemHeight: stem.stemHeight + (field === 'height' ? delta : 0) })
    const size = Math.max(0.65, Math.min(1.35, Math.round((stem.flowerScale + (field === 'size' ? delta : 0)) * 100) / 100))
    if (position.angle === stem.angle && position.stemHeight === stem.stemHeight && size === stem.flowerScale)
      return
    remember(); Object.assign(stem, position, { flowerScale: size })
  }
  function mirrorSelected() {
    if (!selected.value)
      return; remember(); selected.value.mirrored = !selected.value.mirrored
  }
  function selectAdjacent(direction: 'previous' | 'next') {
    if (!stems.value.length)
      return
    const index = selectedIndex.value
    select(stems.value[(index + (direction === 'next' ? 1 : -1) + stems.value.length) % stems.value.length].id)
  }
  function duplicateSelected(): number | null {
    if (!selected.value)
      return null
    const source = { ...selected.value }
    remember()
    const stem = { ...source, id: ++nextId }
    Object.assign(stem, constrainStem({ ...stem, angle: stem.angle + (stem.angle > 0 ? -8 : 8), stemHeight: stem.stemHeight + 24 }))
    stems.value.push(stem)
    select(stem.id)
    return stem.id
  }
  function removeSelected() {
    if (!selected.value)
      return
    remember()
    stems.value = stems.value.filter(stem => stem.id !== selectedId.value)
    for (const key of Object.keys(containerLayouts.value)) containerLayouts.value[key] = containerLayouts.value[key].filter(stem => stem.id !== selectedId.value)
    selectedId.value = null
  }
  function clearArtwork() {
    if (!stems.value.length)
      return
    remember(); stems.value = []; containerLayouts.value = {}; selectedId.value = null
  }
  function setColor(color: string) {
    if (!selected.value || selected.value.color === color || !/^#[\da-f]{6}$/i.test(color))
      return
    remember(); selected.value.color = color
  }
  function setVase(name: VaseName) {
    if (vase.value === name && !vaseMaterialId.value)
      return
    remember(); vase.value = name; vaseMaterialId.value = undefined
    stems.value.forEach((stem) => { stem.y = anchorY(name) })
  }
  function setBackground(value: Artwork['background']) {
    if (background.value === value && !backgroundMaterialId.value)
      return
    remember(); background.value = value; backgroundMaterialId.value = undefined
  }
  function setBackgroundMaterial(material: CachedMaterial) {
    if (material.category !== 'background' || backgroundMaterialId.value === material.id)
      return
    remember(); background.value = 'warm'; backgroundMaterialId.value = material.id
  }
  function setLayer(direction: 'front' | 'back') {
    if (direction === 'front' ? !canMoveFront.value : !canMoveBack.value)
      return
    const index = selectedIndex.value
    remember()
    const [stem] = stems.value.splice(index, 1)
    if (direction === 'front')
      stems.value.push(stem)
    else stems.value.unshift(stem)
  }
  function beginStemEdit(id: number): Stem | null {
    endStemEdit()
    const stem = stems.value.find(item => item.id === id)
    if (!stem)
      return null
    select(id); dragId = id; dragSnapshot = snapshot()
    return { ...stem, y: anchorY(vase.value) }
  }
  function updateStem(id: number, position: StemPosition) {
    const stem = stems.value.find(item => item.id === id)
    if (!stem || dragId !== id || !dragSnapshot)
      return
    const bounds = stemLandingBounds()
    const next = constrainStem({ ...position, x: Math.max(bounds.left, Math.min(bounds.right, position.x)), y: anchorY(vase.value) })
    if (next.x === stem.x && next.angle === stem.angle && next.stemHeight === stem.stemHeight)
      return
    if (!dragRecorded) { history.remember(dragSnapshot); dragRecorded = true }
    Object.assign(stem, next)
  }
  function beginSelectedControl() {
    if (selectedId.value !== null)
      controlOrigin = beginStemEdit(selectedId.value)
  }
  function updateSelectedControl(field: 'position' | 'height', value: number) {
    const stem = selected.value
    const bounds = selectedControlBounds.value
    if (!stem || !bounds || !Number.isFinite(value))
      return
    if (field === 'position') {
      const origin = controlOrigin ?? stem
      const angle = Math.max(bounds.positionMin, Math.min(bounds.positionMax, value))
      const landing = stemLandingBounds()
      const center = (landing.left + landing.right) / 2
      const halfWidth = (landing.right - landing.left) / 2
      const headOffset = Math.sin(angle * Math.PI / 180) * origin.stemHeight
      const desiredX = center + Math.max(-1, Math.min(1, headOffset / 240)) * halfWidth
      const minX = Math.max(landing.left, studioMetrics.headMargin - headOffset)
      const maxX = Math.min(landing.right, studioMetrics.width - studioMetrics.headMargin - headOffset)
      const x = Math.max(minX, Math.min(maxX, desiredX))
      updateStem(stem.id, { x, y: origin.y, angle, stemHeight: origin.stemHeight })
      return
    }
    updateStem(stem.id, { x: stem.x, y: stem.y, angle: stem.angle, stemHeight: Math.max(bounds.heightMin, Math.min(bounds.heightMax, value)) })
  }
  return { stems, vase, vaseMaterialId, background, backgroundMaterialId, selectedId, selected, selectedControlBounds, canUndo, canRedo, canClear, canMoveBack, canMoveFront, initialize, select, snapshot, stemLandingBounds, replaceArtwork, addFlower, addMaterial, setVaseMaterial, adjustSelected, mirrorSelected, selectAdjacent, duplicateSelected, removeSelected, clearArtwork, setColor, setVase, setBackground, setBackgroundMaterial, setLayer, undo, redo, beginStemEdit, beginSelectedControl, updateStem, updateSelectedControl, endStemEdit }
}
export function createArtworkStore(id: string) { return defineStore(id, artworkState) }
export const useArtworkStore = createArtworkStore('artwork')
export const useCreationArtworkStore = createArtworkStore('flower-creation')
