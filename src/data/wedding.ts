/**
 * 婚禮內容設定 — 之後可依實際資訊調整。
 */
export const wedding = {
  couple: {
    partnerA: 'Partner A',
    partnerB: 'Partner B',
  },
  date: {
    iso: '2026-10-04',
    display: '2026.10.04',
    weekday: '星期日',
  },
  venue: {
    name: '婚禮場地名稱',
    address: '場地地址（待更新）',
  },
  message: '誠摯邀請您，一同見證我們的約定。',
} as const

export type DepthScene = {
  id: string
  eyebrow: string
  title: string
  text: string
  tone: 'dawn' | 'grove' | 'gold' | 'dusk' | 'ember' | 'moon'
}

/**
 * 3D 場景內容（世界座標與鏡頭路徑見 shared/camera-path.ts）。
 */
export const depthScenes: DepthScene[] = [
  {
    id: 'invite',
    eyebrow: 'Invitation',
    title: 'Partner A & Partner B',
    text: '誠摯邀請您，一同見證我們的約定。',
    tone: 'dawn',
  },
  {
    id: 'meet',
    eyebrow: 'Chapter 01',
    title: '相遇',
    text: '故事從一次偶然的相遇開始，時光慢慢靠近。',
    tone: 'grove',
  },
  {
    id: 'promise',
    eyebrow: 'Chapter 02',
    title: '約定',
    text: '我們決定把未來，寫進同一個日子。',
    tone: 'gold',
  },
  {
    id: 'prepare',
    eyebrow: 'Chapter 03',
    title: '準備',
    text: '挑選場地、書寫誓言，把祝福一一安放。',
    tone: 'dusk',
  },
  {
    id: 'details',
    eyebrow: 'Details',
    title: '2026.10.04',
    text: '星期日 · 婚禮場地名稱 · 場地地址（待更新）',
    tone: 'ember',
  },
  {
    id: 'closing',
    eyebrow: 'With Love',
    title: '期待與您相見',
    text: '向下的距離，是走進我們故事的深度。',
    tone: 'moon',
  },
]
