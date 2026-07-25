# 20261004 Wedding Invitation

以 React + Vite 建立的婚禮電子喜帖，目標為沈浸式滾動體驗，並部署於 GitHub Pages。

## 技術棧

- React 19 + TypeScript
- Vite 8 + Tailwind CSS 4
- GSAP ScrollTrigger（Journey 橫向敘事）
- Design Tokens（primitive → semantic → component）
- GitHub Actions → GitHub Pages

## Skills（自 ares 複製）

| 位置 | Skill |
|------|-------|
| `.cursor/skills/` | `design`, `design-system`, `ui-styling`, `ui-ux-pro-max`, `brand`, `banner-design` |
| `.agents/skills/` | `web-project`, `shared-component-deteck` |

設計來源：

- `design-system/20261004-wedding/MASTER.md`
- `design-system/20261004-wedding/pages/invitation.md`
- `docs/brand-guidelines.md`
- `assets/design-tokens.json`

## 開發

```bash
nvm use   # Node 22
npm install
npm run tokens:generate
npm run dev
```

## 頁面架構（目前 demo）

**3D Camera Path Stage**：離散場景切換（一次滾動 = 完整轉場一幕）。

- 鏡頭路徑含左右轉向與深度推進
- 轉場中無法停住；完成後才接受下一次輸入
- 右側節點可跳幕；鍵盤 ↑↓ 亦可用
- `prefers-reduced-motion` 時退回靜態直式閱讀

## 建置 / 部署

```bash
npm run build
npm run preview
```

推送到 `main` 後由 GitHub Actions 部署。首次請在 repo **Settings → Pages** 將 Source 設為 **GitHub Actions**。

線上：`https://g5studio.github.io/20261004-wedding/`
