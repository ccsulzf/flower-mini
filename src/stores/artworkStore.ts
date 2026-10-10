import type { CachedMaterial } from '@/models/material'
import { vasePlacement } from '@/utils/flower/material-render'
import type { Artwork, FlowerKind, Stem, VaseName } from '@/models/artwork'
import type { StemPosition } from '@/utils/flower/arrangement.cjs'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { createDefaultArtwork, flowerCatalog } from '@/config/flower-materials'
import { anchorY } from '@/utils/flower/artwork'
import { ArtworkHistory } from '@/utils/flower/artwork-history'
import { constrainStem } from '@/utils/flower/arrangement.cjs'

export const useArtworkStore = defineStore('artwork', () => {
  const initial = createDefaultArtwork()
  const stems = ref<Stem[]>(initial.stems)
  const vase = ref<VaseName>(initial.vase)
  const vaseMaterialId = ref<string | undefined>()
  const vaseMaterialRevision = ref<string | undefined>()
  const background = ref<Artwork['background']>(initial.background)
  const selectedId = ref<number | null>(null)
  const history = reactive(new ArtworkHistory())
  const selected = computed(() => stems.value.find(stem => stem.id === selectedId.value))
  const selectedIndex = computed(() => stems.value.findIndex(stem => stem.id === selectedId.value))
  const canUndo = computed(() => history.past.length > 0)
  const canRedo = computed(() => history.future.length > 0)
  const canClear = computed(() => stems.value.length > 0)
  const canMoveBack = computed(() => selectedIndex.value > 0)
  const canMoveFront = computed(() => selectedIndex.value >= 0 && selectedIndex.value < stems.value.length - 1)
  let nextId = 3
  let dragSnapshot: Artwork | null = null
  let dragId: number | null = null
  let dragRecorded = false

  function snapshot(): Artwork {
    return { version: 2, vase: vase.value, ...(vaseMaterialId.value ? { vaseMaterialId: vaseMaterialId.value, vaseMaterialRevision: vaseMaterialRevision.value } : {}), background: background.value, stems: stems.value.map(stem => ({ ...stem, y: anchorY(vase.value) })) }
  }
  function select(id: number | null) {
    selectedId.value = stems.value.some(stem => stem.id === id) ? id : null
  }
  function endStemEdit() { dragSnapshot = null; dragId = null; dragRecorded = false }
  function applyArtwork(artwork: Artwork) {
    endStemEdit()
    stems.value = artwork.stems.map(stem => ({ ...stem, y: anchorY(artwork.vase) }))
    vase.value = artwork.vase
    vaseMaterialId.value = artwork.vaseMaterialId
    vaseMaterialRevision.value = artwork.vaseMaterialRevision
    background.value = artwork.background
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
    if (previous) applyArtwork(previous)
  }
  function redo() {
    const next = history.redo(snapshot())
    if (next) applyArtwork(next)
  }
  function addFlower(kind: FlowerKind): number | null {
    if (stems.value.length >= 16) return null
    const flower = flowerCatalog.find(item => item.kind === kind)
    if (!flower) return null
    remember()
    const id = ++nextId
    stems.value.push({ id, kind, flowerScale: flower.size, color: flower.color, ...constrainStem({ x: 350 + (id % 3 - 1) * 12, y: anchorY(vase.value), angle: (id % 3 - 1) * 18, stemHeight: flower.height + (id % 3 - 1) * 24 }) })
    return id
  }
  function addMaterial(material: CachedMaterial): number | null {
    if (material.category !== 'flower' || stems.value.length >= 16) return null
    remember()
    const id = ++nextId
    const kind = flowerCatalog.some(item => item.kind === material.id) ? material.id as FlowerKind : material.group === 'foliage' ? 'leaf' : 'rose'
    stems.value.push({ id, kind, materialId: material.id, materialRevision: material.revision, leafMode: 'with', flowerScale: 1, color: material.colors[0].value,
      ...constrainStem({ x: 350, y: anchorY(vase.value), angle: 0, stemHeight: 410 }) })
    return id
  }
  function setVaseMaterial(material: CachedMaterial) {
    const placement = vasePlacement(material)
    remember()
    vase.value = '陶瓶'; vaseMaterialId.value = material.id; vaseMaterialRevision.value = material.revision
    stems.value = stems.value.map(stem => ({ ...stem, x: Math.max(placement.mouthLeft + 4, Math.min(placement.mouthRight - 4, stem.x)), y: 747 }))
  }
  function toggleLeaves() {
    if (!selected.value?.materialId) return
    remember(); selected.value.leafMode = selected.value.leafMode === 'without' ? 'with' : 'without'
  }
  function duplicateSelected(): number | null {
    if (!selected.value || stems.value.length >= 16) return null
    const source = { ...selected.value }
    remember()
    const stem = { ...source, id: ++nextId }
    Object.assign(stem, constrainStem({ ...stem, angle: stem.angle + (stem.angle > 0 ? -8 : 8), stemHeight: stem.stemHeight + 24 }))
    stems.value.push(stem)
    select(stem.id)
    return stem.id
  }
  function removeSelected() {
    if (!selected.value) return
    remember()
    stems.value = stems.value.filter(stem => stem.id !== selectedId.value)
    selectedId.value = null
  }
  function clearArtwork() {
    if (!stems.value.length) return
    remember(); stems.value = []; selectedId.value = null
  }
  function setColor(color: string) {
    if (!selected.value || selected.value.color === color || !/^#[\da-f]{6}$/i.test(color)) return
    remember(); selected.value.color = color
  }
  function setVase(name: VaseName) {
    if (vase.value === name && !vaseMaterialId.value) return
    remember(); vase.value = name; vaseMaterialId.value = undefined; vaseMaterialRevision.value = undefined
    stems.value.forEach((stem) => { stem.y = anchorY(name) })
  }
  function setBackground(value: Artwork['background']) {
    if (background.value === value) return
    remember(); background.value = value
  }
  function setLayer(direction: 'front' | 'back') {
    if (direction === 'front' ? !canMoveFront.value : !canMoveBack.value) return
    const index = selectedIndex.value
    remember()
    const [stem] = stems.value.splice(index, 1)
    if (direction === 'front') stems.value.push(stem)
    else stems.value.unshift(stem)
  }
  function beginStemEdit(id: number): Stem | null {
    endStemEdit()
    const stem = stems.value.find(item => item.id === id)
    if (!stem) return null
    select(id); dragId = id; dragSnapshot = snapshot()
    return { ...stem, y: anchorY(vase.value) }
  }
  function updateStem(id: number, position: StemPosition) {
    const stem = stems.value.find(item => item.id === id)
    if (!stem || dragId !== id || !dragSnapshot) return
    const next = constrainStem({ ...position, x: stem.x, y: anchorY(vase.value) })
    if (next.angle === stem.angle && next.stemHeight === stem.stemHeight) return
    if (!dragRecorded) { history.remember(dragSnapshot); dragRecorded = true }
    Object.assign(stem, next)
  }
  return { stems, vase, vaseMaterialId, vaseMaterialRevision, background, selectedId, selected, canUndo, canRedo, canClear, canMoveBack, canMoveFront,
    initialize, select, snapshot, replaceArtwork, addFlower, addMaterial, setVaseMaterial, toggleLeaves, duplicateSelected, removeSelected, clearArtwork,
    setColor, setVase, setBackground, setLayer, undo, redo, beginStemEdit, updateStem, endStemEdit }
})
