# Tiger App 全域共用元件 Reference

本檔整理目前專案可優先復用的共用元件索引，供 `shared-component-deteck` 進行場景比對。

## 全域共用層級

| 層級 | 路徑 | 說明 |
|---|---|---|
| Base 基礎層 | `lib/widgets/base` | 最底層 UI primitive，通常不直接在 feature 大量使用。 |
| Tiger 全域共用層 | `lib/widgets/tiger` | App 主要共用元件入口，優先復用。 |
| 跨 feature 共用層 | `lib/widgets/feature` | 領域型共用元件（sports/casino/contact verification 等）。 |
| feature 內共用層 | `lib/features/**/presentation/widgets*` | 同 feature 多畫面共用，非全域。 |

---

## 場景對照（優先檢查）

| 場景 | 優先共用元件 | 主要路徑 | 典型使用情境 |
|---|---|---|---|
| Empty 狀態 | `TigerEmptyView` | `lib/widgets/tiger/tiger_empty_view/tiger_empty_view.dart` | 無資料、搜尋無結果、初始空畫面 |
| Loading 骨架 | `TigerShimmer` | `lib/widgets/tiger/tiger_shimmer/tiger_shimmer.dart` | 列表或卡片資料載入中 |
| 全頁 Loading | `TigerFullScreenLoadingIndicator` | `lib/widgets/tiger/tiger_full_screen_loading_indicator/tiger_full_screen_loading_indicator.dart` | 需要 block 使用者操作的全屏 loading |
| 一般按鈕 | `TigerButton` | `lib/widgets/tiger/tiger_button/tiger_button.dart` | 送出、確認、主要 CTA |
| 圓形按鈕 | `TigerCircleButton` | `lib/widgets/tiger/tiger_circle_button/tiger_circle_button.dart` | icon action、右上角功能按鈕 |
| 文字顯示 | `TigerText` | `lib/widgets/tiger/tiger_text/tiger_text.dart` | 全域文案、i18n 文案 |
| 圖片顯示 | `TigerImage` | `lib/widgets/tiger/tiger_image/tiger_image.dart` | resource 圖、狀態圖、icon |
| 一般輸入 | `TigerTextFormField` | `lib/widgets/tiger/tiger_text_form_field/tiger_text_form_field.dart` | 表單輸入欄位 |
| 密碼輸入 | `TigerPasswordFormField` | `lib/widgets/tiger/tiger_password_form_field/tiger_password_form_field.dart` | 密碼/提款密碼欄位 |
| 手機輸入 | `TigerPhoneInput` | `lib/widgets/tiger/tiger_phone_input/tiger_phone_input.dart` | 國碼 + 手機號輸入 |
| Pin/Otp 輸入 | `TigerPinInput`, `TigerOtpFormField` | `lib/widgets/tiger/tiger_pin_input/tiger_pin_input.dart`, `lib/widgets/tiger/tiger_otp_form_field/tiger_otp_form_field.dart` | 驗證碼輸入、PIN 輸入 |
| Dialog | `TigerPopupDialog`, `TigerNoticeDialog` | `lib/widgets/tiger/tiger_dialog/` | 提示、確認、公告 |
| Bottom Sheet | `TigerBottomSheet`, `TigerSelectBottomSheet` | `lib/widgets/tiger/tiger_bottom_sheet/tiger_bottom_sheet.dart`, `lib/widgets/tiger/tiger_select_bottom_sheet/tiger_select_bottom_sheet.dart` | 底部彈窗與選項選擇 |
| 日期選擇 | `TigerDatePicker`, `TigerSingleDatePicker` | `lib/widgets/tiger/tiger_date_picker/tiger_date_picker.dart`, `lib/widgets/tiger/tiger_single_date_picker/tiger_single_date_picker.dart` | 日期篩選、生日選擇 |
| 下拉選擇 | `TigerDropdown` | `lib/widgets/tiger/tiger_dropdown/tiger_dropdown.dart` | 欄位選單、選項切換 |
| 分頁切換 | `TigerTabs` | `lib/widgets/tiger/tiger_tabs/tiger_tabs.dart` | tab 內容切換 |
| 分隔線 | `TigerDivider`, `TigerDashedDivider` | `lib/widgets/tiger/tiger_divider/tiger_divider.dart`, `lib/widgets/tiger/tiger_dashed_divider/tiger_dashed_divider.dart` | 區塊分隔 |
| 卡片外殼 | `TigerCardWrapper` | `lib/widgets/tiger/tiger_card_wrapper/tiger_card_wrapper.dart` | 內容卡片容器 |
| 分頁列表 | `TigerPaginatedListView` | `lib/widgets/tiger/tiger_paginated_list_view/tiger_paginated_list_view.dart` | 分頁清單載入 |
| Grid 內容 | `TigerGridView` | `lib/widgets/tiger/tiger_grid_view/tiger_grid_view.dart` | 宮格展示 |
| 影片播放 | `TigerVideo`, `TigerFlutterVideo` | `lib/widgets/tiger/tiger_video/tiger_video.dart`, `lib/widgets/tiger/tiger_flutter_video/tiger_flutter_video.dart` | 直播或影片區塊 |
| Web 內容 | `TigerWebView` | `lib/widgets/tiger/tiger_web_view/tiger_web_view.dart` | H5 頁面、支付頁 |
| Toast/通知 | `TigerToast`, `TigerNotification` | `lib/widgets/tiger/tiger_toast/tiger_toast.dart`, `lib/widgets/tiger/tiger_notification/tiger_notification.dart` | 操作結果提示 |
| UI 版本分流 | `TigerUiVersionBuilder` | `lib/widgets/tiger/builders/tiger_ui_version_builder/tiger_ui_version_builder.dart` | 普通版/國際版 UI 分流 |

