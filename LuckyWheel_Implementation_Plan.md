# Lucky Wheel Implementation Plan V2

This is the full post-merge consolidated V2 implementation plan for a client-server online casino **Lucky Wheel** game with timed ranking events, Top 30 leaderboard, backend admin management, multilingual content, history viewing, platform links, merchant-API-driven spin eligibility and spin quota with Customer Platform as the upstream source, revised backend admin/event configuration requirements, and a mobile-first WebGL client specification.

---

## 1. Product Overview

Build a Lucky Wheel game with these core features:

* timed event periods
* Top 30 player ranking for each event
* fixed 6-segment wheel
* backend-configured segment probabilities and score logic
* prize list display
* event rules/description display
* player points/score history
* period selection for current and ended events
* 3-language support:

  * English
  * Malay
  * Simplified Chinese
* deposit button and customer service link
* backend admin tool for event and content management
* merchant API integration for spin eligibility and allowed spin count
* **mobile-first WebGL client with fixed 1080 × 1920 portrait viewport**
* **desktop browser view uses the same centered 1080 × 1920 portrait frame with blank side areas**

---

### 1.1 Runtime architecture

The production architecture must be split into 4 runtime parts plus a shared contracts package:

* **client**

  * Phaser/WebGL player game
  * consumes Lucky Wheel server only
* **server**

  * authoritative Lucky Wheel backend
  * owns event data, spin transactions, scoring, leaderboard, history, and admin APIs
  * consumes Merchant API for quota and deposit-gating inputs
* **merchant API**

  * separate service boundary owned by merchant/platform side
  * returns player spin quota and deposit gating to Lucky Wheel server
  * may itself be backed by Customer Platform entitlement data
* **admin tool**

  * separate operator-facing frontend
  * consumes Lucky Wheel server admin endpoints
* **shared contracts**

  * typed DTOs and enums reused across client, server, merchant API, and admin tool

---

## 2. Business Scope

### 2.1 Event model

Each Lucky Wheel event is a timed promotion with:

* start time
* end time
* event rules
* wheel configuration
* score accumulation
* Top 30 ranking
* prize distribution
* style/theme reservation field

Each event may have different:

* wheel content
* score logic
* prizes
* rules
* display name
* style setting

### 2.2 Period selection

Players must be able to:

* see the **currently active event by default**
* select and view **previously ended events**

For ended events, players can still view:

* final ranking
* prize list
* rules
* their own event score/history

But ended events are not playable.

### 2.3 Wheel format

The wheel is always:

* fixed to **exactly 6 segments**
* each segment has:

  * label
  * score operator
  * score operand/value
  * probability/weight
  * optional reward metadata
  * display asset

Supported operators:

* add
* subtract
* multiply
* divide
* equals

Special note:

* `equals 0` is typically used to reset score to zero

Segment probabilities are configured in the admin tool.

### 2.4 Merchant-driven spin eligibility

Spin eligibility is determined by the **Merchant API**.

Merchant API returns the player's **spin quota for the event** and related eligibility information, with Customer Platform remaining the upstream business source of truth.

Lucky Wheel must treat the Merchant API response as the integration contract for:

* whether the player may spin now
* how many total spins are granted for the event
* whether deposit is required before spinning

That Merchant API response is expected to be sourced from Customer Platform entitlement data.

The Lucky Wheel system must normalize eligibility into exactly these 4 business outcomes:

1. **Playable Now**
2. **Already Spin in This Event**
3. **Go to Deposit**
4. **Event Ended**

### 2.5 Event time range and status rule

Each event must have:

* time range
* status

Rule:

* **status takes precedence over time**
* the system must prevent overlapping Lucky Wheel events
* only one non-cancelled Lucky Wheel event may exist in the same time range
* only one event may be live at a time unless future versions explicitly support parallel events

---

## 3. Required User Features

### 3.1 Period Selection

Default behavior:

* current active event is selected

User can:

* browse ended events
* open ended event details
* view final leaderboard/prizes/rules/history

### 3.2 Lucky Wheel

* exactly 6 segments
* backend-configured probabilities
* backend-configured operator + operand/value scoring
* server-authoritative result resolution

### 3.3 Prize List

Displays prize items configured in backend admin tool.

### 3.4 Event Rules Description

Displays rules/description configured in backend admin tool.

Supports:

* plain text
* HTML/rich text, if product requires formatted rules

### 3.5 History

Shows member’s Lucky Wheel points history.

Recommended to support both:

* **Spin History**

  * per spin result
  * score gained
  * segment hit
  * running event total
  * timestamp

