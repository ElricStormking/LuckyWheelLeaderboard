# Lucky Wheel Dataflow Diagram

This diagram follows the sample sequence style and reflects the current Lucky Wheel production contract.

Key differences from the sample:

- Lucky Wheel does not transfer player balance.
- There is no `LoginPlayer` callback or wallet-transfer branch.
- Player is not shown as a separate swimlane; player actions happen through Lucky Wheel Frontend.
- Player launch data enters from Customer Platform through Merchant API before the Lucky Wheel client opens.
- Customer Platform still sends `initialEligibility` as launch-time bootstrap data.
- Lucky Wheel Server owns live-event and daily-spin usage checks.
- Merchant API is used for launch orchestration and deposit-eligibility lookup only.
- Customer Platform only decides deposit-related eligibility and deposit URL.

```mermaid
sequenceDiagram
    autonumber
    participant LWF as Lucky Wheel Frontend
    participant LWS as Lucky Wheel Server
    participant MAP as Merchant API
    participant CP as Customer Platform

    Note over LWF,LWS: Lucky Wheel Side
    Note over MAP,CP: Merchant Side

    CP->>MAP: Launch Lucky Wheel for player + initialEligibility
    MAP->>LWS: POST /api/v2/player/session/launch\nX-Merchant-Id + X-Timestamp + X-Nonce + X-Signature
    LWS-->>MAP: launchUrl + player accessToken + refreshToken
    MAP-->>CP: launchUrl + player session data
    CP->>LWF: Open Lucky Wheel page + customer initialEligibility

    LWF->>LWS: GET /events/current\nAuthorization: Bearer player_access_token
    LWS-->>LWF: current event + player bootstrap

    LWF->>LWS: GET /events/{eventId}/eligibility
    Note over LWS: Resolve live event + today's used spins locally
    LWS->>MAP: GET /merchant-api/v1/lucky-wheel/players/{playerId}/events/{eventId}/eligibility
    MAP->>CP: Resolve deposit eligibility + deposit URL
    CP-->>MAP: depositQualified + depositUrl + reasonCode
    MAP-->>LWS: deposit eligibility decision
    LWS-->>LWF: normalized eligibility response

    alt Player can spin
        Note over LWF: Player taps Spin in frontend
        LWF->>LWS: POST /spins\nAuthorization + Idempotency-Key
        Note over LWS: Re-check live event + daily spin usage locally
        LWS->>MAP: Confirm latest deposit eligibility
        MAP->>CP: Resolve deposit eligibility + deposit URL
        CP-->>MAP: deposit eligibility decision
        MAP-->>LWS: deposit eligibility decision
        LWS-->>LWF: spin result + updated totals
        LWS-->>LWF: SSE leaderboard/player updates
    else Player cannot spin
        LWS-->>LWF: ALREADY_SPIN or GO_TO_DEPOSIT
    end

    Note over LWF,CP: initialEligibility is customer-platform bootstrap data only. Lucky Wheel still reloads and re-validates eligibility after launch.
    Note over LWF,CP: No player balance transfer exists in Lucky Wheel.
```
