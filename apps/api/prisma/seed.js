const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const currentPlayerId = "player_demo_001";
const liveEventId = "evt_2026_march";
const scheduledEventId = "evt_2026_april";
const endedEventId = "evt_2026_february";
const finalizedEventId = "evt_2026_january";
const supportedLocales = ["en", "ms", "zh-CN"];

const playerRoster = [
  { id: "player_live_001", displayName: "LunaRay" },
  { id: "player_live_002", displayName: "VoltKing" },
  { id: "player_live_003", displayName: "MintRush" },
  { id: "player_live_004", displayName: "EchoFox" },
  { id: "player_live_005", displayName: "DeltaAce" },
  { id: "player_live_006", displayName: "JadeSpin" },
  { id: "player_live_007", displayName: "CrimsonQ" },
  { id: "player_live_008", displayName: "NovaMint" },
  { id: "player_live_009", displayName: "TigerFlux" },
  { id: "player_live_010", displayName: "HaloJin" },
  { id: "player_live_011", displayName: "IvoryAce" },
  { id: "player_live_012", displayName: "Skylark7" },
  { id: currentPlayerId, displayName: "AceNova" },
  { id: "player_live_014", displayName: "RougeSpin" },
  { id: "player_live_015", displayName: "KiteNova" },
  { id: "player_live_016", displayName: "ZenVale" },
  { id: "player_live_017", displayName: "LuckyKai" },
  { id: "player_live_018", displayName: "BlueOrbit" },
  { id: "player_live_019", displayName: "CinderFox" },
  { id: "player_live_020", displayName: "MarbleJet" },
  { id: "player_live_021", displayName: "PixelTide" },
  { id: "player_live_022", displayName: "NobleLynx" },
  { id: "player_live_023", displayName: "SolarMint" },
  { id: "player_live_024", displayName: "KarmaDrift" },
  { id: "player_live_025", displayName: "TangoZero" },
  { id: "player_live_026", displayName: "AquaBloom" },
  { id: "player_live_027", displayName: "RookJet" },
  { id: "player_live_028", displayName: "VegaSpin" },
  { id: "player_live_029", displayName: "TurboLeaf" },
  { id: "player_live_030", displayName: "OpalDash" },
  { id: "player_live_031", displayName: "QuietStorm" },
];

const liveScores = [
  6200, 6050, 5870, 5710, 5560, 5430, 5310, 5200, 5110, 5000, 4910, 4830, 4550,
  4510, 4460, 4410, 4370, 4320, 4280, 4230, 4190, 4140, 4080, 4030, 3990, 3950,
  3900, 3840, 3790, 3740, 3680,
];
const endedScores = [
  6880, 6720, 6540, 6390, 6260, 6110, 5990, 5870, 5760, 5610, 5480, 5370, 3600,
  5290, 5200, 5110, 5030, 4970, 4880, 4810, 4740, 4660, 4590, 4520, 4450, 4370,
  4290, 4210, 4140, 4060, 3980,
];
const finalizedScores = [
  5980, 5840, 5710, 5590, 5480, 5360, 5250, 5160, 5070, 4990, 4920, 4860, 4040,
  3980, 3920, 3860, 3810, 3750, 3690, 3630, 3570, 3510, 3450, 3390, 3330, 3270,
  3210, 3150, 3090, 3030, 2970,
];

const prizeTiers = [
  {
    rankFrom: 1,
    rankTo: 1,
    accentLabel: "Champion",
    prizeDescription: "Grand event cash reward.",
  },
  {
    rankFrom: 2,
    rankTo: 2,
    accentLabel: "Runner-Up",
    prizeDescription: "Second place event reward.",
  },
  {
    rankFrom: 3,
    rankTo: 3,
    accentLabel: "Third Place",
    prizeDescription: "Third place event reward.",
  },
  {
    rankFrom: 4,
    rankTo: 10,
    accentLabel: "Top 10",
    prizeDescription: "Elite placement reward.",
  },
  {
    rankFrom: 11,
    rankTo: 30,
    accentLabel: "Top 30",
    prizeDescription: "Leaderboard finish reward.",
  },
];

