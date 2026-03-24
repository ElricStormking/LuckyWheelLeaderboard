import {
  EligibilityStatus,
  EventStatus,
  PlatformLinkType,
  WheelSegmentOperator,
  WheelVisualState,
} from "./enums";

export interface WheelSegmentDto {
  segmentIndex: number;
  label: string;
  scoreOperator: WheelSegmentOperator;
  scoreOperand: number;
  weightPercent: number;
  displayAssetKey: string;
  rewardType?: string | null;
  rewardValue?: number | string | null;
}

export interface EventPrizeDto {
  id: string;
  rankFrom: number;
  rankTo: number;
  prizeLabel: string;
  prizeDescription: string;
  imageUrl: string | null;
  accentLabel?: string;
}

export interface LeaderboardEntryDto {
  rank: number;
  playerName: string;
  score: number;
  prizeName: string | null;
  isSelf: boolean;
}

export interface LeaderboardResponse {
  eventId: string;
  leaderboard: LeaderboardEntryDto[];
  myRank: LeaderboardEntryDto | null;
  totalDisplayed: number;
  lastSyncedAt: string;
  resultsVisible: boolean;
  pendingMessage?: string;
}

export interface SpinHistoryEntryDto {
  id: string;
  createdAt: string;
  segmentIndex: number;
  segmentLabel: string;
  scoreDelta: number;
  runningEventTotal: number;
}

export interface EventHistoryEntryDto {
  eventId: string;
  eventName: string;
  finalRank: number | null;
  finalScore: number;
  prizeName: string | null;
  endedAt: string;
}

export interface EventListItemDto {
  id: string;
  code: string;
  title: string;
  shortDescription: string;
  status: EventStatus;
  startAt: string;
  endAt: string;
  countdownEndsAt: string;
  promotionPeriodLabel: string;
}

export interface EventListResponse {
  items: EventListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  currentEventId: string | null;
}

export type AppLocale = "en" | "ms" | "zh-CN";
export type SpinAllowanceSource = "lucky_wheel_server" | "archive_snapshot";

export interface LocalizationOptionDto {
  code: AppLocale;
  label: string;
}

export interface LocalizationConfigResponse {
  requestedLocale?: string;
  resolvedLocale: AppLocale;
  supportedLocales: LocalizationOptionDto[];
}

export interface MerchantEligibilityResponseDto {
  eventId: string;
  playerId: string;
  depositQualified: boolean;
  depositUrl?: string;
  reasonCode?: string;
  decisionId: string;
  evaluatedAt: string;
  expiresAt: string;
  upstreamSource: "customer_platform";
  updatedAt: string;
}

export interface MerchantApiStatusDto {
  service: "merchant-api";
  status: "online" | "degraded";
  upstreamSource: "lucky_wheel_platform" | "customer_platform";
  updatedAt: string;
  error?: string;
}

export interface LuckyWheelPlayerSessionDeviceDto {
  platform?: string;
  userAgent?: string;
}

export interface LuckyWheelPlayerSessionLaunchRequestDto {
  merchantPlayerId: string;
  playerDisplayName?: string;
  locale?: AppLocale;
  eventId?: string;
  device?: LuckyWheelPlayerSessionDeviceDto;
}

