import {
  CurrentEventResponse,
  EventPrizeDto,
  EventStatus,
  PlatformLinkType,
  PlayerEventSummaryDto,
  WheelSegmentDto,
  WheelSegmentOperator,
} from "@lucky-wheel/contracts";

const demoEventId = "evt_2026_lucky_wheel";
const playerId = "player_demo_001";
const playerName = "AceNova";

const wheelSegments: WheelSegmentDto[] = [
  {
    segmentIndex: 0,
    label: "+20",
    scoreOperator: WheelSegmentOperator.Add,
    scoreOperand: 20,
    weightPercent: 22,
    displayAssetKey: "segment-add-small",
    rewardType: "score",
    rewardValue: 20,
  },
  {
    segmentIndex: 1,
    label: "+80",
    scoreOperator: WheelSegmentOperator.Add,
    scoreOperand: 80,
    weightPercent: 18,
    displayAssetKey: "segment-add-large",
    rewardType: "score",
    rewardValue: 80,
  },
  {
    segmentIndex: 2,
    label: "x2",
    scoreOperator: WheelSegmentOperator.Multiply,
    scoreOperand: 2,
    weightPercent: 14,
    displayAssetKey: "segment-multiply",
    rewardType: "multiplier",
    rewardValue: 2,
  },
  {
    segmentIndex: 3,
    label: "/2",
    scoreOperator: WheelSegmentOperator.Divide,
    scoreOperand: 2,
    weightPercent: 14,
    displayAssetKey: "segment-divide",
    rewardType: "divider",
    rewardValue: 2,
  },
  {
    segmentIndex: 4,
    label: "-50",
    scoreOperator: WheelSegmentOperator.Subtract,
    scoreOperand: 50,
    weightPercent: 14,
    displayAssetKey: "segment-subtract",
    rewardType: "score",
    rewardValue: -50,
  },
  {
    segmentIndex: 5,
    label: "=0",
    scoreOperator: WheelSegmentOperator.Equals,
    scoreOperand: 0,
    weightPercent: 18,
    displayAssetKey: "segment-reset",
    rewardType: "reset",
    rewardValue: 0,
  },
];

const prizes: EventPrizeDto[] = [
  {
    id: "prize-1",
    rankFrom: 1,
    rankTo: 1,
    prizeLabel: "RM 1,688",
    prizeDescription: "Grand cash reward for the event champion.",
    imageUrl: null,
    accentLabel: "Crown Prize",
  },
  {
    id: "prize-2",
    rankFrom: 2,
    rankTo: 2,
    prizeLabel: "RM 1,288",
    prizeDescription: "Second-place reward.",
    imageUrl: null,
    accentLabel: "Silver Streak",
  },
  {
    id: "prize-3",
    rankFrom: 3,
    rankTo: 3,
    prizeLabel: "RM 888",
    prizeDescription: "Third-place reward.",
    imageUrl: null,
    accentLabel: "Bronze Rush",
  },
  {
    id: "prize-4",
    rankFrom: 4,
    rankTo: 10,
    prizeLabel: "RM 88",
    prizeDescription: "Top 10 placement reward.",
    imageUrl: null,
    accentLabel: "Top 10",
  },
  {
    id: "prize-5",
    rankFrom: 11,
    rankTo: 30,
    prizeLabel: "RM 58",
    prizeDescription: "Top 30 placement reward.",
    imageUrl: null,
    accentLabel: "Top 30",
  },
];

const leaderboardSeed = [
  { playerName: "LunaRay", score: 6200 },
  { playerName: "VoltKing", score: 6050 },
  { playerName: "MintRush", score: 5870 },
  { playerName: "EchoFox", score: 5710 },
  { playerName: "DeltaAce", score: 5560 },
  { playerName: "JadeSpin", score: 5430 },
  { playerName: "CrimsonQ", score: 5310 },
  { playerName: "NovaMint", score: 5200 },
  { playerName: "TigerFlux", score: 5110 },
  { playerName: "HaloJin", score: 5000 },
  { playerName: "IvoryAce", score: 4910 },
  { playerName: "Skylark7", score: 4830 },
  { playerName, score: 4550, isSelf: true },
  { playerName: "RougeSpin", score: 4510 },
  { playerName: "KiteNova", score: 4460 },
  { playerName: "ZenVale", score: 4410 },
  { playerName: "LuckyKai", score: 4370 },
  { playerName: "BlueOrbit", score: 4320 },
  { playerName: "CinderFox", score: 4280 },
  { playerName: "MarbleJet", score: 4230 },
  { playerName: "PixelTide", score: 4190 },
  { playerName: "NobleLynx", score: 4140 },
  { playerName: "SolarMint", score: 4080 },
  { playerName: "KarmaDrift", score: 4030 },
  { playerName: "TangoZero", score: 3990 },
  { playerName: "AquaBloom", score: 3950 },
  { playerName: "RookJet", score: 3900 },
  { playerName: "VegaSpin", score: 3840 },
  { playerName: "TurboLeaf", score: 3790 },
  { playerName: "OpalDash", score: 3740 },
  { playerName: "QuietStorm", score: 3680 },
];

