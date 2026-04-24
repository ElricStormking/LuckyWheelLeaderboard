import type { AppLocale } from "@lucky-wheel/contracts";

export const FALLBACK_LOCALE: AppLocale = "en";
const ACCESS_TOKEN_STORAGE_KEY = "luckyWheel.accessToken";

type CopyKey =
  | "lobby.selectPeriod"
  | "lobby.loadingLiveEvent"
  | "lobby.heroFallbackTitle"
  | "lobby.heroFallbackSubtitle"
  | "lobby.stepDepositTitle"
  | "lobby.stepDepositCopy"
  | "lobby.stepSpinTitle"
  | "lobby.stepSpinCopy"
  | "lobby.stepRankTitle"
  | "lobby.stepRankCopy"
  | "lobby.phaseSlice"
  | "lobby.checkingEligibility"
  | "lobby.chipTop30"
  | "lobby.chipWheel"
  | "lobby.chipPlaceholder"
  | "lobby.myTotalPoints"
  | "lobby.rankLine"
  | "lobby.rankEmpty"
  | "lobby.noPrizeYet"
  | "lobby.archiveSnapshot"
  | "lobby.resultsPending"
  | "lobby.loadingPayload"
  | "lobby.eligibilityLine"
  | "lobby.leaderboard"
  | "lobby.prizes"
  | "lobby.rules"
  | "lobby.history"
  | "lobby.deposit"
  | "lobby.support"
  | "lobby.devSwitch"
  | "lobby.feed.connected"
  | "lobby.feed.connecting"
  | "lobby.feed.error"
  | "lobby.feed.idle"
  | "leaderboard.liveTitle"
  | "leaderboard.desktopLiveTitle"
  | "leaderboard.archiveTitle"
  | "leaderboard.desktopArchiveTitle"
  | "leaderboard.liveSubtitle"
  | "leaderboard.archiveSubtitle"
  | "leaderboard.pendingTitle"
  | "leaderboard.pendingSubtitle"
  | "leaderboard.sectionSubtitle"
  | "leaderboard.columnRank"
  | "leaderboard.columnUsername"
  | "leaderboard.columnTotalPoints"
  | "leaderboard.myRank"
  | "leaderboard.lastSynced"
  | "leaderboard.nextRefreshIn"
  | "period.title"
  | "period.subtitle"
  | "period.selected"
  | "period.live"
  | "period.ended"
  | "period.finalized"
  | "prize.title"
  | "prize.sectionSubtitle"
  | "prize.liveSubtitle"
  | "prize.archiveSubtitle"
  | "prize.defaultAccent"
  | "rules.title"
  | "rules.loading"
  | "rules.subtitle"
  | "history.title"
  | "history.spinsSubtitle"
  | "history.eventsSubtitle"
  | "history.spinTab"
  | "history.eventTab"
  | "history.noSpins"
  | "history.noEvents"
  | "history.finalRank"
  | "history.noPrize"
  | "history.prev"
  | "history.next"
  | "history.page"
  | "history.date"
  | "history.points"
  | "history.totalPoints"
  | "result.title"
  | "result.subtitle"
  | "result.segment"
  | "result.newTotal"
  | "result.rank"
  | "result.continue"
  | "error.title"
  | "error.subtitle"
  | "error.unknown"
  | "error.dismiss"
  | "sessionExpired.title"
  | "sessionExpired.subtitle"
  | "sessionExpired.body"
  | "sessionExpired.ok"
  | "locale.title"
  | "locale.subtitle"
  | "locale.current";