* **Event History**

  * one record per event
  * total score
  * final rank
  * prize result if applicable

### 3.6 Language Selection

Supports:

* English (`en`)
* Malay (`ms`)
* Simplified Chinese (`zh-CN`)

The platform passes language to the game on launch, and the game defaults to that language.

### 3.7 Other Menu

Contains:

* Go to Deposit
* Customer Service

Both URLs are configurable.

---

## 4. Core Design Principles

### 4.1 Server-authoritative gameplay

The client must never decide:

* spin result
* score gain
* ranking change
* prize entitlement

The server decides all gameplay outcomes.

### 4.2 PostgreSQL as source of truth

Store authoritative records in PostgreSQL:

* players
* events
* wheel configs
* spins
* player scores
* leaderboards
* prizes
* admin changes
* event history

### 4.3 Version all critical configs

Version everything affecting fairness:

* wheel config
* score rules
* prize configuration
* localized event content

Each spin should reference the exact versions used.

### 4.4 Merchant API integration with Customer Platform as upstream source

Customer Platform decides:

* whether player can spin now
* how many spins the player is allowed in this event
* whether deposit is required

Merchant API exposes to Lucky Wheel:

* granted spin count
* deposit gating and reason codes
* normalized player spin eligibility data

Lucky Wheel backend decides:

* event status
* wheel outcome
* score
* ranking
* history
* prizes

Lucky Wheel backend must track how many spins were already consumed in the selected event and compare that against the Merchant API's granted spin quota.

Override rule:

* if the event is ended/finalized/cancelled, final client state must be `EVENT_ENDED` even if Merchant API says player is eligible

---

## 5. High-Level Architecture

### 5.1 Client

Use **Phaser 3** for the game client.

Suggested scenes/modules:

* BootScene
* PreloadScene
* LobbyScene
* WheelScene
* LeaderboardOverlayScene
* EventDetailScene
* HistoryScene
* MenuOverlayScene
* ResultPopupScene
* Reconnect/ErrorOverlay

### 5.2 Backend

Recommended TypeScript backend, for example NestJS or Express/Fastify.

Suggested backend modules:

* Auth
* Player
* Event
* Wheel
* Spin
* Score
* Leaderboard
* History
* Localization
* Platform Config
* Merchant Eligibility Integration
* Admin
* Audit
* Realtime Gateway
* Scheduler Worker
* Settlement Worker

### 5.3 Database

* PostgreSQL
* Prisma ORM for most CRUD and transactional operations

### 5.4 Realtime

Use WebSocket or Socket.IO for:

* Top 30 leaderboard updates
* event status changes
* player score updates
* player rank changes

### 5.5 Optional performance layer

Optional Redis for:

* leaderboard cache
* pub/sub
* hot event state cache

---

## 6. Functional Flows

### 6.1 Player entry flow

1. Platform launches game with:

   * player session/token
   * locale
   * optional return/platform parameters
2. Client loads current active event by default
3. Client requests:

   * event details
   * leaderboard
   * prize list
   * rules
   * player summary
   * platform links
   * eligibility state

### 6.2 Period selection flow

1. Player opens period selector
2. Client loads active and ended events
3. Default selected event = current active event
4. When ended event is selected:

   * final leaderboard is shown
   * prize list is shown
   * rules are shown
   * player event history is shown
   * wheel is greyed out
   * spin is disabled

### 6.3 Eligibility check flow

This check must occur:

* on initial event page load
* when player changes period
* before processing a spin
* after spin completion
* on reconnect/refresh

Flow:

1. Client requests event eligibility
2. Backend checks event lifecycle status
3. If event is not live, return `EVENT_ENDED`
4. If event is live, backend calls Merchant API
5. Merchant API returns the granted spin quota and any deposit gating requirement, sourced from Customer Platform
6. Backend compares local used spin count against granted spin quota
7. Backend normalizes the result into one of the 4 supported eligibility states
8. Client renders wheel/button state accordingly

### 6.4 Spin flow

1. Player presses spin
2. Client sends `POST /api/v2/spins`
3. Server validates:

   * authenticated player
   * event exists
   * event is live
   * idempotency key
   * merchant/platform eligibility = `PLAYABLE_NOW`
   * local used spin count is still below granted spin quota
4. Server resolves spin in one transaction
5. Server writes:

   * spin record
   * score delta
   * updated player event total
6. Server updates leaderboard
7. Client receives result and animates to returned segment
8. Realtime updates refresh rank/score