const eventDefinitions = [
  {
    id: liveEventId,
    code: "LUCKY-WHEEL-2026-03",
    status: "live",
    title: "iBET Lucky Wheel",
    shortDescription: "Use your once-per-day Lucky Wheel spin, climb the leaderboard, and lock in a Top 30 cash prize.",
    rulesContent: [
      "1. Each member may spin Lucky Wheel once per day when Lucky Wheel server confirms daily eligibility.",
      "2. Results are server-authoritative and update your event total immediately.",
      "3. Top 30 rankings are refreshed after successful spins and realtime syncs.",
      "4. Deposit and customer-service links are configurable and shown in-menu.",
      "5. Ended events remain viewable but their wheel is locked.",
    ].join("\n"),
    promotionPeriodLabel: "01/03/2026 - 31/03/2026",
    startAt: "2026-03-01T00:00:00+08:00",
    endAt: "2026-03-31T23:59:59+08:00",
    countdownEndsAt: "2026-03-31T23:59:59+08:00",
    prizeLabels: ["RM 1,688", "RM 1,288", "RM 888", "RM 88", "RM 58"],
    wheelPrefix: "march",
  },
  {
    id: scheduledEventId,
    code: "LUCKY-WHEEL-2026-04",
    status: "scheduled",
    title: "April Lucky Wheel",
    shortDescription: "Scheduled event configuration prepared in admin before publish goes live.",
    rulesContent: [
      "1. This future event is visible in admin and used to test scheduling flow.",
      "2. Lucky Wheel daily spin eligibility is checked only when the event becomes live.",
      "3. Admin can still adjust wheel, prizes, links, and language content before launch.",
    ].join("\n"),
    promotionPeriodLabel: "01/04/2026 - 30/04/2026",
    startAt: "2026-04-01T00:00:00+08:00",
    endAt: "2026-04-30T23:59:59+08:00",
    countdownEndsAt: "2026-04-30T23:59:59+08:00",
    prizeLabels: ["RM 1,988", "RM 1,488", "RM 988", "RM 98", "RM 68"],
    wheelPrefix: "april",
  },
  {
    id: endedEventId,
    code: "LUCKY-WHEEL-2026-02",
    status: "ended",
    title: "February Lucky Wheel",
    shortDescription: "Ended event snapshot with final Top 30 standings.",
    rulesContent: [
      "1. February scores are frozen and view-only.",
      "2. Final rankings remain available after the event period.",
      "3. Archived prize mapping is still shown per rank.",
      "4. The wheel remains visible but cannot be spun.",
    ].join("\n"),
    promotionPeriodLabel: "01/02/2026 - 28/02/2026",
    startAt: "2026-02-01T00:00:00+08:00",
    endAt: "2026-02-28T23:59:59+08:00",
    countdownEndsAt: "2026-02-28T23:59:59+08:00",
    prizeLabels: ["RM 1,388", "RM 988", "RM 688", "RM 68", "RM 38"],
    wheelPrefix: "february",
  },
  {
    id: finalizedEventId,
    code: "LUCKY-WHEEL-2026-01",
    status: "finalized",
    title: "January Lucky Wheel",
    shortDescription: "Finalized archive with preserved leaderboard and prize tiers.",
    rulesContent: [
      "1. January standings are permanently archived.",
      "2. Final rank and prize snapshots are preserved for history browsing.",
      "3. The wheel is shown in read-only archive mode.",
    ].join("\n"),
    promotionPeriodLabel: "01/01/2026 - 31/01/2026",
    startAt: "2026-01-01T00:00:00+08:00",
    endAt: "2026-01-31T23:59:59+08:00",
    countdownEndsAt: "2026-01-31T23:59:59+08:00",
    prizeLabels: ["RM 1,188", "RM 888", "RM 588", "RM 58", "RM 28"],
    wheelPrefix: "january",
  },
];

