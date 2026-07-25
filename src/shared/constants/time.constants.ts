/**
 * 共用時間單位常數，供 timeout / duration 換算使用。
 */
export const oneSecondToMilliseconds = 1000

/**
 * 微互動建議時長（對齊 design-system 150–300ms）。
 */
export const microInteractionDurationMs = 200

/**
 * 將秒轉為毫秒。
 */
export function secondsToMilliseconds(seconds: number) {
  return seconds * oneSecondToMilliseconds
}