If eligibility is not playable:

* reject the spin
* return eligibility state
* do not create spin transaction record

### 6.5 Event lifecycle flow

Event states:

* `draft`
* `scheduled`
* `live`
* `ended`
* `finalized`
* `cancelled`

Transitions:

* `draft -> scheduled`
* `scheduled -> live`
* `live -> ended`
* `ended -> finalized`
* `scheduled/live -> cancelled`

### 6.6 History flow

History supports:

#### Spin history

* per-spin entries
* timestamp
* segment
* score gained
* running total
* event reference

#### Event history

* per-event summary
* total score
* final rank
* prize result
* finalized date

---

## 7. Top 30 Leaderboard Design

The Lucky Wheel event leaderboard is a **Top 30 ranking leaderboard** for the selected event period.

### 7.1 Leaderboard entry count

* The leaderboard displays **up to 30 ranked entries**.
* If there are fewer than 30 ranked players in the selected event, display only the number of entries currently available.
* The system should not require placeholder rows unless the UI design explicitly wants empty slots.

### 7.2 Player self-entry display rules

* The player’s own account name does **not** need to be masked.
* If the player is within the Top 30 leaderboard, their row must be:

  * clearly identified
  * visually highlighted
  * allowed to use a slightly larger display format than standard rows, based on UI design
* If the player is **not** within the Top 30 leaderboard:

  * the main leaderboard still displays only the Top 30 ranked players
  * the player’s own current rank, account name, and score should be shown separately in a dedicated **My Rank** area

### 7.3 Ranking data displayed per row

Each leaderboard row should display at minimum:

* ranking position
* player account name
* current event score
* corresponding prize name for that ranking position

Optional UI fields may also include:

* prize icon
* score delta indicator
* rank movement indicator

### 7.4 Prize name display logic

* The leaderboard must display the **prize name corresponding to each ranking position**.
* Prize names are resolved by matching the player’s rank against the configured event prize tiers.
* Example:

  * Rank 1 → Grand Prize
  * Rank 2–3 → Second Prize
  * Rank 4–10 → Bonus Prize
  * Rank 11–30 → Participation Prize
* Prize text must use the localized prize configuration for the active display language.

### 7.5 Real-time refresh behavior

The leaderboard supports two refresh behaviors:

#### A. Immediate post-draw refresh

* After a member completes a draw, the page should refresh immediately so the member can know their latest score and ranking right away.
* This immediate refresh should update:

  * the player’s own score
  * the player’s own rank
  * the Top 30 leaderboard view on that client
  * the My Rank area if the player is outside Top 30

#### B. 30-minute leaderboard synchronization

* In addition to immediate post-draw refresh, the system performs a broader leaderboard synchronization every **30 minutes**.
* This 30-minute update can be used as:

  * a global leaderboard refresh broadcast
  * a checkpoint snapshot
  * a consistency reconciliation update across clients and services

### 7.6 Live vs ended event behavior

#### Live event

* leaderboard updates in near real time
* immediate post-draw refresh is enabled
* 30-minute synchronization still applies

#### Ended/finalized event

* when an event first becomes `ended`, player-facing result views enter a temporary calculation state
* during that calculation window, final Top 30 ranking and My Rank are hidden from players
* players should see a waiting message such as `Event Result is be calculated, it will be shown after 30 minutes.`
* once the event becomes `finalized`, the leaderboard becomes read-only
* final Top 30 ranking is displayed
* prize names remain visible per rank
* player’s final rank should still be shown in **My Rank** if outside Top 30

### 7.7 API and response requirements

The leaderboard API should support:

* returning **up to 30 entries**
* returning fewer than 30 when fewer are available
* indicating whether the current player is inside Top 30
* returning separate **My Rank** data when the player is outside Top 30
* including resolved prize name for each leaderboard row

Recommended response shape:

```json
{
  "eventId": "evt_123",
  "leaderboard": [
    {
      "rank": 1,
      "playerName": "PlayerA",
      "score": 1280,
      "prizeName": "Grand Prize",
      "isSelf": false
    },
    {
      "rank": 12,
      "playerName": "ElricTang",
      "score": 640,
      "prizeName": "Bonus Prize",
      "isSelf": true
    }
  ],
  "myRank": {
    "rank": 42,
    "playerName": "ElricTang",
    "score": 210,
    "prizeName": null,
    "isTop30": false
  },
  "totalDisplayed": 17,
  "lastSyncedAt": "2026-03-12T10:30:00Z"
}
```

### 7.8 Acceptance criteria for leaderboard