const localizedEventContent = {
  [liveEventId]: {
    en: {
      title: "iBET Lucky Wheel",
      shortDescription:
        "Use your once-per-day Lucky Wheel spin, climb the leaderboard, and lock in a Top 30 cash prize.",
      rulesContent: [
        "1. Each member may spin Lucky Wheel once per day when Lucky Wheel server confirms daily eligibility.",
        "2. Results are server-authoritative and update your event total immediately.",
        "3. Top 30 rankings are refreshed after successful spins and realtime syncs.",
        "4. Deposit and customer-service links are configurable and shown in-menu.",
        "5. Ended events remain viewable but their wheel is locked.",
      ].join("\n"),
      promotionPeriodLabel: "01/03/2026 - 31/03/2026",
    },
    ms: {
      title: "iBET Roda Tuah",
      shortDescription:
        "Gunakan kuota putaran harian Lucky Wheel, panjat carta, dan rebut hadiah tunai Top 30.",
      rulesContent: [
        "1. Kuota putaran harian ahli disahkan oleh pelayan Lucky Wheel.",
        "2. Keputusan adalah autoritatif di pelayan dan mengemas kini jumlah acara anda serta-merta.",
        "3. Kedudukan Top 30 dikemas kini selepas putaran berjaya dan penyegerakan masa nyata.",
        "4. Pautan deposit dan khidmat pelanggan boleh dikonfigurasi dan dipaparkan dalam menu.",
        "5. Acara yang telah tamat masih boleh dilihat tetapi roda dikunci.",
      ].join("\n"),
      promotionPeriodLabel: "01/03/2026 - 31/03/2026",
    },
    "zh-CN": {
      title: "iBET 幸运转盘",
      shortDescription:
        "使用 Merchant API 返回的转动额度，冲击排行榜并锁定前 30 名现金奖励。",
      rulesContent: [
        "1. 玩家转动额度由 Merchant API 返回，其来源为 Customer Platform。",
        "2. 结果由服务器权威判定，并会立即更新您的活动总分。",
        "3. 成功转动后与实时同步后，前 30 排名会刷新。",
        "4. 充值与客服链接可在后台配置，并显示在菜单中。",
        "5. 已结束活动仍可查看，但转盘不可再转动。",
      ].join("\n"),
      promotionPeriodLabel: "2026/03/01 - 2026/03/31",
    },
  },
  [scheduledEventId]: {
    en: {
      title: "April Lucky Wheel",
      shortDescription:
        "Scheduled admin-ready event with editable wheel, prizes, and rules before launch.",
      rulesContent: [
        "1. This future event is visible in admin and used to test scheduling flow.",
        "2. Merchant API daily spin eligibility is checked only when the event becomes live.",
        "3. Admin can still adjust wheel, prizes, links, and language content before launch.",
      ].join("\n"),
      promotionPeriodLabel: "01/04/2026 - 30/04/2026",
    },
    ms: {
      title: "Roda Tuah April",
      shortDescription:
        "Acara berjadual sedia admin dengan roda, hadiah dan peraturan yang boleh diubah sebelum pelancaran.",
      rulesContent: [
        "1. Acara masa hadapan ini dipaparkan dalam admin untuk menguji aliran jadual.",
        "2. Kelayakan putaran harian Merchant API hanya diperiksa apabila acara menjadi live.",
        "3. Admin masih boleh melaras roda, hadiah, pautan dan bahasa sebelum pelancaran.",
      ].join("\n"),
      promotionPeriodLabel: "01/04/2026 - 30/04/2026",
    },
    "zh-CN": {
      title: "四月幸运转盘",
      shortDescription:
        "用于后台排期测试的预备活动，支持上线前调整转盘、奖励和规则内容。",
      rulesContent: [
        "1. 该未来活动会显示在后台中，用于测试排期流程。",
        "2. 只有当活动进入 live 状态后才会检查 Merchant API 额度。",
        "3. 上线前后台仍可调整转盘、奖励、链接与多语言内容。",
      ].join("\n"),
      promotionPeriodLabel: "2026/04/01 - 2026/04/30",
    },
  },
  [endedEventId]: {
    en: {
      title: "February Lucky Wheel",
      shortDescription: "Ended event snapshot with final Top 30 standings.",
      rulesContent: [
        "1. February scores are frozen and view-only.",
        "2. Final rankings remain available after the event period.",
        "3. Archived prize mapping is still shown per rank.",
        "4. The wheel remains visible but cannot be spun.",
      ].join("\n"),
      promotionPeriodLabel: "01/02/2026 - 28/02/2026",
    },
    ms: {
      title: "Roda Tuah Februari",
      shortDescription: "Paparan acara tamat dengan kedudukan akhir Top 30.",
      rulesContent: [
        "1. Skor Februari telah dibekukan dan hanya untuk tontonan.",
        "2. Kedudukan akhir kekal tersedia selepas tempoh acara.",
        "3. Pemetaan hadiah arkib masih dipaparkan mengikut ranking.",
        "4. Roda masih kelihatan tetapi tidak boleh diputar.",
      ].join("\n"),
      promotionPeriodLabel: "01/02/2026 - 28/02/2026",
    },
    "zh-CN": {
      title: "二月幸运转盘",
      shortDescription: "已结束活动快照，保留前 30 最终排名。",
      rulesContent: [
        "1. 二月分数已冻结，仅供查看。",
        "2. 活动结束后仍可查看最终排名。",
        "3. 归档奖励仍按名次显示。",
        "4. 转盘仍会展示，但不可再转动。",
      ].join("\n"),
      promotionPeriodLabel: "2026/02/01 - 2026/02/28",
    },
  },
  [finalizedEventId]: {
    en: {
      title: "January Lucky Wheel",
      shortDescription: "Finalized archive with preserved leaderboard and prize tiers.",
      rulesContent: [
        "1. January standings are permanently archived.",
        "2. Final rank and prize snapshots are preserved for history browsing.",
        "3. The wheel is shown in read-only archive mode.",
      ].join("\n"),
      promotionPeriodLabel: "01/01/2026 - 31/01/2026",
    },
    ms: {
      title: "Roda Tuah Januari",
      shortDescription: "Arkib dimuktamadkan dengan ranking dan hadiah yang dipelihara.",
      rulesContent: [
        "1. Kedudukan Januari diarkibkan secara kekal.",
        "2. Snapshot ranking akhir dan hadiah disimpan untuk semakan sejarah.",
        "3. Roda dipaparkan dalam mod arkib baca sahaja.",
      ].join("\n"),
      promotionPeriodLabel: "01/01/2026 - 31/01/2026",
    },
    "zh-CN": {
      title: "一月幸运转盘",
      shortDescription: "已结算归档，保留排行榜与奖励档位。",
      rulesContent: [
        "1. 一月排名已永久归档。",
        "2. 最终名次与奖励快照会保留供历史查看。",
        "3. 转盘以只读归档模式展示。",
      ].join("\n"),
      promotionPeriodLabel: "2026/01/01 - 2026/01/31",
    },
  },
};

