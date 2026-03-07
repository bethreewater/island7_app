# Cleanup Review

## 保留

- `pages/CaseDetail.tsx`: 核心案件作業頁，涵蓋評估、報價、收款、施工、保固，不建議再刪功能，只建議持續拆模組。
- `pages/Dashboard.tsx`: 仍是營運入口，但已抽出 `components/dashboard/` 與 `utils/operations.ts`，應保留並繼續做結構化整理。
- `pages/Notifications.tsx`: 保留，作為待補定位、待收款、保固回訪的即時提醒入口。
- `pages/OperationsReport.tsx`: 保留，提供管理層快速查看合約額、已收款、待收款與保固逾期。
- `components/TodayTasks.tsx`: 保留，已是現場與內勤的快捷入口。
- `services/pdfService.ts`: 保留，現在已承載報價、完工、保固等正式文件輸出。
- `pages/KnowledgeBase.tsx`: 保留，這是方案、材料、保固設定的主資料來源。
- `pages/ConstructionMap.tsx`: 保留，對現地定位、施工指派、回訪路徑仍有實用價值。

## 已刪

- `components/AppErrorBoundary.jsx`: 已刪除重複版本，保留 `components/AppErrorBoundary.tsx`。
- `components/QuickCalculator.tsx`: 已刪除，專案內已無任何引用，功能也與目前正式作業流程脫節。
- 舊式瀏覽器互動：`alert()` 與 `confirm()` 流程已移除，改用 toast 或自訂確認對話框。
- Dashboard 內嵌小元件：已抽出為 `components/dashboard/StatCard.tsx`、`components/dashboard/QuickActionButton.tsx`、`components/dashboard/QueueCard.tsx`。
- 支付比例重複邏輯：已抽到 `utils/payment.ts`，不再各頁各自計算。
- 營運例外判斷重複邏輯：已抽到 `utils/operations.ts`，供 Dashboard、提醒頁、報表共用。

## 建議下次刪或重構

- `pages/CaseDetail.tsx`: 已拆出商務與保固區塊，後續若再重構，優先整理現場評估資料更新與 zone 編輯流程。
- `pages/Dashboard.tsx`: 可再拆出篩選列、案件列表、建立/編輯案件 modal。
- `services/pdf/`: 已完成模組化，後續若再整理，優先補 shared schema 與版面測試，而不是再拆更多檔。
- `components/Layout.tsx`: 若通知與報表將長期存在，可補正式導覽入口，不要只靠 Dashboard 快捷鍵進入。
- `supabase/functions/delete-case-assets/`: 若短期不部署 Edge Function，可改標記為待啟用模組，避免被誤認為已上線功能。

## 暫不建議刪

- 保固模組：雖然流程較長，但這正是工程公司與一般報價工具的差異化能力。
- 地圖與定位：已與地址完整度、營運提醒直接連動，不屬於冗餘功能。
- PDF 輸出：合約、完工、保固證明都是實際交付物，不能只留畫面資料。
- 知識庫的材料/方案主檔：這是後續報價一致性與材料成本控管的基礎。