const COPY: Record<AppLocale, Partial<Record<CopyKey, string>>> = {
  en: {
    "lobby.selectPeriod": "Select Period",
    "lobby.loadingLiveEvent": "Loading live event...",
    "lobby.heroFallbackTitle": "iBET Lucky Wheel",
    "lobby.heroFallbackSubtitle": "Server-driven spins for a Top 30 casino event.",
    "lobby.stepDepositTitle": "Deposit",
    "lobby.stepDepositCopy": "RM50 Daily",
    "lobby.stepSpinTitle": "Spin &",
    "lobby.stepSpinCopy": "Earn Points",
    "lobby.stepRankTitle": "Rank Up &",
    "lobby.stepRankCopy": "Win Prizes!",
    "lobby.phaseSlice": "Phase 4 Localization Slice",
    "lobby.checkingEligibility": "Checking eligibility...",
    "lobby.chipTop30": "Top 30 cash prizes",
    "lobby.chipWheel": "Fixed 6-segment wheel",
    "lobby.chipPlaceholder": "Placeholder graphics ready for replacement",
    "lobby.myTotalPoints": "My Total Points",
    "lobby.rankLine": "Rank {rank} - {prize}",
    "lobby.rankEmpty": "Rank -",
    "lobby.noPrizeYet": "No prize yet",
    "lobby.archiveSnapshot": "Archive snapshot",
    "lobby.resultsPending": "Results pending finalization",
    "lobby.loadingPayload": "Loading event payload...",
    "lobby.eligibilityLine": "{buttonLabel} - {remaining}/{granted} daily spins left",
    "lobby.leaderboard": "Leaderboard",
    "lobby.prizes": "Prizes",
    "lobby.rules": "Rules",
    "lobby.history": "History",
    "lobby.deposit": "Deposit",
    "lobby.support": "Support",
    "lobby.devSwitch": "Dev Eligibility Switch",
    "lobby.feed.connected": "Live feed on",
    "lobby.feed.connecting": "Connecting feed",
    "lobby.feed.error": "Reconnecting",
    "lobby.feed.idle": "Feed idle",
    "leaderboard.liveTitle": "Top 30 Leaderboard",
    "leaderboard.desktopLiveTitle": "Current Top 30 Leaderboard",
    "leaderboard.archiveTitle": "Final Top 30 Snapshot",
    "leaderboard.desktopArchiveTitle": "Final Top 30 Snapshot",
    "leaderboard.liveSubtitle": "Realtime leaderboard feed for the selected live event.",
    "leaderboard.archiveSubtitle": "Read-only archived ranking for the selected period.",
    "leaderboard.pendingTitle": "Event Result Pending",
    "leaderboard.pendingSubtitle":
      "Final event rankings are hidden until the calculation window completes.",
    "leaderboard.sectionSubtitle": "Check your rank and see who's leading the competition.",
    "leaderboard.columnRank": "Rank",
    "leaderboard.columnUsername": "Username",
    "leaderboard.columnTotalPoints": "Total Points",
    "leaderboard.myRank": "My Rank",
    "leaderboard.lastSynced": "Last synced: {value}",
    "leaderboard.nextRefreshIn": "Next refresh in: {value}",
    "period.title": "Event Periods",
    "period.subtitle":
      "Live event first. Ended periods stay viewable, but final results appear after settlement.",
    "period.selected": "SELECTED",
    "period.live": "LIVE NOW",
    "period.ended": "ENDED",
    "period.finalized": "FINALIZED",
    "prize.title": "Prize Area",
    "prize.sectionSubtitle": "Climb the ranks & earn bigger Cash Rewards!",
    "prize.liveSubtitle": "Current event reward tiers mapped to the live Top 30.",
    "prize.archiveSubtitle": "Archived prize tiers for the selected event period.",
    "prize.defaultAccent": "Prize Tier",
    "rules.title": "《Terms and conditions》",
    "rules.loading": "Loading rules...",
    "rules.subtitle": "{title} rules loaded from the selected period.",
    "history.title": "History",
    "history.spinsSubtitle": "Selected event: {title}",
    "history.eventsSubtitle": "Archived event summaries for this player profile.",
    "history.spinTab": "Spin History",
    "history.eventTab": "Event History",
    "history.noSpins": "No spins recorded for this event yet.",
    "history.noEvents": "No archived events available yet.",
    "history.finalRank": "Final Rank: {rank}",
    "history.noPrize": "No prize",
    "history.prev": "Prev",
    "history.next": "Next",
    "history.page": "Page {page} / {totalPages}",
    "history.date": "Date",
    "history.points": "Points",
    "history.totalPoints": "Total Points",
    "result.title": "Spin Resolved",
    "result.subtitle": "Animation finished on the server-returned segment.",
    "result.segment": "Segment {index}",
    "result.newTotal": "New Total {total}",
    "result.rank": "Rank {rank}",
    "result.continue": "Continue",
    "error.title": "Connection Issue",
    "error.subtitle": "Retry the current prototype flow.",
    "error.unknown": "Unknown prototype error.",
    "error.dismiss": "Dismiss",
    "sessionExpired.title": "Session expired",
    "sessionExpired.subtitle": "Please reopen the game from the website.",
    "sessionExpired.body":
      "Your play session has timed out. Return to the casino site and launch Lucky Wheel again to continue.",
    "sessionExpired.ok": "OK",
    "locale.title": "Language",
    "locale.subtitle": "Choose the display language for the current play session.",
    "locale.current": "CURRENT",
  },
  ms: {
    "lobby.selectPeriod": "Pilih Tempoh",
    "lobby.loadingLiveEvent": "Memuat acara langsung...",
    "lobby.heroFallbackTitle": "iBET Roda Tuah",
    "lobby.heroFallbackSubtitle": "Putaran berasaskan pelayan untuk acara kasino Top 30.",
    "lobby.stepDepositTitle": "Deposit",
    "lobby.stepDepositCopy": "RM50 Harian",
    "lobby.stepSpinTitle": "Putar &",
    "lobby.stepSpinCopy": "Kumpul Mata",
    "lobby.stepRankTitle": "Naik Rank &",
    "lobby.stepRankCopy": "Menang Hadiah!",
    "lobby.phaseSlice": "Fasa 4 Penyelarasan Bahasa",
    "lobby.checkingEligibility": "Menyemak kelayakan...",
    "lobby.chipTop30": "Hadiah tunai Top 30",
    "lobby.chipWheel": "Roda tetap 6 segmen",
    "lobby.chipPlaceholder": "Grafik sementara sedia diganti",
    "lobby.myTotalPoints": "Jumlah Mata Saya",
    "lobby.rankLine": "Rank {rank} - {prize}",
    "lobby.rankEmpty": "Rank -",
    "lobby.noPrizeYet": "Belum ada hadiah",
    "lobby.archiveSnapshot": "Paparan arkib",
    "lobby.resultsPending": "Keputusan sedang menunggu pemuktamadan",
    "lobby.loadingPayload": "Memuat data acara...",
    "lobby.eligibilityLine": "{buttonLabel} - baki {remaining}/{granted} putaran harian",
    "lobby.leaderboard": "Papan Kedudukan",
    "lobby.prizes": "Hadiah",
    "lobby.rules": "Peraturan",
    "lobby.history": "Sejarah",
    "lobby.deposit": "Deposit",
    "lobby.support": "Sokongan",
    "lobby.devSwitch": "Suis Kelayakan Dev",
    "lobby.feed.connected": "Suapan langsung aktif",
    "lobby.feed.connecting": "Menyambung suapan",
    "lobby.feed.error": "Menyambung semula",
    "lobby.feed.idle": "Suapan idle",
    "leaderboard.liveTitle": "Papan Kedudukan Top 30",
    "leaderboard.desktopLiveTitle": "Papan Kedudukan Top 30 Semasa",
    "leaderboard.archiveTitle": "Snapshot Akhir Top 30",
    "leaderboard.desktopArchiveTitle": "Snapshot Akhir Top 30",
    "leaderboard.liveSubtitle": "Suapan ranking masa nyata untuk acara langsung terpilih.",
    "leaderboard.archiveSubtitle": "Ranking arkib baca sahaja untuk tempoh terpilih.",
    "leaderboard.pendingTitle": "Keputusan Acara Belum Sedia",
    "leaderboard.pendingSubtitle":
      "Ranking akhir acara disembunyikan sehingga tempoh pengiraan selesai.",
    "leaderboard.sectionSubtitle": "Semak rank anda dan lihat siapa yang mendahului pertandingan.",
    "leaderboard.columnRank": "Rank",
    "leaderboard.columnUsername": "Username",
    "leaderboard.columnTotalPoints": "Jumlah Mata",
    "leaderboard.myRank": "Rank Saya",
    "leaderboard.lastSynced": "Penyegerakan terakhir: {value}",
    "leaderboard.nextRefreshIn": "Segar semula seterusnya dalam: {value}",
    "period.title": "Tempoh Acara",
    "period.subtitle":
      "Acara langsung di atas. Tempoh tamat masih boleh dilihat, tetapi keputusan akhir hanya muncul selepas penyelesaian.",
    "period.selected": "DIPILIH",
    "period.live": "LANGSUNG",
    "period.ended": "TAMAT",
    "period.finalized": "DIMUKTAMADKAN",
    "prize.title": "Zon Hadiah",
    "prize.sectionSubtitle": "Naiki ranking dan rebut ganjaran tunai yang lebih besar!",
    "prize.liveSubtitle": "Tier ganjaran semasa dipetakan kepada Top 30 acara langsung.",
    "prize.archiveSubtitle": "Tier hadiah arkib untuk tempoh acara terpilih.",
    "prize.defaultAccent": "Tier Hadiah",
    "rules.title": "《Terma dan Syarat》",
    "rules.loading": "Memuat peraturan...",
    "rules.subtitle": "Peraturan {title} dimuatkan daripada tempoh terpilih.",
    "history.title": "Sejarah",
    "history.spinsSubtitle": "Acara dipilih: {title}",
    "history.eventsSubtitle": "Ringkasan acara arkib untuk profil pemain ini.",
    "history.spinTab": "Sejarah Putaran",
    "history.eventTab": "Sejarah Acara",
    "history.noSpins": "Belum ada rekod putaran untuk acara ini.",
    "history.noEvents": "Belum ada acara arkib tersedia.",
    "history.finalRank": "Rank Akhir: {rank}",
    "history.noPrize": "Tiada hadiah",
    "history.prev": "Sebelum",
    "history.next": "Seterusnya",
    "history.page": "Halaman {page} / {totalPages}",
    "history.date": "Tarikh",
    "history.points": "Mata",
    "history.totalPoints": "Jumlah Mata",
    "result.title": "Putaran Selesai",
    "result.subtitle": "Animasi berhenti pada segmen yang dipulangkan pelayan.",
    "result.segment": "Segmen {index}",
    "result.newTotal": "Jumlah Baharu {total}",
    "result.rank": "Rank {rank}",
    "result.continue": "Teruskan",
    "error.title": "Isu Sambungan",
    "error.subtitle": "Cuba semula aliran prototaip semasa.",
    "error.unknown": "Ralat prototaip tidak diketahui.",
    "error.dismiss": "Tutup",
    "sessionExpired.title": "Sesi tamat",
    "sessionExpired.subtitle": "Sila buka semula permainan dari laman web.",
    "sessionExpired.body":
      "Sesi permainan anda telah tamat masa. Kembali ke laman kasino dan lancarkan Roda Tuah sekali lagi untuk meneruskan.",
    "sessionExpired.ok": "OK",
    "locale.title": "Bahasa",
    "locale.subtitle": "Pilih bahasa paparan untuk sesi permainan semasa.",
    "locale.current": "SEMASA",
  },
  "zh-CN": {
    "lobby.selectPeriod": "选择期数",
    "lobby.loadingLiveEvent": "正在加载当前活动...",
    "lobby.heroFallbackTitle": "iBET 幸运转盘",
    "lobby.heroFallbackSubtitle": "面向前 30 排名活动的服务器权威转动。",
    "lobby.stepDepositTitle": "充值",
    "lobby.stepDepositCopy": "每日 RM50",
    "lobby.stepSpinTitle": "转动并",
    "lobby.stepSpinCopy": "获取积分",
    "lobby.stepRankTitle": "冲榜并",
    "lobby.stepRankCopy": "赢取奖励！",
    "lobby.phaseSlice": "第 4 阶段本地化切片",
    "lobby.checkingEligibility": "正在检查资格...",
    "lobby.chipTop30": "前 30 现金奖励",
    "lobby.chipWheel": "固定 6 扇区转盘",
    "lobby.chipPlaceholder": "占位图已预留替换位",
    "lobby.myTotalPoints": "我的总积分",
    "lobby.rankLine": "排名 {rank} - {prize}",
    "lobby.rankEmpty": "排名 -",
    "lobby.noPrizeYet": "暂无奖励",
    "lobby.archiveSnapshot": "归档快照",
    "lobby.resultsPending": "结果等待最终结算",
    "lobby.loadingPayload": "正在加载活动数据...",
    "lobby.eligibilityLine": "{buttonLabel} - 剩余 {remaining}/{granted} 次转动",
    "lobby.leaderboard": "排行榜",
    "lobby.prizes": "奖励",
    "lobby.rules": "规则",
    "lobby.history": "历史",
    "lobby.deposit": "充值",
    "lobby.support": "客服",
    "lobby.devSwitch": "开发资格切换",
    "lobby.feed.connected": "实时连接中",
    "lobby.feed.connecting": "正在连接",
    "lobby.feed.error": "重新连接中",
    "lobby.feed.idle": "实时待机",
    "leaderboard.liveTitle": "前 30 排行榜",
    "leaderboard.desktopLiveTitle": "当前前 30 排行榜",
    "leaderboard.archiveTitle": "最终前 30 快照",
    "leaderboard.desktopArchiveTitle": "最终前 30 快照",
    "leaderboard.liveSubtitle": "所选当前活动的实时排行榜。",
    "leaderboard.archiveSubtitle": "所选期数的只读归档排名。",
    "leaderboard.pendingTitle": "活动结果待公布",
    "leaderboard.pendingSubtitle": "最终活动排名会在计算窗口结束后显示。",
    "leaderboard.sectionSubtitle": "查看你的排名，看看谁正领先这场竞赛。",
    "leaderboard.columnRank": "排名",
    "leaderboard.columnUsername": "用户名",
    "leaderboard.columnTotalPoints": "总积分",
    "leaderboard.myRank": "我的排名",
    "leaderboard.lastSynced": "最后同步：{value}",
    "period.title": "活动期数",
    "period.subtitle": "当前活动优先显示，已结束期数仍可查看，但最终结果会在结算后显示。",
    "period.selected": "已选择",
    "period.live": "进行中",
    "period.ended": "已结束",
    "period.finalized": "已结算",
    "prize.title": "奖励区",
    "prize.liveSubtitle": "当前活动奖励档位对应实时前 30 名。",
    "prize.archiveSubtitle": "所选活动期数的归档奖励档位。",
    "prize.defaultAccent": "奖励档位",
    "rules.title": "《条款与规则》",
    "rules.loading": "正在加载规则...",
    "rules.subtitle": "已载入所选期数的 {title} 规则。",
    "history.title": "历史",
    "history.spinsSubtitle": "当前选择活动：{title}",
    "history.eventsSubtitle": "该玩家档案的归档活动汇总。",
    "history.spinTab": "转动历史",
    "history.eventTab": "活动历史",
    "history.noSpins": "该活动暂无转动记录。",
    "history.noEvents": "暂无可查看的归档活动。",
    "history.finalRank": "最终排名：{rank}",
    "history.noPrize": "无奖励",
    "history.prev": "上一页",
    "history.next": "下一页",
    "history.page": "第 {page} / {totalPages} 页",
    "result.title": "转动完成",
    "result.subtitle": "动画已停在服务器返回的扇区上。",
    "result.segment": "扇区 {index}",
    "result.newTotal": "新总分 {total}",
    "result.rank": "排名 {rank}",
    "result.continue": "继续",
    "error.title": "连接异常",
    "error.subtitle": "请重试当前原型流程。",
    "error.unknown": "未知原型错误。",
    "error.dismiss": "关闭",
    "sessionExpired.title": "会话已过期",
    "sessionExpired.subtitle": "请从网站重新打开游戏。",
    "sessionExpired.body":
      "您的游戏会话已超时。请返回娱乐城网站并重新启动幸运转盘以继续。",
    "sessionExpired.ok": "确定",
    "locale.title": "语言",
    "locale.subtitle": "为当前试玩会话选择显示语言。",
    "locale.current": "当前",
  },
};