* The leaderboard displays a maximum of 30 entries.
* If fewer than 30 players are ranked, only existing entries are displayed.
* The player’s own account name is not masked.
* If the player is in Top 30, their row is clearly highlighted.
* If the player is not in Top 30, their own rank/score is shown separately in a My Rank area.
* Each displayed row includes the prize name for that ranking position.
* The player’s ranking updates immediately after completing a draw.
* The system also performs a 30-minute leaderboard synchronization.
* Final leaderboard data becomes viewable for players after finalization.

---

## 8. Spin Eligibility Model

### 8.1 Normalized eligibility states

#### `PLAYABLE_NOW`

* player may spin now
* player still has remaining platform-granted spins in this event
* wheel is normal color
* button label: `SPIN NOW`
* button enabled

#### `ALREADY_SPIN`

* player already used all platform-granted spins in this event
* wheel is normal color
* button label: `ALREADY SPIN`
* button disabled

#### `GO_TO_DEPOSIT`

* player is not eligible due to insufficient token/deposit/platform rule
* wheel is normal color
* button label: `GO TO DEPOSIT`
* button enabled
* clicking opens deposit URL

#### `EVENT_ENDED`

* selected event is ended/finalized/cancelled
* wheel is greyed out
* button label: `ENDED`
* button disabled

### 8.2 Fallback rule

If Merchant API is unavailable:

* do not assume playable
* reject spin
* return temporary operational error
* log failure for operations review

This operational error is separate from the 4 business states.

---

## 9. Database Schema V2

### 9.1 Core tables

#### `player`

* id
* external_user_id
* display_name
* status
* created_at
* updated_at

#### `event_campaign`

* id
* code
* status
* start_at
* end_at
* timezone
* wheel_config_id
* score_rule_version_id
* leaderboard_size
* rules_content_type
* style_theme
* created_by
* created_at
* updated_at

#### `event_campaign_i18n`

* id
* event_campaign_id
* locale
* title
* short_description
* rules_content

Notes:

* `title` is the event name used in client period selection

#### `wheel_config`

* id
* name
* version
* status
* effective_from
* effective_to
* created_by
* created_at

#### `wheel_segment`

* id
* wheel_config_id
* segment_index
* score_operator
* score_operand
* reward_type
* reward_value
* score_value
* weight_percent
* visual_asset_key
* enabled

Notes:

* `score_operator` supports: add, subtract, multiply, divide, equals
* `score_operand` stores the operator input value
* `score_value` may be kept temporarily for backward compatibility if needed

#### `wheel_segment_i18n`

* id
* wheel_segment_id
* locale
* label

#### `score_rule_version`

* id
* name
* version
* formula_json
* tie_breaker_rule
* published_at

#### `event_prize`

* id
* event_campaign_id
* rank_from
* rank_to
* prize_type
* prize_value
* display_order
* image_url
* enabled
* created_at

#### `event_prize_i18n`

* id
* event_prize_id
* locale
* prize_label
* prize_description
* image_url

Notes:

* localized image is optional and only needed if assets differ by market/language

#### `spin_transaction`

* id
* player_id
* event_campaign_id
* wheel_config_id
* score_rule_version_id
* idempotency_key
* segment_index
* reward_type
* reward_value
* score_delta
* running_event_total
* created_at

#### `player_event_score`

* id
* event_campaign_id
* player_id
* total_score
* best_rank_snapshot
* first_reach_score_at
* last_spin_at
* updated_at

Unique key:

* `(event_campaign_id, player_id)`

#### `player_event_summary`

* id
* event_campaign_id
* player_id
* final_score
* final_rank
* prize_status
* prize_value
* finalized_at

#### `leaderboard_snapshot`

* id
* event_campaign_id
* snapshot_type
* taken_at
* data_json

#### `platform_link_config`

* id
* link_type (`deposit`, `customer_service`)
* url
* enabled
* open_mode
* updated_at

#### `platform_link_config_i18n`

* id
* platform_link_config_id
* locale
* label

#### `merchant_eligibility_log` (optional but recommended)

* id
* player_id
* event_campaign_id
* merchant_status_code
* normalized_status
* granted_spin_count
* used_spin_count_at_check
* remaining_spin_count_at_check
* deposit_url_returned
* checked_at
* request_trace_id

#### `spin_rejection_log` (optional but recommended)

* id
* player_id
* event_campaign_id
* rejection_reason
* created_at

#### `admin_user`

* id
* email
* role
* status

#### `admin_audit_log`

