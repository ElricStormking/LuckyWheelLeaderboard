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
    LWP->>MAP: Get deposit eligibility
    MAP->>CP: Resolve deposit eligibility + deposit URL
    CP-->>MAP: Deposit eligibility result
    MAP-->>LWP: Deposit eligibility result
    Note over LWP: Final eligibility = Lucky Wheel gameplay checks + deposit rule
    LWP-->>LWF: Event data + eligibility

    alt Player can spin
        Note over LWF: Player taps Spin in frontend
        LWF->>LWP: Submit spin request
        Note over LWP: Re-check gameplay eligibility + latest deposit eligibility
        LWP->>MAP: Confirm latest deposit eligibility
        MAP->>CP: Confirm latest deposit eligibility + deposit URL
        CP-->>MAP: Deposit eligibility result
        MAP-->>LWP: Deposit eligibility result
        LWP-->>LWF: Spin result
    else Player cannot spin
        LWP-->>LWF: Show not eligible state or deposit redirect
    end

    Note over LWF,CP: initialEligibility is customer-platform bootstrap data only. Lucky Wheel still reloads and re-validates eligibility after launch.
    Note over LWF,CP: Gameplay eligibility is owned by Lucky Wheel and evaluated from its own runtime state.
    Note over LWF,CP: Deposit-related eligibility and deposit URL are provided by Customer Platform through Merchant API.
```
