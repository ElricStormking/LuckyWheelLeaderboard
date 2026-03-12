export const DEMO_PLAYER_ID = "player_demo_001";
export const DEMO_PLAYER_NAME = "AceNova";
export const EVENT_PAGE_SIZE = 6;
export const HISTORY_PAGE_SIZE = 6;
export const LEADERBOARD_SYNC_INTERVAL_MS = 30 * 60 * 1000;

export const HERO_STEPS = [
  {
    title: "Deposit Daily",
    subtitle: "RM50 unlocks today's shot.",
    iconKey: "deposit",
  },
  {
    title: "Spin & Score",
    subtitle: "Merchant API returns spin quota, the server resolves results.",
    iconKey: "spin",
  },
  {
    title: "Rank Up",
    subtitle: "Finish Top 30 for cash rewards.",
    iconKey: "rank",
  },
] as const;
