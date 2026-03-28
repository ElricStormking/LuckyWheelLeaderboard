# Lucky Wheel 公開整合 API 文件

**Version:** 1.7  
**Last Updated:** March 27, 2026

---

## 目錄

1. [概述](#概述)
2. [Customer Platform 上線準備](#customer-platform-上線準備)
3. [Base URL](#base-url)
4. [驗證方式](#驗證方式)
5. [共用回應格式](#共用回應格式)
6. [錯誤碼](#錯誤碼)
7. [公開 API 端點](#公開-api-端點)
   - [啟動遊戲](#1-啟動遊戲)
8. [啟動流程](#啟動流程)
9. [資料型別](#資料型別)

---

## 概述

本文件說明 Lucky Wheel 遊戲面向 Customer Platform 的公開 API 整合契約。

此公開整合目前支援：

- 為玩家啟動 Lucky Wheel
- 回傳 Lucky Wheel 遊戲網址

所有公開整合端點皆使用 **HTTP POST**，並以 **JSON** 作為資料交換格式。

---

## Customer Platform 上線準備

### Customer Platform 需提供的資訊

- 公開整合請求來源 IP allowlist
- 目標在地化 rollout 需求
- merchant 營運聯絡窗口
- production 與 sandbox 呼叫環境資訊

### Lucky Wheel Provider 會提供的資訊

- 共用的 `X-Integration-Guid` 憑證
- production 與 sandbox Merchant API base URL
- 允許的請求 `timestamp` 容忍時間

---

## Base URL

| Environment | Base URL |
|------------|----------|
| Production | `https://merchant-api.luckywheel.example.com/merchant-api` |
| Sandbox | `https://sandbox-merchant-api.luckywheel.example.com/merchant-api` |

所有公開整合端點皆以 `/integration/` 為前綴。

---

## 驗證方式

每一個公開 Lucky Wheel API 請求都必須包含：

1. header `X-Integration-Guid`
2. body 欄位 `timestamp`
3. 已加入 merchant allowlist 的呼叫端 IP

`X-Integration-Guid` 是上線時配發的共用 Customer Platform 憑證。`timestamp` 僅用於 freshness validation。

### Timestamp 規則

- `timestamp` 使用 Unix time 秒數
- 請求應在建立後立即送出
- 未來時間的 timestamp 會被拒絕
- 超出允許時間窗的請求會回傳錯誤 `1002`

若上線時未另行約定，請以 **300 秒** 作為容忍目標。

---

## 共用回應格式

所有公開 Lucky Wheel API 回應皆使用下列結構：

```json
{
  "success": true,
  "errorCode": 0,
  "errorMessage": "",
  "data": {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | 成功時為 `true`，失敗時為 `false` |
| `errorCode` | integer | 成功時為 `0`，否則為業務錯誤碼 |
| `errorMessage` | string | 成功時為空字串，失敗時為錯誤訊息 |
| `data` | object/null | 成功時的回應資料，失敗時為 `null` |

公開整合端點在成功與業務錯誤情境下都會回傳 HTTP `200`。請務必檢查 `success` 與 `errorCode`。

---

## 錯誤碼

| Code | Name | Description |
|------|------|-------------|
| `0` | SUCCESS | 請求成功完成 |
| `1001` | INVALID_INTEGRATION_GUID | Integration GUID 缺失或無效 |
| `1002` | TIMESTAMP_EXPIRED | Timestamp 無效或超出允許時間窗 |
| `1004` | MERCHANT_INACTIVE | Merchant 已停用 |
| `1005` | IP_NOT_ALLOWED | 呼叫端 IP 不在 allowlist 中 |
| `4000` | INVALID_REQUEST | 必填請求欄位缺失或格式無效 |
| `7001` | PLATFORM_LAUNCH_FAILED | Lucky Wheel 平台啟動失敗 |
| `9999` | INTERNAL_ERROR | 內部伺服器錯誤 |

---

## 公開 API 端點

### 1. 啟動遊戲

為玩家啟動 Lucky Wheel，並回傳遊戲網址。

**Endpoint:** `POST /integration/launch`

#### Request

必要 header：

| Header | Required | Description |
|--------|----------|-------------|
| `X-Integration-Guid` | Yes | 上線時配發的共用 GUID 憑證 |

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `playerId` | string | Yes | Customer Platform 的玩家識別碼 |
| `initialEligibility` | object | Yes | 僅供啟動階段 UX 使用的 Customer Platform bootstrap eligibility snapshot |
| `timestamp` | integer | Yes | 用於 freshness validation 的 Unix timestamp 秒數 |

Lucky Wheel 也不需要 Customer Platform 額外提供玩家顯示名稱。此整合流程會直接以 `playerId` 作為玩家標示。

#### 驗證說明

`initialEligibility` 不屬於驗證的一部分。它只是 Customer Platform 提供的 bootstrap 資料。

#### Header 範例

```text
X-Integration-Guid: 11111111-1111-1111-1111-111111111111
```

#### Request 範例

```json
{
  "playerId": "merchant-player-789",
  "initialEligibility": {
    "depositQualified": true
  },
  "timestamp": 1761216000
}
```

#### Response

```json
{
  "success": true,
  "errorCode": 0,
  "errorMessage": "",
  "data": {
    "url": "https://merchant-api.luckywheel.example.com/?playerId=merchant-player-789&sessionId=lw_sess_8f6c4d8f",
    "sessionId": "lw_sess_8f6c4d8f",
    "expiresAt": "2026-03-23T10:15:00.000Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Lucky Wheel 啟動網址 |
| `sessionId` | string | 產生出的 Lucky Wheel session ID |
| `expiresAt` | string | 啟動 session 的 ISO 8601 到期時間 |

### Eligibility 行為

Lucky Wheel 在啟動時接受 Customer Platform 提供的 `initialEligibility`，但它只作為 bootstrap 資料使用。

- `initialEligibility` 不是遊戲資格的最終依據，也不是由 Lucky Wheel 產生
- Lucky Wheel frontend 在遊戲開啟後，會再向 Lucky Wheel Platform 載入 eligibility
- Lucky Wheel Platform 會依自己的遊戲狀態與玩家已使用 spins 計算每日 spin eligibility
- Lucky Wheel Platform 也會呼叫 Merchant API，由後者取得 Customer Platform 的 deposit eligibility 與 deposit URL
- 如果 Customer Platform 判定玩家尚未滿足 deposit rule，Lucky Wheel 會回傳 `GO_TO_DEPOSIT` 狀態以及 Customer Platform 的 deposit URL
- Lucky Wheel 在實際處理 spin 前，會再次檢查每日 spin 使用量與最新 deposit eligibility

---

## 啟動流程

公開整合流程如下圖所示。

![Lucky Wheel Public API Integration Diagram](LuckyWheel_Dataflow_Diagram_Public_zh-TW.png)

### 公開流程摘要

1. Customer Platform 以 `playerId`、`initialEligibility`、`timestamp` 與必要的 `X-Integration-Guid` header 呼叫 `POST /integration/launch`
2. Merchant API 建立 Lucky Wheel session
3. Merchant API 回傳 Lucky Wheel 遊戲網址
4. Customer Platform 開啟 Lucky Wheel frontend，並可將自己的 `initialEligibility` 當作啟動時的 bootstrap 資料使用
5. Lucky Wheel frontend 向 Lucky Wheel Platform 載入最新遊戲狀態
6. Lucky Wheel Platform 在允許 spin 前，會將自己的遊戲規則檢查與來自 Merchant API 的 Customer Platform deposit eligibility 一起判定

---

## 資料型別

### Initial Eligibility Bootstrap

Customer Platform 在啟動時送出的 `initialEligibility` 是一個 bootstrap 物件。目前建議結構如下：

| Field | Type | Description |
|-------|------|-------------|
| `depositQualified` | boolean | Customer Platform 在啟動當下最新的 deposit-rule 判定結果 |

不需要額外的 bootstrap 欄位。`initialEligibility` 不屬於啟動驗證的一部分，也不是 Lucky Wheel 遊戲判定的最終依據。