const localizedPrizeContent = {
  [liveEventId]: buildPrizeLocaleMap(["RM 1,688", "RM 1,288", "RM 888", "RM 88", "RM 58"]),
  [scheduledEventId]: buildPrizeLocaleMap(["RM 1,988", "RM 1,488", "RM 988", "RM 98", "RM 68"]),
  [endedEventId]: buildPrizeLocaleMap(["RM 1,388", "RM 988", "RM 688", "RM 68", "RM 38"]),
  [finalizedEventId]: buildPrizeLocaleMap(["RM 1,188", "RM 888", "RM 588", "RM 58", "RM 28"]),
};

const localizedPlatformLinks = {
  en: {
    deposit: "Go to Deposit",
    customer_service: "Customer Service",
  },
  ms: {
    deposit: "Pergi Deposit",
    customer_service: "Khidmat Pelanggan",
  },
  "zh-CN": {
    deposit: "前往充值",
    customer_service: "联系客服",
  },
};

const localizedWheelSegmentLabels = {
  en: ["+40", "+120", "x2", "/2", "-80", "=0"],
  ms: ["+40", "+120", "x2", "/2", "-80", "=0"],
  "zh-CN": ["+40", "+120", "x2", "/2", "-80", "=0"],
};

const scoreMaps = {
  [liveEventId]: buildLeaderboardRows(liveScores, true),
  [endedEventId]: buildLeaderboardRows(endedScores, true),
  [finalizedEventId]: buildLeaderboardRows(finalizedScores, true),
};

