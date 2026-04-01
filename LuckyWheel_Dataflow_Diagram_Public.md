# Lucky Wheel Public API Integration Diagram

This diagram is a public-facing integration view for customer platform teams.

What is intentionally hidden:

- token fields and internal headers not needed for this public flow
- internal Lucky Wheel server endpoints
- internal realtime and leaderboard update details
- player is not shown as a separate swimlane; player actions happen through Lucky Wheel Frontend

```mermaid
sequenceDiagram
    autonumber
    participant LWF as Lucky Wheel Frontend
    participant LWP as Lucky Wheel Platform
    participant MAP as Merchant API
    participant CP as Customer Platform

    Note over LWF,LWP: Lucky Wheel Side
    Note over MAP,CP: Customer Platform Side

    CP->>MAP: Call Launch Game API + X-Integration-Guid + playerId + initialEligibility + timestamp
    Note over MAP: Resolve single merchant from server config
    MAP->>LWP: Create player session
    LWP-->>MAP: Game URL
    MAP-->>CP: Game URL
    CP->>LWF: Open Lucky Wheel + customer initialEligibility

    LWF->>LWP: Load latest game state
    Note over LWP: Resolve current live event + event-day date
    LWP->>MAP: Get deposit eligibility for player + event
    Note over MAP: Resolve SiteID from environment or merchant config
    Note over MAP: Map playerId -> Account and event-day -> RecordDate
    MAP->>CP: SOAP LuckyWheel_Deposit_isEligible(CompAccesskey, SiteID, Account, RecordDate)
    CP-->>MAP: ServiceResult + IsEligible + DepositUrl
    Note over MAP: Status=false is upstream failure, not business denial
    MAP-->>LWP: Normalized deposit eligibility result
    Note over LWP: Final eligibility = Lucky Wheel gameplay checks + deposit rule
    LWP-->>LWF: Event data + eligibility

    alt Player can spin
        Note over LWF: Player taps Spin in frontend
        LWF->>LWP: Submit spin request
        Note over LWP: Re-check gameplay eligibility + latest deposit eligibility
        LWP->>MAP: Confirm latest deposit eligibility
        Note over MAP: Reuse SiteID + Account + RecordDate mapping
        MAP->>CP: SOAP LuckyWheel_Deposit_isEligible(...)
        CP-->>MAP: ServiceResult + IsEligible + DepositUrl
        MAP-->>LWP: Normalized deposit eligibility result
        LWP-->>LWF: Spin result
    else Player cannot spin
        LWP-->>LWF: Show not eligible state or deposit redirect
    end

    Note over LWF,CP: initialEligibility is customer-platform bootstrap data only. Lucky Wheel still reloads and re-validates eligibility after launch.
    Note over LWF,CP: Gameplay eligibility is owned by Lucky Wheel and evaluated from its own runtime state.
    Note over LWF,CP: Deposit-related eligibility and deposit URL are provided by Customer Platform through Merchant API.
    Note over LWF,CP: Merchant API is the only component that talks to Customer Platform SOAP/WCF service.
    Note over LWF,CP: Customer Platform evaluates the date portion of RecordDate and normalizes time to 00:00:00.
```