---

## 跨 Feature 共用元件（`lib/widgets/feature`）

| 領域 | 共用元件 | 主要路徑 | 典型情境 |
|---|---|---|---|
| Contact Verification | `ContactVerificationScreen` | `lib/widgets/feature/contact_verification/contact_verification_screen.dart` | 金流/安全流程的 OTP 驗證 |
| Sports Video | `SportsVideoView`, `SportsFloatingVideoView`, `SportsVideoControl` | `lib/widgets/feature/sports_video/` | 體育直播播放與小窗持續播放 |
| Cast | `showChromecastPicker`, `CastActiveOverlay` | `lib/widgets/feature/cast/` | 投屏裝置選擇與投屏中畫面 |
| Casino Chatroom | `CasinoDraggableScrollableSheet`, `CasinoChatroomHeaderView`, `CasinoChatroomVideo`, `CasinoInGameFloatingButton` | `lib/widgets/feature/casino/` | 娛樂城聊天/直播整合 |
| Casino Live | `CasinoLiveCardList`, `CasinoLiveCard`, `CasinoLiveGenericCardList`, `CasinoLiveBottomSheetEntrance` | `lib/widgets/feature/casino/` | live 桌台卡片與入口 |
| Sports Settings | `SportsMarketDisplayTypeSwitch`, `SportsBetOddsSettingDropDown` | `lib/widgets/feature/` | 體育偏好設定 |
| Preference / Share | `GamePreferenceDropDownButton`, `ImmediateShareBottomSheet` | `lib/widgets/feature/` | 偏好設定、快速分享 |
| Complete Info | `SimpleCompleteInfoDialog`, `AdvancedCompleteInfoDialog` | `lib/widgets/feature/complete_info_dialog.dart` | 補齊資料提醒 |

---

## 偵測關鍵字建議（供 skill 比對）

| 關鍵字/改動線索 | 優先提示的共用元件 |
|---|---|
| `empty`, `no data`, `not found`, `empty view` | `TigerEmptyView` |
| `skeleton`, `loading placeholder`, `shimmer` | `TigerShimmer` |
| `dialog`, `confirm`, `notice`, `alert` | `TigerPopupDialog`, `TigerNoticeDialog` |
| `bottom sheet`, `picker`, `selector` | `TigerBottomSheet`, `TigerSelectBottomSheet`, `TigerDropdown` |
| `tab`, `segmented`, `switch section` | `TigerTabs` |
| `text field`, `input`, `form` | `TigerTextFormField`, `TigerPasswordFormField`, `TigerPhoneInput` |
| `otp`, `pin`, `verify code` | `TigerOtpFormField`, `TigerPinInput` |
| `video`, `live`, `stream` | `TigerVideo`, `SportsVideoView`, `CasinoChatroomVideo` |
| `webview`, `h5`, `html page` | `TigerWebView` |
| `list pagination`, `load more` | `TigerPaginatedListView` |
| `card wrapper`, `panel` | `TigerCardWrapper` |
| `v1/v2 split`, `ui version` | `TigerUiVersionBuilder` |

---

## 採用順序建議

1. 優先嘗試 `lib/widgets/tiger`
2. 若不符合，再評估 `lib/widgets/feature` 是否已有相同領域元件
3. 仍不足時，才在 feature 內建立 wrapper（基於 base/tiger）
4. 最後才是完全自建（需明確說明不採用共用元件理由）