const spinHistories = {
  [liveEventId]: [
    { id: "spin-live-1", createdAt: "2026-03-11T11:10:00Z", segmentIndex: 0, segmentLabel: "+20", scoreDelta: 20, runningEventTotal: 4370, rewardType: "score", rewardValue: "20" },
    { id: "spin-live-2", createdAt: "2026-03-10T10:42:00Z", segmentIndex: 1, segmentLabel: "+80", scoreDelta: 80, runningEventTotal: 4350, rewardType: "score", rewardValue: "80" },
    { id: "spin-live-3", createdAt: "2026-03-09T09:35:00Z", segmentIndex: 0, segmentLabel: "+20", scoreDelta: 20, runningEventTotal: 4270, rewardType: "score", rewardValue: "20" },
    { id: "spin-live-4", createdAt: "2026-03-08T08:22:00Z", segmentIndex: 4, segmentLabel: "-50", scoreDelta: -50, runningEventTotal: 4250, rewardType: "score", rewardValue: "-50" },
    { id: "spin-live-5", createdAt: "2026-03-07T07:15:00Z", segmentIndex: 2, segmentLabel: "x2", scoreDelta: 2130, runningEventTotal: 4300, rewardType: "multiplier", rewardValue: "2" },
    { id: "spin-live-6", createdAt: "2026-03-06T05:50:00Z", segmentIndex: 3, segmentLabel: "/2", scoreDelta: -2130, runningEventTotal: 2170, rewardType: "divider", rewardValue: "2" },
  ],
  [endedEventId]: [
    { id: "spin-ended-1", createdAt: "2026-02-28T12:12:00Z", segmentIndex: 1, segmentLabel: "+120", scoreDelta: 120, runningEventTotal: 3600, rewardType: "score", rewardValue: "120" },
    { id: "spin-ended-2", createdAt: "2026-02-26T10:20:00Z", segmentIndex: 0, segmentLabel: "+40", scoreDelta: 40, runningEventTotal: 3480, rewardType: "score", rewardValue: "40" },
    { id: "spin-ended-3", createdAt: "2026-02-24T09:08:00Z", segmentIndex: 4, segmentLabel: "-80", scoreDelta: -80, runningEventTotal: 3440, rewardType: "score", rewardValue: "-80" },
    { id: "spin-ended-4", createdAt: "2026-02-21T06:40:00Z", segmentIndex: 0, segmentLabel: "+40", scoreDelta: 40, runningEventTotal: 3520, rewardType: "score", rewardValue: "40" },
    { id: "spin-ended-5", createdAt: "2026-02-18T04:15:00Z", segmentIndex: 1, segmentLabel: "+120", scoreDelta: 120, runningEventTotal: 3480, rewardType: "score", rewardValue: "120" },
    { id: "spin-ended-6", createdAt: "2026-02-15T03:05:00Z", segmentIndex: 4, segmentLabel: "-80", scoreDelta: -80, runningEventTotal: 3360, rewardType: "score", rewardValue: "-80" },
  ],
  [finalizedEventId]: [
    { id: "spin-final-1", createdAt: "2026-01-29T14:40:00Z", segmentIndex: 1, segmentLabel: "+60", scoreDelta: 60, runningEventTotal: 4040, rewardType: "score", rewardValue: "60" },
    { id: "spin-final-2", createdAt: "2026-01-27T11:12:00Z", segmentIndex: 0, segmentLabel: "+30", scoreDelta: 30, runningEventTotal: 3980, rewardType: "score", rewardValue: "30" },
    { id: "spin-final-3", createdAt: "2026-01-24T08:44:00Z", segmentIndex: 2, segmentLabel: "x2", scoreDelta: 1960, runningEventTotal: 3950, rewardType: "multiplier", rewardValue: "2" },
    { id: "spin-final-4", createdAt: "2026-01-20T07:31:00Z", segmentIndex: 3, segmentLabel: "/2", scoreDelta: -1950, runningEventTotal: 1990, rewardType: "divider", rewardValue: "2" },
    { id: "spin-final-5", createdAt: "2026-01-18T05:20:00Z", segmentIndex: 1, segmentLabel: "+60", scoreDelta: 60, runningEventTotal: 3940, rewardType: "score", rewardValue: "60" },
    { id: "spin-final-6", createdAt: "2026-01-15T04:05:00Z", segmentIndex: 4, segmentLabel: "-40", scoreDelta: -40, runningEventTotal: 3880, rewardType: "score", rewardValue: "-40" },
  ],
};

