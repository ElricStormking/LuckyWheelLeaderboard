# Lucky Wheel Public API Integration Diagram

This diagram is a public-facing integration view for customer platform teams.

What is intentionally hidden:

- private headers, signatures, and token fields
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

    CP->>MAP: Call Launch Game API + playerId + initialEligibility
    MAP->>LWP: Create player session from playerId
    LWP-->>MAP: Game URL
    MAP-->>CP: Game URL
    CP->>LWF: Open Lucky Wheel + customer initialEligibility

    LWF->>LWP: Load current event and player state
    LWP->>MAP: Get deposit eligibility
    MAP->>CP: Resolve deposit eligibility + deposit URL
    CP-->>MAP: Deposit eligibility result
    MAP-->>LWP: Deposit eligibility result
    Note over LWP: Final eligibility = live event + today's used spins + deposit rule
    LWP-->>LWF: Event data + eligibility

    alt Player can spin
        Note over LWF: Player taps Spin in frontend
        LWF->>LWP: Submit spin request
        Note over LWP: Re-check daily eligibility from event config + spin history
        LWP->>MAP: Confirm latest deposit eligibility
        MAP->>CP: Confirm latest deposit eligibility + deposit URL
        CP-->>MAP: Deposit eligibility result
        MAP-->>LWP: Deposit eligibility result
        LWP-->>LWF: Spin result
    else Player cannot spin
        LWP-->>LWF: Show not eligible state or deposit redirect
    end

    Note over LWF,CP: initialEligibility is customer-platform bootstrap data only. Lucky Wheel still reloads and re-validates eligibility after launch.
    Note over LWF,CP: Daily spin usage is owned by Lucky Wheel and derived from event config plus used spins for the current event day.
    Note over LWF,CP: Deposit-related eligibility and deposit URL are provided by Customer Platform through Merchant API.
```
