# Lucky Wheel 公開 API 整合流程圖

此圖提供 Customer Platform 團隊使用的公開整合視圖。

刻意不顯示的內容：

- 此公開流程不需要知道的 token 欄位與內部 headers
- Lucky Wheel Server 內部端點
- 內部 realtime 與 leaderboard 更新細節
- 玩家不另外顯示成獨立 swimlane；玩家操作皆透過 Lucky Wheel Frontend 進行

```mermaid
sequenceDiagram
    autonumber
    participant LWF as Lucky Wheel Frontend
    participant LWP as Lucky Wheel Platform
    participant MAP as Merchant API
    participant CP as Customer Platform

    Note over LWF,LWP: Lucky Wheel 端
    Note over MAP,CP: Customer Platform 端

    CP->>MAP: 呼叫 Launch Game API + X-Integration-Guid + playerId + initialEligibility + timestamp
    Note over MAP: 由伺服器設定解析單一 merchant
    MAP->>LWP: 建立玩家 session
    LWP-->>MAP: 遊戲 URL
    MAP-->>CP: 遊戲 URL
    CP->>LWF: 開啟 Lucky Wheel + customer initialEligibility

    LWF->>LWP: 載入最新遊戲狀態
    Note over LWP: 解析目前 live event 與 event-day 日期
    LWP->>MAP: 取得玩家與 event 的 deposit eligibility
    Note over MAP: 從環境或 merchant 設定解析 SiteID
    Note over MAP: 將 playerId 對應為 Account，將 event-day 對應為 RecordDate
    MAP->>CP: SOAP LuckyWheel_Deposit_isEligible(CompAccesskey, SiteID, Account, RecordDate)
    CP-->>MAP: ServiceResult + IsEligible + DepositUrl
    Note over MAP: Status=false 代表上游失敗，不是業務性不符合資格
    MAP-->>LWP: 標準化 deposit eligibility 結果
    Note over LWP: 最終 eligibility = Lucky Wheel 遊戲規則檢查 + deposit rule
    LWP-->>LWF: Event 資料 + eligibility

    alt 玩家可以 Spin
        Note over LWF: 玩家在 frontend 點擊 Spin
        LWF->>LWP: 送出 spin request
        Note over LWP: 再次檢查遊戲資格與最新 deposit eligibility
        LWP->>MAP: 確認最新 deposit eligibility
        Note over MAP: 重用 SiteID + Account + RecordDate 對應方式
        MAP->>CP: SOAP LuckyWheel_Deposit_isEligible(...)
        CP-->>MAP: ServiceResult + IsEligible + DepositUrl
        MAP-->>LWP: 標準化 deposit eligibility 結果
        LWP-->>LWF: Spin 結果
    else 玩家不可 Spin
        LWP-->>LWF: 顯示不符合資格狀態或導向 deposit URL
    end

    Note over LWF,CP: initialEligibility 只是 Customer Platform 提供的 bootstrap 資料。Lucky Wheel 在啟動後仍會重新載入並重新驗證 eligibility。
    Note over LWF,CP: 遊戲資格由 Lucky Wheel 持有，並依自身執行時狀態判定。
    Note over LWF,CP: 與 deposit 相關的 eligibility 與 deposit URL 由 Customer Platform 經 Merchant API 提供。
    Note over LWF,CP: 只有 Merchant API 會直接與 Customer Platform SOAP/WCF 服務通訊。
    Note over LWF,CP: Customer Platform 只會判斷 RecordDate 的日期部分，並將時間正規化為 00:00:00。
```