async function main() {
  await prisma.adminAuditLog.deleteMany();
  await prisma.spinRequestRecord.deleteMany();
  await prisma.spinTransaction.deleteMany();
  await prisma.playerEventSummary.deleteMany();
  await prisma.playerEventScore.deleteMany();
  await prisma.platformLinkLocalization.deleteMany();
  await prisma.eventPrizeLocalization.deleteMany();
  await prisma.wheelSegmentLocalization.deleteMany();
  await prisma.eventCampaignLocalization.deleteMany();
  await prisma.platformLink.deleteMany();
  await prisma.eventPrize.deleteMany();
  await prisma.wheelSegment.deleteMany();
  await prisma.eventCampaign.deleteMany();
  await prisma.player.deleteMany();

  await prisma.player.createMany({
    data: playerRoster.map((player) => ({
      id: player.id,
      externalUserId: player.id,
      displayName: player.displayName,
      status: "active",
    })),
  });

  for (const event of eventDefinitions) {
    await prisma.eventCampaign.create({
      data: {
        id: event.id,
        code: event.code,
        siteCode: "iBET",
        status: event.status,
        title: event.title,
        shortDescription: event.shortDescription,
        rulesContent: event.rulesContent,
        timezone: "GMT+8",
        styleTheme: "default",
        promotionPeriodLabel: event.promotionPeriodLabel,
        startAt: new Date(event.startAt),
        endAt: new Date(event.endAt),
        countdownEndsAt: new Date(event.countdownEndsAt),
        localizations: {
          create: createEventLocalizations(event.id),
        },
        wheelSegments: {
          create: createWheelSegments(event.id, event.wheelPrefix),
        },
        prizes: {
          create: createPrizes(event.id, event.prizeLabels),
        },
        platformLinks: {
          create: [
            {
              id: `${event.id}-deposit-link`,
              linkType: "deposit",
              label: "Go to Deposit",
              url: "https://merchant.example.com/deposit",
              displayOrder: 1,
              localizations: {
                create: createPlatformLinkLocalizations(event.id, "deposit"),
              },
            },
            {
              id: `${event.id}-support-link`,
              linkType: "customer_service",
              label: "Customer Service",
              url: "https://merchant.example.com/support",
              displayOrder: 2,
              localizations: {
                create: createPlatformLinkLocalizations(event.id, "customer_service"),
              },
            },
          ],
        },
      },
    });
  }

  await prisma.playerEventScore.createMany({
    data: Object.entries(scoreMaps).flatMap(([eventId, rows]) =>
      rows.map((row) => ({
        id: `score-${eventId}-${row.id}`,
        eventCampaignId: eventId,
        playerId: row.id,
        totalScore: row.totalScore,
        hasSpun: row.hasSpun,
      })),
    ),
  });

  await prisma.spinTransaction.createMany({
    data: Object.entries(spinHistories).flatMap(([eventId, rows]) =>
      rows.map((row) => ({
        id: row.id,
        eventCampaignId: eventId,
        playerId: currentPlayerId,
        segmentIndex: row.segmentIndex,
        segmentLabel: row.segmentLabel,
        scoreDelta: row.scoreDelta,
        runningEventTotal: row.runningEventTotal,
        rewardType: row.rewardType,
        rewardValue: row.rewardValue,
        createdAt: new Date(row.createdAt),
      })),
    ),
  });

  await prisma.playerEventSummary.createMany({
    data: [
      {
        id: "summary-february-player-demo",
        eventCampaignId: endedEventId,
        playerId: currentPlayerId,
        finalScore: 3600,
        finalRank: 31,
        prizeName: null,
        endedAt: new Date("2026-02-28T15:59:59Z"),
      },
      {
        id: "summary-january-player-demo",
        eventCampaignId: finalizedEventId,
        playerId: currentPlayerId,
        finalScore: 4040,
        finalRank: 24,
        prizeName: "RM 28",
        endedAt: new Date("2026-01-31T15:59:59Z"),
      },
    ],
  });

  await prisma.adminAuditLog.createMany({
    data: [
      {
        id: "audit-seed-live-publish",
        eventCampaignId: liveEventId,
        action: "publish",
        entityType: "event_campaign",
        entityId: liveEventId,
        summary: "Published March Lucky Wheel for live traffic.",
      },
      {
        id: "audit-seed-scheduled-update",
        eventCampaignId: scheduledEventId,
        action: "update",
        entityType: "event_campaign",
        entityId: scheduledEventId,
        summary: "Adjusted April scheduled event before launch.",
      },
      {
        id: "audit-seed-ended-close",
        eventCampaignId: endedEventId,
        action: "auto_transition",
        entityType: "event_campaign",
        entityId: endedEventId,
        summary: "Lifecycle sync moved February event to ended.",
      },
      {
        id: "audit-seed-finalized-finalize",
        eventCampaignId: finalizedEventId,
        action: "finalize",
        entityType: "event_campaign",
        entityId: finalizedEventId,
        summary: "Finalized January event and archived ranking snapshot.",
      },
    ],
  });
}

function buildLeaderboardRows(scores, hasSpun) {
  return playerRoster.map((player, index) => ({
    id: player.id,
    totalScore: scores[index],
    hasSpun: player.id === currentPlayerId ? hasSpun : true,
  }));
}

