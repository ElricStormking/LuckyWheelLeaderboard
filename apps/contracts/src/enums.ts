export enum EventStatus {
  Draft = "draft",
  Scheduled = "scheduled",
  Live = "live",
  Ended = "ended",
  Finalized = "finalized",
  Cancelled = "cancelled",
}

export enum EligibilityStatus {
  PlayableNow = "PLAYABLE_NOW",
  AlreadySpin = "ALREADY_SPIN",
  GoToDeposit = "GO_TO_DEPOSIT",
  EventEnded = "EVENT_ENDED",
}

export enum WheelSegmentOperator {
  Add = "add",
  Subtract = "subtract",
  Multiply = "multiply",
  Divide = "divide",
  Equals = "equals",
}

export enum WheelVisualState {
  Normal = "normal",
  GreyedOut = "greyed_out",
}

export enum PlatformLinkType {
  Deposit = "deposit",
  CustomerService = "customer_service",
}