export interface LuckyWheelPlayerSessionLaunchResponseDto {
  sessionId: string;
  launchUrl: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface IntegrationApiResponseDto<TData> {
  success: boolean;
  errorCode: number;
  errorMessage: string;
  data: TData | null;
}

export interface InitialEligibilityBootstrapDto {
  depositQualified: boolean;
  depositUrl?: string;
  reasonCode?: string;
  decisionId?: string;
  evaluatedAt?: string;
  expiresAt?: string;
}

export interface MerchantIntegrationLaunchRequestDto {
  merchantId: string;
  playerId: string;
  initialEligibility: InitialEligibilityBootstrapDto;
  timestamp: number;
  hash: string;
}

export interface MerchantIntegrationLaunchDataDto {
  url: string;
  sessionId: string;
  expiresAt: string;
}

export type MerchantIntegrationLaunchResponseDto =
  IntegrationApiResponseDto<MerchantIntegrationLaunchDataDto>;

export interface SpinAllowanceDto {
  grantedSpinCount: number;
  usedSpinCount: number;
  remainingSpinCount: number;
  spinAllowanceSource: SpinAllowanceSource;
}

export interface PlayerEventSummaryDto extends SpinAllowanceDto {
  playerId: string;
  playerName: string;
  totalScore: number;
  rank: number | null;
  prizeName: string | null;
  isTop30: boolean;
  hasSpun: boolean;
  resultsVisible: boolean;
  pendingMessage?: string;
  spinHistory: SpinHistoryEntryDto[];
  eventHistory: EventHistoryEntryDto[];
}

export interface PlatformLinkDto {
  type: PlatformLinkType;
  label: string;
  url: string;
}

export interface EventCampaignDto {
  id: string;
  code: string;
  title: string;
  shortDescription: string;
  status: EventStatus;
  startAt: string;
  endAt: string;
  timezone: string;
  countdownEndsAt: string;
  promotionPeriodLabel: string;
  styleTheme: string;
  heroSteps: Array<{
    title: string;
    subtitle: string;
    iconKey: string;
  }>;
  wheelSegments: WheelSegmentDto[];
  rulesContent: string;
  platformLinks: PlatformLinkDto[];
}

export interface CurrentEventResponse {
  event: EventCampaignDto;
  player: PlayerEventSummaryDto;
}

export interface PlayerSpinHistoryResponse {
  eventId: string;
  page: number;
  pageSize: number;
  total: number;
  items: SpinHistoryEntryDto[];
}

export interface PlayerEventHistoryResponse {
  page: number;
  pageSize: number;
  total: number;
  items: EventHistoryEntryDto[];
}

export interface EligibilityResponse extends SpinAllowanceDto {
  eventId: string;
  eventStatus: EventStatus;
  eligibilityStatus: EligibilityStatus;
  buttonLabel: string;
  wheelVisualState: WheelVisualState;
  depositUrl?: string;
  messageKey?: string;
  reasonCode?: string;
}

export interface SpinRequest {
  eventId: string;
  idempotencyKey: string;
}

export interface SpinSuccessResponse {
  success: true;
  segmentIndex: number;
  scoreDelta: number;
  runningEventTotal: number;
  rewardType: string;
  rewardValue: string | number | null;
  rank: number | null;
  leaderboardChanged: boolean;
}

export interface SpinFailureResponse {
  success: false;
  eligibilityStatus: EligibilityStatus;
  depositUrl?: string;
  messageKey?: string;
}

export type SpinResponse = SpinSuccessResponse | SpinFailureResponse;

export interface EventStatusChangedEventDto {
  eventId: string;
  emittedAt: string;
  status: EventStatus;
}

export interface CountdownSyncEventDto {
  eventId: string;
  emittedAt: string;
  countdownEndsAt: string;
  serverNow: string;
}

export interface LeaderboardTop30EventDto {
  eventId: string;
  emittedAt: string;
  leaderboard: LeaderboardResponse;
}

export interface PlayerScoreChangedEventDto extends SpinAllowanceDto {
  eventId: string;
  emittedAt: string;
  totalScore: number;
  rank: number | null;
  prizeName: string | null;
  hasSpun: boolean;
}

export interface PlayerRankChangedEventDto {
  eventId: string;
  emittedAt: string;
  previousRank: number | null;
  rank: number | null;
  prizeName: string | null;
}

export interface AdminServiceEndpointDto {
  key: "client" | "server" | "merchant-api" | "admin";
  label: string;
  url: string;
  description: string;
}

export interface AdminAuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface AdminEventLocalizationDto {
  locale: AppLocale;
  title: string;
  shortDescription: string;
  rulesContent: string;
  promotionPeriodLabel: string;
}

export interface AdminWheelSegmentLocalizationDto {
  locale: AppLocale;
  label: string;
}

export interface AdminWheelSegmentConfigDto {
  id: string;
  segmentIndex: number;
  scoreOperator: WheelSegmentOperator;
  scoreOperand: number;
  weightPercent: number;
  displayAssetKey: string;
  localizations: AdminWheelSegmentLocalizationDto[];
}

export interface AdminPrizeLocalizationDto {
  locale: AppLocale;
  prizeLabel: string;
  prizeDescription: string;
  accentLabel?: string | null;
}

export interface AdminPrizeConfigDto {
  id: string;
  rankFrom: number;
  rankTo: number;
  imageUrl: string | null;
  displayOrder: number;
  localizations: AdminPrizeLocalizationDto[];
}

export interface AdminPlatformLinkLocalizationDto {
  locale: AppLocale;
  label: string;
}

export interface AdminPlatformLinkConfigDto {
  id: string;
  type: PlatformLinkType;
  url: string;
  displayOrder: number;
  localizations: AdminPlatformLinkLocalizationDto[];
}

export interface AdminEventConfigDto {
  id: string;
  code: string;
  siteCode: string;
  status: EventStatus;
  timezone: string;
  styleTheme: string;
  startAt: string;
  endAt: string;
  countdownEndsAt: string;
  createdAt: string;
  updatedAt: string;
  localizations: AdminEventLocalizationDto[];
  wheelSegments: AdminWheelSegmentConfigDto[];
  prizes: AdminPrizeConfigDto[];
  platformLinks: AdminPlatformLinkConfigDto[];
}

export interface AdminEventUpsertRequest {
  code: string;
  siteCode: string;
  status: EventStatus;
  timezone: string;
  styleTheme: string;
  startAt: string;
  endAt: string;
  countdownEndsAt: string;
  localizations: AdminEventLocalizationDto[];
  wheelSegments: Omit<AdminWheelSegmentConfigDto, "id">[];
  prizes: Omit<AdminPrizeConfigDto, "id">[];
  platformLinks: Omit<AdminPlatformLinkConfigDto, "id">[];
}

export interface AdminEventTermsUpdateRequest {
  localizations: AdminEventLocalizationDto[];
}

export interface AdminPlatformLinksUpdateRequest {
  platformLinks: Omit<AdminPlatformLinkConfigDto, "id">[];
}

export interface AdminOverviewResponse {
  generatedAt: string;
  currentEventId: string | null;
  services: AdminServiceEndpointDto[];
  supportedLocales: LocalizationOptionDto[];
  events: EventListItemDto[];
  merchantApi: MerchantApiStatusDto;
}

export interface AdminLocalizationCoverageDto {
  locale: AppLocale;
  eventContentComplete: boolean;
  prizeContentComplete: boolean;
  wheelLabelsComplete: boolean;
  platformLinksComplete: boolean;
}

export interface AdminRecentSpinDto extends SpinHistoryEntryDto {
  playerName: string;
}

export interface AdminEventDashboardResponse {
  generatedAt: string;
  event: EventCampaignDto;
  leaderboard: LeaderboardResponse;
  player: PlayerEventSummaryDto;
  prizes: EventPrizeDto[];
  metrics: {
    participantCount: number;
    totalSpins: number;
    topScore: number;
    averageScore: number;
  };
  recentSpins: AdminRecentSpinDto[];
  localizationCoverage: AdminLocalizationCoverageDto[];
  merchantApi: MerchantApiStatusDto;
}

export interface AdminEventEditorResponse {
  generatedAt: string;
  event: AdminEventConfigDto;
  metrics: AdminEventDashboardResponse["metrics"];
  localizationCoverage: AdminLocalizationCoverageDto[];
  merchantApi: MerchantApiStatusDto;
  auditPreview: AdminAuditLogDto[];
}

export interface AdminParticipantDto {
  playerId: string;
  playerName: string;
  totalScore: number;
  rank: number | null;
  hasSpun: boolean;
  updatedAt: string;
}

export interface AdminParticipantsResponse {
  page: number;
  pageSize: number;
  total: number;
  items: AdminParticipantDto[];
}

export interface AdminEligibilityRecordDto {
  playerId: string;
  playerName: string;
  eventStatus: EventStatus;
  eligibilityStatus: EligibilityStatus;
  grantedSpinCount: number;
  usedSpinCount: number;
  remainingSpinCount: number;
  spinAllowanceSource: SpinAllowanceSource;
  reasonCode?: string;
  updatedAt: string;
}

export interface AdminEligibilityRecordsResponse {
  page: number;
  pageSize: number;
  total: number;
  summary: {
    playableNow: number;
    alreadySpin: number;
    goToDeposit: number;
    eventEnded: number;
  };
  items: AdminEligibilityRecordDto[];
}

export interface AdminSpinRecordDto {
  id: string;
  playerId: string;
  playerName: string;
  createdAt: string;
  segmentIndex: number;
  segmentLabel: string;
  scoreDelta: number;
  runningEventTotal: number;
  rewardType: string;
  rewardValue?: string | number | null;
}

export interface AdminSpinRecordsResponse {
  page: number;
  pageSize: number;
  total: number;
  items: AdminSpinRecordDto[];
}

export interface AdminAuditLogResponse {
  page: number;
  pageSize: number;
  total: number;
  items: AdminAuditLogDto[];
}