function createWheelSegments(eventId, prefix) {
  const definitions = [
    { label: "+40", operator: "add", operand: 40, weight: 20, rewardType: "score", rewardValue: "40" },
    { label: "+120", operator: "add", operand: 120, weight: 16, rewardType: "score", rewardValue: "120" },
    { label: "x2", operator: "multiply", operand: 2, weight: 16, rewardType: "multiplier", rewardValue: "2" },
    { label: "/2", operator: "divide", operand: 2, weight: 14, rewardType: "divider", rewardValue: "2" },
    { label: "-80", operator: "subtract", operand: 80, weight: 14, rewardType: "score", rewardValue: "-80" },
    { label: "=0", operator: "equals", operand: 0, weight: 20, rewardType: "reset", rewardValue: "0" },
  ];

  return definitions.map((segment, index) => ({
    id: `${eventId}-segment-${index}`,
    segmentIndex: index,
    label: segment.label,
    scoreOperator: segment.operator,
    scoreOperand: segment.operand,
    weightPercent: segment.weight,
    displayAssetKey: `${prefix}-segment-${index}`,
    rewardType: segment.rewardType,
    rewardValue: segment.rewardValue,
    localizations: {
      create: supportedLocales.map((locale) => ({
        id: `${eventId}-segment-${index}-${locale}`,
        locale,
        label: localizedWheelSegmentLabels[locale][index],
      })),
    },
  }));
}

function createPrizes(eventId, labels) {
  return prizeTiers.map((tier, index) => ({
    id: `${eventId}-prize-${index + 1}`,
    rankFrom: tier.rankFrom,
    rankTo: tier.rankTo,
    prizeLabel: labels[index],
    prizeDescription: tier.prizeDescription,
    imageUrl: null,
    accentLabel: tier.accentLabel,
    displayOrder: index + 1,
    localizations: {
      create: createPrizeLocalizations(eventId, index),
    },
  }));
}

function createEventLocalizations(eventId) {
  return supportedLocales.map((locale) => ({
    id: `${eventId}-${locale}`,
    locale,
    ...localizedEventContent[eventId][locale],
  }));
}

function createPrizeLocalizations(eventId, index) {
  return supportedLocales.map((locale) => ({
    id: `${eventId}-prize-${index + 1}-${locale}`,
    locale,
    ...localizedPrizeContent[eventId][locale][index],
  }));
}

function createPlatformLinkLocalizations(eventId, linkType) {
  return supportedLocales.map((locale) => ({
    id: `${eventId}-${linkType}-${locale}`,
    locale,
    label: localizedPlatformLinks[locale][linkType],
  }));
}

function buildPrizeLocaleMap(labels) {
  return {
    en: prizeTiers.map((tier, index) => ({
      prizeLabel: labels[index],
      prizeDescription: tier.prizeDescription,
      accentLabel: tier.accentLabel,
    })),
    ms: [
      {
        prizeLabel: labels[0],
        prizeDescription: "Ganjaran tunai utama acara.",
        accentLabel: "Juara",
      },
      {
        prizeLabel: labels[1],
        prizeDescription: "Ganjaran tempat kedua.",
        accentLabel: "Naib Juara",
      },
      {
        prizeLabel: labels[2],
        prizeDescription: "Ganjaran tempat ketiga.",
        accentLabel: "Tempat Ketiga",
      },
      {
        prizeLabel: labels[3],
        prizeDescription: "Ganjaran penamat elit.",
        accentLabel: "Top 10",
      },
      {
        prizeLabel: labels[4],
        prizeDescription: "Ganjaran penamat carta.",
        accentLabel: "Top 30",
      },
    ],
    "zh-CN": [
      {
        prizeLabel: labels[0],
        prizeDescription: "活动冠军现金奖励。",
        accentLabel: "冠军",
      },
      {
        prizeLabel: labels[1],
        prizeDescription: "活动亚军奖励。",
        accentLabel: "亚军",
      },
      {
        prizeLabel: labels[2],
        prizeDescription: "活动季军奖励。",
        accentLabel: "季军",
      },
      {
        prizeLabel: labels[3],
        prizeDescription: "精英排名奖励。",
        accentLabel: "前十",
      },
      {
        prizeLabel: labels[4],
        prizeDescription: "排行榜完赛奖励。",
        accentLabel: "前三十",
      },
    ],
  };
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