* id
* admin_user_id
* entity_type
* entity_id
* action
* before_json
* after_json
* created_at

#### `event_state_history`

* id
* event_campaign_id
* from_status
* to_status
* triggered_by
* reason
* created_at

---

## 10. Data Constraints

* each event must have a valid time range where `start_at < end_at`
* no overlapping time ranges for non-cancelled Lucky Wheel events
* event status takes precedence over time-derived interpretation
* each published wheel config must have **exactly 6 enabled segments**
* enabled segment weights must total **100%**
* each segment must define one score operator and one operand/value
* only one live Lucky Wheel event at a time unless intentionally expanded later
* ended and finalized events remain queryable
* localized rows for `en`, `ms`, `zh-CN` should exist before publish
* V2 `style_theme` must be limited to `default`

Recommended enforcement points for overlap validation:

* admin create
* admin edit
* admin publish

---

## 11. API Design

### 11.1 Player APIs

#### Event and period APIs

The following read APIs should accept `locale=en|ms|zh-CN`:

* `GET /api/v2/events/current`
* `GET /api/v2/events?status=live,ended,finalized&page=1`
* `GET /api/v2/events/:eventId`
* `GET /api/v2/events/:eventId/leaderboard?limit=30`
* `GET /api/v2/events/:eventId/prizes`
* `GET /api/v2/events/:eventId/me`

`GET /api/v2/events/current` and `GET /api/v2/events/:eventId/me` should return a player summary that includes:

* `totalScore`
* `rank`
* `prizeName`
* `grantedSpinCount`
* `usedSpinCount`
* `remainingSpinCount`
* `spinAllowanceSource`

#### Eligibility API

* `GET /api/v2/events/:eventId/eligibility`

Response fields:

* `eventId`
* `eventStatus`
* `eligibilityStatus`
* `grantedSpinCount`
* `usedSpinCount`
* `remainingSpinCount`
* `spinAllowanceSource`
* `buttonLabel`
* `wheelVisualState`
* `depositUrl`
* `messageKey`
* `merchantReasonCode`

Example:

```json
{
  "eventId": "evt_123",
  "eventStatus": "live",
  "eligibilityStatus": "GO_TO_DEPOSIT",
  "grantedSpinCount": 3,
  "usedSpinCount": 1,
  "remainingSpinCount": 2,
  "spinAllowanceSource": "merchant_api",
  "buttonLabel": "GO TO DEPOSIT",
  "wheelVisualState": "normal",
  "depositUrl": "https://merchant.example.com/deposit"
}
```

#### Spin API

* `POST /api/v2/spins`

Request body:

```json
{
  "eventId": "evt_123",
  "idempotencyKey": "unique-key-001"
}
```

Failure examples:

```json
{
  "success": false,
  "eligibilityStatus": "ALREADY_SPIN"
}
```

```json
{
  "success": false,
  "eligibilityStatus": "GO_TO_DEPOSIT",
  "depositUrl": "https://merchant.example.com/deposit"
}
```

```json
{
  "success": false,
  "eligibilityStatus": "EVENT_ENDED"
}
```

Success example:

```json
{
  "success": true,
  "segmentIndex": 3,
  "scoreDelta": 50,
  "runningEventTotal": 250,
  "rewardType": "score",
  "rewardValue": 50,
  "rank": 12,
  "leaderboardChanged": true
}
```

#### History APIs

* `GET /api/v2/me/lucky-wheel/history/spins?eventId=&page=`
* `GET /api/v2/me/lucky-wheel/history/events?page=`
* `GET /api/v2/events/:eventId/me/history?page=`

#### Config/menu APIs

* `GET /api/v2/config/localization`
* `GET /api/v2/config/platform-links`
* `GET /api/v2/config/wheel-display/current?eventId=`

`GET /api/v2/config/localization` should return:

* `requestedLocale`
* `resolvedLocale`
* `supportedLocales[]`

### 11.2 Realtime channels

* `event:statusChanged`
* `event:countdownSync`
* `leaderboard:top30`
* `player:scoreChanged`
* `player:rankChanged`

Realtime subscriptions should also accept `locale=en|ms|zh-CN` so localized leaderboard/prize text can be streamed consistently.

`player:scoreChanged` should also carry the latest player allowance snapshot:

* `grantedSpinCount`
* `usedSpinCount`
* `remainingSpinCount`
* `spinAllowanceSource`

### 11.3 Admin APIs

#### Event admin

