/**
 * 共用時間單位常數，供 timeout / duration 換算使用。
 */
export const oneSecondToMilliseconds = 1000

/**
 * 微互動建議時長（對齊 design-system 150–300ms）。
 */
export const microInteractionDurationMs = 200

/**
 * 序章喜帖封面停留後開始翻頁的延遲。
 */
export const invitationPopupOpenDelayMs = 3000

/**
 * 讓喜帖關鍵圖片優先取得頻寬後，再開始依序預載場景圖片。
 */
export const sceneImagePreloadStartDelayMs = 600

/**
 * 將秒轉為毫秒。
 */
export function secondsToMilliseconds(seconds: number) {
  return seconds * oneSecondToMilliseconds
}
