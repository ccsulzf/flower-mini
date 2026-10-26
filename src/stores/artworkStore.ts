import type { Artwork, MaterialInstance, MaterialLayout, MaterialTransform } from '@/models/artwork'
import type { CachedMaterial, FlowerGeometry } from '@/models/material'
import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { constrainMaterialTransform, studioMetrics } from '@/utils/flower/arrangement.cjs'
import { ArtworkHistory, copyArtwork, copyContainerLayouts } from '@/utils/flower/artwork-history'
import { vasePlacement } from '@/utils/flower/material-render'

type MaterialResolver = (id: string) => CachedMaterial | undefined
type LayerDirection = 'forward' | 'backward'

function emptyArtwork(): Artwork {
  return { background: { materialId: '' }, container: { materialId: '', type: 'vase' }, materials: [], containerLayouts: {} }
}

function materialGeometry(material: CachedMaterial | undefined) {
  return material?.category === 'flower' ? material.geometry as FlowerGeometry | undefined : undefined
}

function mouthBounds(container: CachedMaterial) {
  const placement = vasePlacement(container)
  const inset = Math.min(4, (placement.mouthRight - placement.mouthLeft) / 2)
  return { left: placement.mouthLeft + inset, right: placement.mouthRight - inset, y: 747 }
}

function distributedFraction(index: number, step: number) {
  return index === 0 ? 0.5 : (index * step) % 1
}

function toLayout(material: MaterialInstance): MaterialLayout {
  const { anchor, angle, height, scale } = material.transform
  return { materialInstanceId: material.id, anchor: { ...anchor }, angle, height, scale }
}