* `POST /api/v2/admin/events`
* `PATCH /api/v2/admin/events/:id`
* `GET /api/v2/admin/events/:id/editor`
* `POST /api/v2/admin/events/:id/publish`
* `POST /api/v2/admin/events/:id/cancel`
* `POST /api/v2/admin/events/:id/finalize`
* `GET /api/v2/admin/events/:id/audit`

Recommended implementation note:

* event metadata, wheel segments, prizes, localized terms, and platform links can be edited through one consolidated event editor response and saved through the event `PATCH` endpoint

#### Wheel config admin

* `POST /api/v2/admin/wheel-configs`
* `PATCH /api/v2/admin/wheel-configs/:id`
* `POST /api/v2/admin/wheel-configs/:id/publish`
* `POST /api/v2/admin/wheel-configs/:id/validate`

#### Prize admin

* `POST /api/v2/admin/events/:id/prizes`
* `PATCH /api/v2/admin/prizes/:id`

#### Localization admin

* `PATCH /api/v2/admin/events/:id/i18n/:locale`
* `PATCH /api/v2/admin/prizes/:id/i18n/:locale`
* `PATCH /api/v2/admin/wheel-segments/:id/i18n/:locale`
* `PATCH /api/v2/admin/platform-links/:id/i18n/:locale`

#### Platform links admin

* `GET /api/v2/admin/platform-links`
* `PATCH /api/v2/admin/platform-links/:id`

#### Event dashboard admin

* `GET /api/v2/admin/events/:id/dashboard`
* `GET /api/v2/admin/events/:id/eligibility?page=`
* `GET /api/v2/admin/events/:id/participants?page=`
* `GET /api/v2/admin/events/:id/spins?page=`
* `GET /api/v2/admin/events/:id/audit?page=`

Suggested dashboard response includes:

* event id
* event name
* event status
* event time range
* participant count
* spin count
* total awarded score
* leaderboard preview
* last updated time
* eligibility summary counts by normalized state
* latest audit preview

---

## 12. Merchant API Integration Module

The Merchant API must exist as a separate runtime service. Inside Lucky Wheel server, add a dedicated integration client:

### `MerchantApiClientService`

Responsibilities:

* call the standalone Merchant API service over HTTP
* read granted spin count, deposit gating, and platform reason codes
* compare local used spin count against granted spin count
* map raw Merchant API response into Lucky Wheel eligibility states
* rely on Customer Platform as the upstream business source of the returned entitlement data
* return one of:

  * `PLAYABLE_NOW`
  * `ALREADY_SPIN`
  * `GO_TO_DEPOSIT`
  * `EVENT_ENDED`
* log safely
* handle retry/timeout policy

The separate Merchant API service itself should expose an eligibility endpoint for Lucky Wheel server and remain deployable independently from the game server.
* expose monitoring metrics

---

## 13. Client Scope

The Lucky Wheel client is a **WebGL game** designed primarily for **mobile portrait play**.

### 13.1 Client platform and display specification

#### Rendering mode

* the game runs as a **WebGL client**

#### Target game view

* target resolution: **1080 × 1920**
* orientation: **vertical / portrait**
* layout mode: **mobile-first fixed portrait stage**

#### Mobile behavior

* the main gameplay view is designed around a **1080 × 1920 portrait layout**
* UI, wheel, leaderboard overlays, buttons, and menus must be positioned and scaled for mobile-first portrait interaction
* touch interaction is the primary input mode

#### PC web browser behavior

* when opened in a desktop browser, the game must still display as an **exact 1080 × 1920 vertical view**
* the game view must be centered horizontally on the page
* the left and right sides of the browser remain blank / unused
* desktop view must not expand gameplay horizontally to fill the full browser width
* desktop input may support mouse, but the visible play area remains the same portrait mobile layout

#### Layout rule

* the game must use a **fixed portrait stage design**
* gameplay composition must assume a single portrait-safe frame
* background or wrapper outside the 1080 × 1920 game area may remain blank or use a neutral filler background, but no gameplay elements may be placed there

#### Implementation note

For Phaser client setup, the game should:

* initialize in portrait orientation
* keep a fixed aspect ratio based on **1080:1920**
* center the canvas in desktop browsers
* prevent gameplay UI from stretching into wide-screen layouts

### 13.2 Lobby/Event Home

Shows:

* event title
* countdown
* current score
* Top 30 preview
* period selector
* prize button
* rules button
* menu button
* current eligibility state

### 13.3 Period Selection Panel

Shows:

* live event first
* ended events below
* selected period details

### 13.4 Wheel Screen

Shows:

