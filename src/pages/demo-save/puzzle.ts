export type PuzzleEdge =
  | -1
  | 0
  | 1

export interface PuzzleEdgeProfile {
  width: number
  depth: number
}

export interface PuzzlePiece {
  id: number

  row: number
  col: number

  top: PuzzleEdge
  right: PuzzleEdge
  bottom: PuzzleEdge
  left: PuzzleEdge

  topProfile: PuzzleEdgeProfile
  rightProfile: PuzzleEdgeProfile
  bottomProfile: PuzzleEdgeProfile
  leftProfile: PuzzleEdgeProfile
}

export interface CoverCrop {
  sx: number
  sy: number

  sWidth: number
  sHeight: number
}

export interface PuzzleRoundedCorners {
  topLeft?: boolean
  topRight?: boolean
  bottomRight?: boolean
  bottomLeft?: boolean
}

/**
 * 可复现随机数
 */
function createRandom(seed = 1) {
  let current = seed >>> 0

  return () => {
    current = (
      current * 1664525
      + 1013904223
    ) >>> 0

    return current / 4294967296
  }
}

function randomEdge(
  random: () => number,
): PuzzleEdge {
  return random() >= 0.5
    ? 1
    : -1
}

function randomEdgeProfile(random: () => number): PuzzleEdgeProfile {
  return {
    width: 0.82 + random() * 0.32,
    depth: 0.8 + random() * 0.35,
  }
}

const flatEdgeProfile: PuzzleEdgeProfile = { width: 1, depth: 1 }

/**
 * 生成拼图形状
 */
export function generatePuzzle(
  rows: number,
  cols: number,
  seed = 20260914,
): PuzzlePiece[] {
  const random = createRandom(seed)

  const pieces: PuzzlePiece[] = []

  for (
    let row = 0;
    row < rows;
    row++
  ) {
    for (
      let col = 0;
      col < cols;
      col++
    ) {
      const id
        = row * cols + col

      let top: PuzzleEdge = 0
      let left: PuzzleEdge = 0
      let topProfile = flatEdgeProfile
      let leftProfile = flatEdgeProfile

      /**
       * 和上面拼图严格互补
       */
      if (row > 0) {
        const above
          = pieces[
        (row - 1) * cols + col
          ]

        top = (
          -above.bottom
        ) as PuzzleEdge
        topProfile = above.bottomProfile
      }

      /**
       * 和左边拼图严格互补
       */
      if (col > 0) {
        const leftPiece
          = pieces[
        row * cols + col - 1
          ]

        left = (
          -leftPiece.right
        ) as PuzzleEdge
        leftProfile = leftPiece.rightProfile
      }

      const right: PuzzleEdge
        = col === cols - 1
        ? 0
        : randomEdge(random)

      const bottom: PuzzleEdge
        = row === rows - 1
        ? 0
        : randomEdge(random)

      const rightProfile = right === 0 ? flatEdgeProfile : randomEdgeProfile(random)
      const bottomProfile = bottom === 0 ? flatEdgeProfile : randomEdgeProfile(random)

      pieces.push({
        id,

        row,
        col,

        top,
        right,
        bottom,
        left,
        topProfile,
        rightProfile,
        bottomProfile,
        leftProfile,
      })
    }
  }

  return pieces
}

/**
 * 普通进度 → 解锁块数
 */
export function getUnlockedCount(
  progress: number,
  total: number,
) {
  if (progress <= 0)
    return 0

  if (progress >= 1)
    return total

  return Math.floor(
    progress * total,
  )
}

/**
 * 获取上下左右邻居
 */
function getNeighbors(
  id: number,
  rows: number,
  cols: number,
) {
  const row
    = Math.floor(id / cols)

  const col
    = id % cols

  const result: number[] = []

  if (row > 0)
    result.push(id - cols)

  if (row < rows - 1)
    result.push(id + cols)

  if (col > 0)
    result.push(id - 1)

  if (col < cols - 1)
    result.push(id + 1)

  return result
}

/**
 * 邻近扩散式解锁顺序。
 *
 * 特点：
 *
 * 1. 第一块从中间附近开始
 * 2. 下一块一定与已解锁区域相邻
 * 3. 相邻已解锁块越多，越容易被选中
 * 4. 不会像纯随机一样到处散落
 */