function artworkState() {
  const artwork = ref<Artwork>(emptyArtwork())
  const history = reactive(new ArtworkHistory())
  const canUndo = computed(() => history.past.length > 0)
  const canRedo = computed(() => history.future.length > 0)
  const canClear = computed(() => artwork.value.materials.length > 0)
  let nextId = 0
  let editId: number | null = null
  let editSnapshot: Artwork | null = null

  const background = computed(() => artwork.value.background)
  const container = computed(() => artwork.value.container)
  const materials = computed(() => artwork.value.materials)
  const containerLayouts = computed(() => artwork.value.containerLayouts)

  function snapshot() {
    return copyArtwork(artwork.value)
  }

  function applyArtwork(next: Artwork) {
    editId = null
    editSnapshot = null
    artwork.value = copyArtwork(next)
    nextId = Math.max(0, ...next.materials.map(material => material.id))
  }

  function initialize(next: Artwork) {
    applyArtwork(next)
    history.past = []
    history.future = []
  }

  function remember() {
    endEdit()
    history.remember(snapshot())
  }

  function replaceArtwork(next: Artwork) {
    remember()
    applyArtwork(next)
  }

  function getMaterial(id: number) {
    return artwork.value.materials.find(material => material.id === id)
  }

  function materialIndex(id: number) {
    return artwork.value.materials.findIndex(material => material.id === id)
  }

  function canMoveBackward(id: number) {
    return materialIndex(id) > 0
  }

  function canMoveForward(id: number) {
    const index = materialIndex(id)
    return index >= 0 && index < artwork.value.materials.length - 1
  }

  function createPose(index: number, material: CachedMaterial, containerMaterial: CachedMaterial): MaterialTransform {
    const mouth = mouthBounds(containerMaterial)
    const bouquet = containerMaterial.category === 'bouquet'
    const angleRange = bouquet ? 48 : 84
    const minHeight = bouquet ? 350 : 330
    const heightRange = bouquet ? 70 : 140
    const transform = {
      anchor: {
        x: mouth.left + (mouth.right - mouth.left) * distributedFraction(index, 0.6180339887498949),
        y: mouth.y,
      },
      angle: -angleRange / 2 + angleRange * distributedFraction(index, 0.7548776662466927),
      height: minHeight + heightRange * distributedFraction(index, 0.5698402909980532),
      scale: 1,
      mirrored: false,
    }
    return constrainMaterialTransform(transform, materialGeometry(material), mouth)
  }

  function addMaterial(material: CachedMaterial, containerMaterial: CachedMaterial): number | null {
    if (material.category !== 'flower' || (containerMaterial.category !== 'vase' && containerMaterial.category !== 'bouquet'))
      return null
    remember()
    const id = ++nextId
    artwork.value.materials.push({
      id,
      materialId: material.id,
      group: material.group,
      color: material.colors[0]?.value || '#ffffff',
      transform: createPose(artwork.value.materials.length, material, containerMaterial),
    })
    return id
  }

  function duplicateMaterial(id: number, sourceMaterial: CachedMaterial, containerMaterial: CachedMaterial): number | null {
    const index = materialIndex(id)
    const source = artwork.value.materials[index]
    if (!source || sourceMaterial.category !== 'flower')
      return null
    remember()
    const duplicateId = ++nextId
    const duplicate: MaterialInstance = {
      ...source,
      id: duplicateId,
      transform: constrainMaterialTransform({
        ...source.transform,
        anchor: { ...source.transform.anchor },
        angle: source.transform.angle + (source.transform.angle > 0 ? -8 : 8),
        height: source.transform.height + 24,
      }, materialGeometry(sourceMaterial), mouthBounds(containerMaterial)),
    }
    artwork.value.materials.splice(index + 1, 0, duplicate)
    for (const layouts of Object.values(artwork.value.containerLayouts)) {
      const layoutIndex = layouts.findIndex(layout => layout.materialInstanceId === id)
      if (layoutIndex < 0)
        continue
      const layout = layouts[layoutIndex]
      layouts.splice(layoutIndex + 1, 0, {
        ...layout,
        materialInstanceId: duplicateId,
        anchor: { ...layout.anchor },
        angle: Math.max(-65, Math.min(65, layout.angle + (layout.angle > 0 ? -8 : 8))),
        height: Math.max(studioMetrics.minMaterialHeight, Math.min(studioMetrics.maxMaterialHeight, layout.height + 24)),
      })
    }
    return duplicateId
  }

  function removeMaterial(id: number) {
    if (materialIndex(id) < 0)
      return false
    remember()
    artwork.value.materials = artwork.value.materials.filter(material => material.id !== id)
    for (const key of Object.keys(artwork.value.containerLayouts))
      artwork.value.containerLayouts[key] = artwork.value.containerLayouts[key].filter(layout => layout.materialInstanceId !== id)
    return true
  }

  function clearMaterials() {
    if (!artwork.value.materials.length)
      return
    remember()
    artwork.value.materials = []
    artwork.value.containerLayouts = {}
  }

  function setMaterialColor(id: number, color: string) {
    const material = getMaterial(id)
    if (!material || material.color === color || !/^#[\da-f]{6}$/i.test(color))
      return
    remember()
    material.color = color
  }

  function setMaterialMirror(id: number) {
    const material = getMaterial(id)
    if (!material)
      return
    remember()
    material.transform.mirrored = !material.transform.mirrored
  }

  function moveMaterialLayer(id: number, direction: LayerDirection) {
    const index = materialIndex(id)
    const target = direction === 'forward' ? artwork.value.materials.length - 1 : 0
    if (index < 0 || index === target)
      return false
    remember()
    const [current] = artwork.value.materials.splice(index, 1)
    if (direction === 'forward')
      artwork.value.materials.push(current)
    else
      artwork.value.materials.unshift(current)
    return true
  }

  function setBackground(material: CachedMaterial) {
    if (material.category !== 'background' || artwork.value.background.materialId === material.id)
      return false
    remember()
    artwork.value.background = { materialId: material.id }
    return true
  }

  function firstContainerTransform(material: MaterialInstance, index: number, target: CachedMaterial, resolveMaterial: MaterialResolver) {
    const mouth = mouthBounds(target)
    const enteringBouquet = target.category === 'bouquet' && artwork.value.container.type !== 'bouquet'
    const leavingBouquet = target.category === 'vase' && artwork.value.container.type === 'bouquet'
    const fraction = artwork.value.materials.length <= 1 ? 0.5 : 0.2 + 0.6 * index / (artwork.value.materials.length - 1)
    const heightFactor = material.group === 'foliage' ? 0.75 : 0.9
    return constrainMaterialTransform({
      ...material.transform,
      anchor: { x: mouth.left + (mouth.right - mouth.left) * fraction, y: mouth.y },
      angle: enteringBouquet ? Math.max(-24, Math.min(24, material.transform.angle)) : material.transform.angle,
      height: enteringBouquet ? material.transform.height * heightFactor : leavingBouquet ? material.transform.height / heightFactor : material.transform.height,
    }, materialGeometry(resolveMaterial(material.materialId)), mouth)
  }

  function setContainer(target: CachedMaterial, resolveMaterial: MaterialResolver) {
    if ((target.category !== 'vase' && target.category !== 'bouquet') || artwork.value.container.materialId === target.id)
      return false
    remember()
    const currentId = artwork.value.container.materialId
    if (currentId)
      artwork.value.containerLayouts[currentId] = artwork.value.materials.map(toLayout)
    const saved = artwork.value.containerLayouts[target.id]
    const savedById = new Map(saved?.map(layout => [layout.materialInstanceId, layout]))
    const mouth = mouthBounds(target)
    artwork.value.materials = artwork.value.materials.map((material, index) => {
      const layout = savedById.get(material.id)
      const transform = layout
        ? constrainMaterialTransform({ ...material.transform, ...layout, anchor: { ...layout.anchor } }, materialGeometry(resolveMaterial(material.materialId)), mouth)
        : firstContainerTransform(material, index, target, resolveMaterial)
      return { ...material, transform }
    })
    artwork.value.container = { materialId: target.id, type: target.category }
    return true
  }

  function beginEdit(id: number) {
    endEdit()
    const material = getMaterial(id)
    if (!material)
      return null
    editId = id
    editSnapshot = snapshot()
    return { ...material, transform: { ...material.transform, anchor: { ...material.transform.anchor } } }
  }

  function updateMaterialTransform(id: number, transform: MaterialTransform, sourceMaterial: CachedMaterial, containerMaterial: CachedMaterial) {
    const material = getMaterial(id)
    if (!material || editId !== id || !editSnapshot)
      return false
    const next = constrainMaterialTransform(transform, materialGeometry(sourceMaterial), mouthBounds(containerMaterial))
    if (JSON.stringify(next) === JSON.stringify(material.transform))
      return false
    material.transform = next
    return true
  }

  function endEdit() {
    if (!editSnapshot) {
      editId = null
      return
    }
    const before = editSnapshot
    editId = null
    editSnapshot = null
    if (JSON.stringify(before) !== JSON.stringify(artwork.value))
      history.remember(before)
  }

  function undo() {
    endEdit()
    const previous = history.undo(snapshot())
    if (previous)
      applyArtwork(previous)
  }

  function redo() {
    endEdit()
    const next = history.redo(snapshot())
    if (next)
      applyArtwork(next)
  }

  return {
    artwork,
    background,
    container,
    materials,
    containerLayouts,
    canUndo,
    canRedo,
    canClear,
    snapshot,
    initialize,
    replaceArtwork,
    getMaterial,
    canMoveBackward,
    canMoveForward,
    addMaterial,
    duplicateMaterial,
    removeMaterial,
    clearMaterials,
    setMaterialColor,
    setMaterialMirror,
    moveMaterialLayer,
    setBackground,
    setContainer,
    beginEdit,
    updateMaterialTransform,
    endEdit,
    undo,
    redo,
  }
}

export function createArtworkStore(id: string) { return defineStore(id, artworkState) }
export const useArtworkStore = createArtworkStore('artwork')
export const useCreationArtworkStore = createArtworkStore('flower-creation')