* fixed 6-segment wheel
* localized segment labels
* center button state:

  * `SPIN NOW`
  * `ALREADY SPIN`
  * `GO TO DEPOSIT`
  * `ENDED`
* grey wheel state when event ended

### 13.5 Prize List Panel

Shows:

* prize tiers
* rank ranges
* localized prize text
* prize image where configured

### 13.6 Rules Panel

Shows:

* backend-configured rules content
* plain text or safe HTML

### 13.7 History Page

Tabs:

* Spin History
* Event History

### 13.8 Other Menu

Contains:

* Language Selection
* Go to Deposit
* Customer Service

---

## 14. Localization Scope

Supported locales:

* `en`
* `ms`
* `zh-CN`

Localized content should include:

* event title
* event rules
* prize labels/descriptions
* wheel segment labels
* platform link labels
* optional button/status text if configured

The game should default to the platform-passed language at launch.

---

## 15. Backend Admin Tool Scope

The backend admin tool manages Lucky Wheel event creation, configuration, publishing, monitoring, and historical review.

### 15.1 Event creation and uniqueness rules

The admin tool must allow operators to create Lucky Wheel periods/events. Each event may have its own:

* event name
* time range
* wheel settings
* prize settings
* terms and rules
* style setting
* status

Each event must contain:

* `start_at`
* `end_at`
* `status`

Rules:

* event status takes precedence over time-based interpretation
* the system must prevent overlapping Lucky Wheel event periods
* only one non-cancelled Lucky Wheel event may exist within the same time range
* overlap validation must run on create, edit, and publish
* only one event may be active/live at a time unless future versions explicitly support parallel events

### 15.2 Event name

Event Name is a required multi-language field.

Purpose:

* displayed in the game client for period/event selection
* displayed in event detail views
* used in admin event list/search

### 15.3 Event time and status

Each event must support:

* start time
* end time
* status

Supported statuses:

* `draft`
* `scheduled`
* `live`
* `ended`
* `finalized`
* `cancelled`

Rules:

* status takes precedence over time
* publishing must fail if the event overlaps with another non-cancelled event
* ended/finalized events remain viewable in admin and client history

### 15.4 Style settings

Reserve a style setting for future festival themes or visual effect packages.

Suggested field:

* `style_theme`

V2 supported value:

* `default`

Future examples:

* new year
* christmas
* halloween
* anniversary campaign

In V2, the admin can only select `default`, but the field must exist in schema and admin form for forward compatibility.

### 15.5 Wheel settings

The admin tool must allow configuration of all six wheel segments.

Each segment must support:

* segment position
* score operator
* score operand/value
* probability percentage
* localized display label
* optional asset key

Supported score operators:

* `add`
* `subtract`
* `multiply`
* `divide`
* `equals`

Examples:

* `add 100`
* `subtract 50`
* `multiply 2`
* `divide 2`
* `equals 0`

Special rule:

* `equals 0` is commonly used to reset score to zero

Validation rules:

* exactly 6 enabled segments
* total probability must equal 100%
* each segment must have one operator and one operand/value
* segment ordering must be fixed and deterministic

### 15.6 Prize settings

The admin tool must allow prize configuration per event.

Each prize item must support:

* multi-language prize name
* prize image
* display order / prize tier
* rank mapping

Prize order semantics:

* `1` = grand prize
* `2` = second prize
* `3`, `4`, `5` and beyond must also be supported as separate prize items if needed

Prize rank mapping must support:

* single-rank prizes
* rank range prizes

Examples:

* Rank 1 → Grand Prize
* Rank 2 → Second Prize
* Rank 3–5 → Third Prize tier
* Rank 6–10 → Bonus Prize tier

### 15.7 Terms and rules settings

The admin tool must allow multi-language editing of event terms and rules.

Requirements:

* displayed on the member side
* editable per supported language
* supports plain text or HTML/rich text
* previewable in admin

### 15.8 Localization management

The admin tool must support multi-language management for:

* event name
* event rules
* prize name
* wheel segment label
* platform link labels

Supported languages:

* English (`en`)
* Malay (`ms`)
* Simplified Chinese (`zh-CN`)

### 15.9 Platform links

The admin tool must allow configuration of:

* deposit URL
* customer service URL
* localized labels
* enable/disable flag

The deposit URL is also used by the `GO_TO_DEPOSIT` eligibility outcome.

### 15.10 Event status dashboard

The admin tool must provide a dashboard for the current event and historical events.

Minimum dashboard content:

* total number of participating players
* total spin count
* total accumulated points awarded
* per-player accumulated points
* per-player participation records
* current leaderboard preview
* event status and timing information