const recentSpinHistory = [
  { createdAt: "2026-02-24T11:10:00Z", segmentIndex: 0, segmentLabel: "+20", scoreDelta: 20, runningEventTotal: 4370 },
  { createdAt: "2026-02-23T10:42:00Z", segmentIndex: 1, segmentLabel: "+80", scoreDelta: 80, runningEventTotal: 4350 },
  { createdAt: "2026-02-22T09:35:00Z", segmentIndex: 0, segmentLabel: "+20", scoreDelta: 20, runningEventTotal: 4270 },
  { createdAt: "2026-02-21T08:22:00Z", segmentIndex: 4, segmentLabel: "-50", scoreDelta: -50, runningEventTotal: 4250 },
  { createdAt: "2026-02-20T07:15:00Z", segmentIndex: 2, segmentLabel: "x2", scoreDelta: 2130, runningEventTotal: 4300 },
  { createdAt: "2026-02-19T05:50:00Z", segmentIndex: 3, segmentLabel: "/2", scoreDelta: -2130, runningEventTotal: 2170 },
];

const eventHistory = [
  {
    eventId: "evt_2026_jan",
    eventName: "January Lucky Wheel",
    finalRank: 22,
    finalScore: 2810,
    prizeName: "RM 58",
    endedAt: "2026-01-31T15:59:59Z",
  },
];

export function createPrototypeFixture(): {
  currentEvent: CurrentEventResponse;
  prizes: EventPrizeDto[];
} {
  const player: PlayerEventSummaryDto = {
    playerId,
    playerName,
    totalScore: 4550,
    rank: 13,
    prizeName: "RM 58",
    isTop30: true,
    hasSpun: true,
    grantedSpinCount: 1,
    usedSpinCount: 0,
    remainingSpinCount: 1,
    spinAllowanceSource: "lucky_wheel_server",
    resultsVisible: true,
    spinHistory: recentSpinHistory.map((entry, index) => ({
      id: `spin-history-${index + 1}`,
      ...entry,
    })),
    eventHistory,
  };

  return {
    currentEvent: {
      event: {
        id: demoEventId,
        code: "LUCKY-WHEEL-2026-02",
        title: "iBET Lucky Wheel",
        shortDescription: "Take one server-validated spin per day and chase a Top 30 cash prize.",
        status: EventStatus.Live,
        startAt: "2026-02-01T00:00:00+08:00",
        endAt: "2026-02-28T23:59:59+08:00",
        timezone: "GMT+8",
        countdownEndsAt: "2026-02-28T23:59:59+08:00",
        promotionPeriodLabel: "01/02/2026 - 28/02/2026",
        styleTheme: "default",
        heroSteps: [
          {
            title: "Deposit Daily",
            subtitle: "RM50 unlocks today's shot.",
            iconKey: "deposit",
          },
          {
            title: "Spin & Score",
            subtitle: "Lucky Wheel checks today's server-side spin usage before each daily spin.",
            iconKey: "spin",
          },
          {
            title: "Rank Up",
            subtitle: "Finish Top 30 for cash rewards.",
            iconKey: "rank",
          },
        ],
        wheelSegments,
        rulesContent: [
          "1. Each member may use Lucky Wheel once per day when Lucky Wheel server confirms daily eligibility.",
          "2. Results are server-authoritative and update your event total immediately.",
          "3. Top 30 rankings are refreshed after successful daily spins and periodic syncs.",
          "4. Deposit and customer-service links are configurable and shown in-menu.",
          "5. Ended events remain viewable but their wheel is locked.",
        ].join("\n"),
        platformLinks: [
          {
            type: PlatformLinkType.Deposit,
            label: "Go to Deposit",
            url: "https://merchant.example.com/deposit",
          },
          {
            type: PlatformLinkType.CustomerService,
            label: "Customer Service",
            url: "https://merchant.example.com/support",
          },
        ],
      },
      player,
    },
    prizes,
  };
}

export function createLeaderboardSeed() {
  return leaderboardSeed.map((entry) => ({
    playerName: entry.playerName,
    score: entry.score,
    isSelf: Boolean(entry.isSelf),
  }));
}