export function translate(
  locale: AppLocale,
  key: CopyKey,
  params: Record<string, string | number> = {},
) {
  const template = COPY[locale][key] ?? COPY[FALLBACK_LOCALE][key] ?? key;
  return Object.entries(params).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

export function resolveLaunchLocale() {
  const url = new URL(window.location.href);
  const candidate =
    url.searchParams.get("lang") ??
    url.searchParams.get("locale") ??
    window.localStorage.getItem("luckyWheel.locale") ??
    window.navigator.language;

  return normalizeLocale(candidate);
}

export function resolveLaunchAccessToken() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("accessToken") ?? undefined;

  if (token) {
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return token;
  }

  window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  return undefined;
}

export function persistLocale(locale: AppLocale) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", locale);
  window.history.replaceState({}, "", url);
  window.localStorage.setItem("luckyWheel.locale", locale);
}

export function toIntlLocale(locale: AppLocale) {
  switch (locale) {
    case "ms":
      return "ms-MY";
    case "zh-CN":
      return "zh-CN";
    case "en":
    default:
      return "en-US";
  }
}

export function normalizeLocale(value?: string | null): AppLocale {
  if (!value) {
    return FALLBACK_LOCALE;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }
  if (normalized.startsWith("ms")) {
    return "ms";
  }
  return "en";
}