Recommended dashboard views:

* summary cards
* participant list
* spin record list
* leaderboard preview
* score distribution or simple statistics

### 15.11 Live operations

Admin should be able to:

* view live Top 30 leaderboard
* inspect player scores
* inspect player spin history
* inspect eligibility outcomes
* inspect event lifecycle status
* inspect scheduler logs
* access audit trail

Suggested operational metrics:

* Merchant API timeout count
* already spin count
* go to deposit count
* event ended access count
* total participants
* total spins
* total score awarded in current event

### 15.12 Roles

Suggested roles:

* Super Admin
* Operations Admin
* Content Admin
* Analyst / Read Only

---

## 16. Concurrency and Consistency Rules

### 16.1 Spin transaction

Each spin should execute in one DB transaction:

* validate event
* validate eligibility
* compare used spin count against granted spin quota
* resolve result
* create spin row
* update player score
* refresh leaderboard state

### 16.2 Idempotency

Every spin request must include `idempotencyKey`.

Retrying the same request must return the same result rather than creating another spin.

### 16.3 Event scheduler safety

Only one worker should perform each event-state transition.

### 16.4 Finalization

At event end:

* freeze scoring
* compute final Top 30
* store final snapshot
* populate player summaries
* preserve event for historical viewing
* auto-finalize after a configurable settlement grace period following `end_at`

---

## 17. Acceptance Criteria

V2 is complete when:

* current event loads by default
* ended events can be selected and viewed
* wheel always shows exactly 6 segments
* segment probabilities come from backend admin config
* wheel scoring supports operator + operand/value configuration per segment
* prize list displays backend-configured prizes
* prize images can be configured per event
* rules panel displays backend-configured rules
* history page shows player spin and event history
* game defaults to platform-passed language
* player can switch between `en`, `ms`, and `zh-CN` during the session
* deposit and customer service buttons open configured URLs
* Top 30 updates during live event
* ended event final rankings remain viewable
* spin eligibility and spin quota are checked through Merchant API
* eligibility API exposes granted, used, and remaining spins for the selected event
* event title, rules, prizes, wheel labels, and platform link labels localize from backend content
* selected event always resolves into one of 4 states:

  * Playable Now
  * Already Spin
  * Go to Deposit
  * Event Ended
* Go to Deposit opens deposit URL
* Event Ended renders wheel in grey state
* ended events remain viewable but not playable
* spin API re-checks eligibility before creating a spin record
* admin tool prevents overlapping non-cancelled event periods
* event status takes precedence over time
* admin dashboard shows participant count and point records
* the game runs as a WebGL client
* the primary layout is fixed to a 1080 × 1920 portrait viewport
* on mobile, the game displays in portrait format optimized for touch interaction
* on PC browser, the 1080 × 1920 portrait game view is centered on screen with blank space on both sides
* important admin changes are audited

---

## 18. Delivery Roadmap

### Phase 1

* database schema
* Prisma models
* auth/player bootstrap
* current event API
* base Phaser scenes

### Phase 2

* wheel config
* 6-segment validation
* operator-based segment scoring
* authoritative spin API
* Merchant API eligibility and spin-quota integration
* score accumulation
* live leaderboard

### Phase 3

* period selector
* ended event browsing
* prize list
* rules panel
* history APIs and UI

### Phase 4

* localization tables
* admin localization editing
* client language bootstrapping
* platform links
* 4 eligibility UI states
* style theme field support with `default`

### Phase 5

* scheduler hardening
* audit logs
* final ranking snapshots
* settlement workflow with configurable auto-finalize grace after `endAt`
* admin event dashboard
* performance tuning
* eligibility monitoring dashboards

---

## 19. Final Recommendation

The recommended production design for V2 is:

* **Phaser 3** client
* **TypeScript backend**
* **PostgreSQL + Prisma**
* **server-authoritative spin engine**
* **merchant-platform eligibility integration**
* **Top 30 leaderboard service**
* **timed event scheduler**
* **localized content model**
* **admin-managed deposit/customer-service links**
* **historical ended-event browsing**
* **admin-controlled event uniqueness, wheel operator logic, and live dashboarding**

This consolidated V2 plan includes the original event, leaderboard, admin, multilingual, and history requirements together with the Merchant-API-driven spin eligibility and spin quota model, with Customer Platform as the upstream source of player spin entitlement data, revised leaderboard behavior, expanded backend admin tool scope, and the updated fixed portrait WebGL client specification.