export function createSpreadUnlockOrder(
  rows: number,
  cols: number,
  seed = 20260914,
) {
  const total
    = rows * cols

  if (total <= 0)
    return []

  const random
    = createRandom(seed)

  const order: number[] = []

  const unlocked
    = new Set<number>()

  /**
   * 找中心附近的格子。
   */
  const centerRows
    = rows % 2 === 0
    ? [
      rows / 2 - 1,
      rows / 2,
    ]
    : [
      Math.floor(rows / 2),
    ]

  const centerCols
    = cols % 2 === 0
    ? [
      cols / 2 - 1,
      cols / 2,
    ]
    : [
      Math.floor(cols / 2),
    ]

  const centerCandidates: number[] = []

  centerRows.forEach((row) => {
    centerCols.forEach((col) => {
      centerCandidates.push(
        row * cols + col,
      )
    })
  })

  /**
   * 从中心附近随机选择第一块。
   */
  const start
    = centerCandidates[
    Math.floor(
      random()
      * centerCandidates.length,
    )
    ]

  order.push(start)
  unlocked.add(start)

  while (
    order.length < total
    ) {
    /**
     * frontier:
     *
     * 当前已经解锁区域外围
     * 可以继续扩散的拼图。
     *
     * Map 的 value 表示：
     * 它周围已经有多少块被解锁。
     */
    const frontier
      = new Map<number, number>()

    unlocked.forEach((id) => {
      const neighbors
        = getNeighbors(
        id,
        rows,
        cols,
      )

      neighbors.forEach(
        (neighbor) => {
          if (
            unlocked.has(neighbor)
          ) {
            return
          }

          frontier.set(
            neighbor,
            (
              frontier.get(neighbor)
              ?? 0
            ) + 1,
          )
        },
      )
    })

    const candidates
      = Array.from(
      frontier.entries(),
    )

    /**
     * 理论上只要 rows / cols 正常，
     * frontier 不会为空。
     */
    if (!candidates.length) {
      break
    }

    /**
     * 已解锁邻居越多，
     * 权重越高。
     *
     * 这样会让区域更倾向于
     * “填满”，而不是长成细长的一条。
     */
    const weights
      = candidates.map(
      ([, neighborCount]) => {
        return (
          1
          + neighborCount * 1.8
        )
      },
    )

    const totalWeight
      = weights.reduce(
      (sum, value) =>
        sum + value,
      0,
    )

    let pointer
      = random() * totalWeight

    let selected
      = candidates[0][0]

    for (
      let index = 0;
      index < candidates.length;
      index++
    ) {
      pointer
        -= weights[index]

      if (pointer <= 0) {
        selected
          = candidates[index][0]

        break
      }
    }

    unlocked.add(selected)
    order.push(selected)
  }

  return order
}

/**
 * cover 图片裁剪
 */
export function getCoverCrop(
  imageWidth: number,
  imageHeight: number,
  targetWidth: number,
  targetHeight: number,
): CoverCrop {
  const imageRatio
    = imageWidth / imageHeight

  const targetRatio
    = targetWidth / targetHeight

  /**
   * 图片更宽
   */
  if (
    imageRatio
    > targetRatio
  ) {
    const sHeight
      = imageHeight

    const sWidth
      = imageHeight
      * targetRatio

    return {
      sx:
        (
          imageWidth
          - sWidth
        )
        / 2,

      sy: 0,

      sWidth,
      sHeight,
    }
  }

  /**
   * 图片更高
   */
  const sWidth
    = imageWidth

  const sHeight
    = imageWidth
    / targetRatio

  return {
    sx: 0,

    sy:
      (
        imageHeight
        - sHeight
      )
      / 2,

    sWidth,
    sHeight,
  }
}

/**
 * 绘制一条拼图边
 */
