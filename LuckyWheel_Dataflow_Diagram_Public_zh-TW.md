# Lucky Wheel 公開 API 整合流程圖

這是提供給 Customer Platform 團隊的公開整合視圖繁體中文版。

刻意隱藏的內容：

- 私有 headers、signatures 與 token 欄位
- Lucky Wheel server 內部 endpoints
- 內部 realtime 與 leaderboard 更新細節
- 不另外顯示玩家泳道；玩家操作皆透過 Lucky Wheel Frontend 發生

```mermaid
sequenceDiagram
    autonumber
    participant LWF as Lucky Wheel Frontend
    participant LWP as Lucky Wheel Platform
    participant MAP as Merchant API
    participant CP as Customer Platform

    Note over LWF,LWP: Lucky Wheel 端
    Note over MAP,CP: Customer Platform 端

    CP->>MAP: 呼叫 Launch Game API + playerId + initialEligibility
    MAP->>LWP: 依 playerId 建立 player session
    LWP-->>MAP: Game URL
    MAP-->>CP: Game URL
    CP->>LWF: 開啟 Lucky Wheel + customer initialEligibility

    LWF->>LWP: 載入 current event 與 player state
    LWP->>MAP: 取得 deposit eligibility
    MAP->>CP: 解析 deposit eligibility + deposit URL
    CP-->>MAP: deposit eligibility 結果
    MAP-->>LWP: deposit eligibility 結果
    Note over LWP: 最終 eligibility = live event + 今日已使用 spins + deposit rule
    LWP-->>LWF: Event data + eligibility

    alt 玩家可以進行 Spin
        Note over LWF: 玩家在前端點擊 Spin
        LWF->>LWP: 提交 spin request
        Note over LWP: 依 event config + spin history 重新檢查每日 eligibility
        LWP->>MAP: 確認最新的 deposit eligibility
        MAP->>CP: 確認最新的 deposit eligibility + deposit URL
        CP-->>MAP: deposit eligibility 結果
        MAP-->>LWP: deposit eligibility 結果
        LWP-->>LWF: Spin 結果
    else 玩家不能進行 Spin
        LWP-->>LWF: 顯示 not eligible 狀態或導向 deposit redirect
    end

    Note over LWF,CP: initialEligibility 僅為 Customer Platform 提供的 bootstrap 資料。Lucky Wheel 在啟動後仍會重新載入並重新驗證 eligibility。
    Note over LWF,CP: 每日 spin 使用量由 Lucky Wheel 負責，並依 event config 與目前 event day 的已使用 spins 計算。
    Note over LWF,CP: 與 deposit 相關的 eligibility 與 deposit URL 由 Customer Platform 透過 Merchant API 提供。
```
