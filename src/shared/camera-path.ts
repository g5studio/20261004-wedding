/**
 * 鏡頭路徑關鍵幀：t 為整段旅程進度（0–1）。
 * 轉場刻意做成「先轉向 / 橫移，再往深度推進」。
 */
export type CameraKeyframe = {
  t: number
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
}

/**
 * 各場景在世界座標中的落點（對應 depthScenes 順序）。
 */
export const scenePoses = [
  { x: 0, y: 0, z: 0 },
  { x: 520, y: 20, z: -1200 },
  { x: 520, y: -50, z: -2450 },
  { x: -500, y: 30, z: -3700 },
  { x: -220, y: 70, z: -4950 },
  { x: 0, y: 0, z: -6200 },
] as const

/**
 * 每個場景的穩定落點進度（鏡頭會停在這些點，不會停在轉場中間）。
 */
export const sceneProgressStops = [0, 0.16, 0.34, 0.54, 0.76, 1] as const

/**
 * 鏡頭路徑：右移 → 深入 → 上飄 → 左擺 → 回中。
 */
export const cameraPath: CameraKeyframe[] = [
  // 01 開場：正面
  { t: 0, x: 0, y: 0, z: 180, rx: 3, ry: 0, rz: 0 },

  // 先向右看、橫移，再往後進入「相遇」
  { t: 0.07, x: 260, y: 10, z: 40, rx: 2, ry: -18, rz: 3 },
  { t: 0.16, x: 520, y: 20, z: -1200, rx: 3, ry: -8, rz: 0 },

  // 先稍微上抬右偏，再深入「約定」
  { t: 0.24, x: 690, y: -120, z: -1680, rx: 8, ry: -16, rz: -2 },
  { t: 0.34, x: 520, y: -50, z: -2450, rx: 2, ry: 4, rz: 0 },

  // 先大幅左轉，再進入「準備」
  { t: 0.44, x: 80, y: 10, z: -2900, rx: 1, ry: 22, rz: 4 },
  { t: 0.54, x: -500, y: 30, z: -3700, rx: 3, ry: 12, rz: 0 },

  // 先上飄左偏，再落到資訊場景
  { t: 0.64, x: -620, y: 140, z: -4200, rx: -4, ry: 10, rz: -3 },
  { t: 0.76, x: -220, y: 70, z: -4950, rx: 2, ry: -6, rz: 0 },

  // 回中並沉入收尾
  { t: 0.88, x: -90, y: 30, z: -5600, rx: 5, ry: 8, rz: 2 },
  { t: 1, x: 0, y: 0, z: -6200, rx: 2, ry: 0, rz: 0 },
]

export type CameraState = {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
}

/**
 * 取得指定場景的穩定進度。
 */
export function getSceneProgress(index: number) {
  const clamped = Math.min(
    sceneProgressStops.length - 1,
    Math.max(0, index),
  )
  return sceneProgressStops[clamped]
}

/**
 * 依旅程進度在鏡頭路徑上插值。
 */
export function sampleCameraPath(
  progress: number,
  path: CameraKeyframe[] = cameraPath,
): CameraState {
  const t = Math.min(1, Math.max(0, progress))

  if (t <= path[0].t) {
    const first = path[0]
    return {
      x: first.x,
      y: first.y,
      z: first.z,
      rx: first.rx,
      ry: first.ry,
      rz: first.rz,
    }
  }

  const last = path[path.length - 1]
  if (t >= last.t) {
    return {
      x: last.x,
      y: last.y,
      z: last.z,
      rx: last.rx,
      ry: last.ry,
      rz: last.rz,
    }
  }

  let endIndex = 1
  while (endIndex < path.length && path[endIndex].t < t) {
    endIndex += 1
  }

  const start = path[endIndex - 1]
  const end = path[endIndex]
  const span = end.t - start.t
  const localT = span === 0 ? 0 : (t - start.t) / span
  const eased = localT * localT * (3 - 2 * localT)

  return {
    x: start.x + (end.x - start.x) * eased,
    y: start.y + (end.y - start.y) * eased,
    z: start.z + (end.z - start.z) * eased,
    rx: start.rx + (end.rx - start.rx) * eased,
    ry: start.ry + (end.ry - start.ry) * eased,
    rz: start.rz + (end.rz - start.rz) * eased,
  }
}

/**
 * 相機與場景的立體距離，用於焦點透明度。
 */
export function distanceToScene(
  camera: CameraState,
  pose: { x: number; y: number; z: number },
) {
  const dx = camera.x - pose.x
  const dy = camera.y - pose.y
  const dz = camera.z - pose.z
  return Math.hypot(dx, dy, dz)
}

/**
 * 依目前鏡頭朝向，回傳簡短方向提示。
 */
export function getCameraDirectionHint(camera: CameraState) {
  const horizontal =
    Math.abs(camera.ry) > 8 ? (camera.ry < 0 ? '鏡頭偏右' : '鏡頭偏左') : null
  const vertical =
    Math.abs(camera.rx) > 5 ? (camera.rx < 0 ? '鏡頭上仰' : '鏡頭下俯') : null
  const depth = '向深處推進'

  if (horizontal && Math.abs(camera.ry) > Math.abs(camera.rx)) {
    return `${horizontal} → ${depth}`
  }
  if (vertical) {
    return `${vertical} → ${depth}`
  }
  return depth
}