function traceEdge(
  ctx: UniApp.CanvasContext,

  startX: number,
  startY: number,

  endX: number,
  endY: number,

  edge: PuzzleEdge,

  normalX: number,
  normalY: number,

  amplitude: number,
  profile: PuzzleEdgeProfile,
) {
  /**
   * 外框平边
   */
  if (edge === 0) {
    ctx.lineTo(
      endX,
      endY,
    )

    return
  }

  const dx
    = endX - startX

  const dy
    = endY - startY

  const offsetX
    = normalX
    * amplitude
    * profile.depth
    * edge

  const offsetY
    = normalY
    * amplitude
    * profile.depth
    * edge

  function point(
    t: number,
    offset = 0,
  ) {
    return {
      x:
        startX
        + dx * t
        + offsetX * offset,

      y:
        startY
        + dy * t
        + offsetY * offset,
    }
  }

  const position = (value: number) => 0.5 + (value - 0.5) * profile.width

  const p32 = point(position(0.32))

  const p36 = point(position(0.36))

  const p40 = point(
    position(0.40),
    0.28,
  )

  const p42 = point(
    position(0.42),
    0.72,
  )

  const p44 = point(
    position(0.44),
    1,
  )

  const p50 = point(
    position(0.50),
    1,
  )

  const p56 = point(
    position(0.56),
    1,
  )

  const p58 = point(
    position(0.58),
    0.72,
  )

  const p60 = point(
    position(0.60),
    0.28,
  )

  const p64 = point(position(0.64))

  const p68 = point(position(0.68))

  ctx.lineTo(
    p32.x,
    p32.y,
  )

  /**
   * 进入凸起 / 凹槽
   */
  ctx.bezierCurveTo(
    p36.x,
    p36.y,

    p40.x,
    p40.y,

    p42.x,
    p42.y,
  )

  /**
   * 到达圆头
   */
  ctx.bezierCurveTo(
    p44.x,
    p44.y,

    p44.x,
    p44.y,

    p50.x,
    p50.y,
  )

  /**
   * 离开圆头
   */
  ctx.bezierCurveTo(
    p56.x,
    p56.y,

    p56.x,
    p56.y,

    p58.x,
    p58.y,
  )

  /**
   * 回到正常边缘
   */
  ctx.bezierCurveTo(
    p60.x,
    p60.y,

    p64.x,
    p64.y,

    p68.x,
    p68.y,
  )

  ctx.lineTo(
    endX,
    endY,
  )
}

/**
 * 绘制单块拼图 Path
 */
export function tracePiecePath(
  ctx: UniApp.CanvasContext,

  piece: PuzzlePiece,

  x: number,
  y: number,

  width: number,
  height: number,
  roundedCorners: PuzzleRoundedCorners = {},
) {
  /**
   * 控制凹凸大小。
   *
   * 让凸起更接近真实拼图的圆头比例。
   */
  const amplitude
    = Math.min(
    width,
    height,
    ) * 0.24

  const cornerRadius = Math.min(width, height) * 0.32
  const topLeft = roundedCorners.topLeft ? cornerRadius : 0
  const topRight = roundedCorners.topRight ? cornerRadius : 0
  const bottomRight = roundedCorners.bottomRight ? cornerRadius : 0
  const bottomLeft = roundedCorners.bottomLeft ? cornerRadius : 0
  const curve = 0.552

  ctx.beginPath()

  ctx.moveTo(
    x + topLeft,
    y,
  )

  /**
   * 上
   */
  traceEdge(
    ctx,

    x + topLeft,
    y,

    x + width - topRight,
    y,

    piece.top,

    0,
    -1,

    amplitude,
    piece.topProfile,
  )

  if (topRight) {
    ctx.bezierCurveTo(
      x + width - topRight + topRight * curve,
      y,
      x + width,
      y + topRight - topRight * curve,
      x + width,
      y + topRight,
    )
  }

  /**
   * 右
   */
  traceEdge(
    ctx,

    x + width,
    y + topRight,

    x + width,
    y + height - bottomRight,

    piece.right,

    1,
    0,

    amplitude,
    piece.rightProfile,
  )

  if (bottomRight) {
    ctx.bezierCurveTo(
      x + width,
      y + height - bottomRight + bottomRight * curve,
      x + width - bottomRight + bottomRight * curve,
      y + height,
      x + width - bottomRight,
      y + height,
    )
  }

  /**
   * 下
   */
  traceEdge(
    ctx,

    x + width - bottomRight,
    y + height,

    x + bottomLeft,
    y + height,

    piece.bottom,

    0,
    1,

    amplitude,
    piece.bottomProfile,
  )

  if (bottomLeft) {
    ctx.bezierCurveTo(
      x + bottomLeft - bottomLeft * curve,
      y + height,
      x,
      y + height - bottomLeft + bottomLeft * curve,
      x,
      y + height - bottomLeft,
    )
  }

  /**
   * 左
   */
  traceEdge(
    ctx,

    x,
    y + height - bottomLeft,

    x,
    y + topLeft,

    piece.left,

    -1,
    0,

    amplitude,
    piece.leftProfile,
  )

  if (topLeft) {
    ctx.bezierCurveTo(
      x,
      y + topLeft - topLeft * curve,
      x + topLeft - topLeft * curve,
      y,
      x + topLeft,
      y,
    )
  }

  ctx.closePath()
}
