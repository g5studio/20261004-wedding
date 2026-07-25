# Page Override: Invitation

> Overrides `MASTER.md` for the main wedding invitation scroll page.

## Typography Override

繁中喜帖優先：

- Heading: `Noto Serif TC`
- Body: `Noto Sans TC`
- Script accent: `Great Vibes`（僅拉丁裝飾字）

## Layout Override

遵循 Horizontal Scroll Journey，但行動裝置上 Journey 改為垂直章節串接（避免強制橫向滑動造成可用性問題）。

## Component Rules

- Hero：全幅、無卡片、無浮貼徽章
- 第一視窗：品牌（新人名）+ 一句話 + 向下提示
- 不使用 emoji 圖示
- CTA 使用 token：`--component-button-*`

## Motion

- 複雜 scrub / pin 僅保留 1 段（Journey）
- 其餘段落用輕量 scroll reveal
- `prefers-reduced-motion: reduce` 時改為靜態排版
