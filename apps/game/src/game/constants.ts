export const STAGE_WIDTH = 1080;
export const STAGE_HEIGHT = 1920;

export const COLORS = {
  pageTop: 0x071f34,
  pageBottom: 0x0d4e78,
  stageMist: 0x84d8ff,
  panel: 0xf7fbff,
  panelSoft: 0xe8f6ff,
  line: 0x97ddff,
  ink: 0x0a2942,
  muted: 0x5c7f9a,
  primary: 0x16b4ff,
  primaryDark: 0x1183c7,
  accent: 0xffc455,
  accentSoft: 0xfff2cf,
  danger: 0xff7c7c,
  disabled: 0x9ab7c8,
  overlay: 0x02101d,
  white: 0xffffff,
};

export const FONTS = {
  display: "Trebuchet MS",
  body: "Segoe UI",
};

export const SCENE_KEYS = {
  Boot: "BootScene",
  Preload: "PreloadScene",
  Lobby: "LobbyScene",
  Wheel: "WheelScene",
  LocaleOverlay: "LocaleOverlayScene",
  PeriodOverlay: "PeriodOverlayScene",
  LeaderboardOverlay: "LeaderboardOverlayScene",
  PrizeOverlay: "PrizeOverlayScene",
  RulesOverlay: "RulesOverlayScene",
  HistoryOverlay: "HistoryOverlayScene",
  ResultPopup: "ResultPopupScene",
  ErrorOverlay: "ErrorOverlayScene",
} as const;

export const DEV_ELIGIBILITY_OPTIONS = [
  { label: "Auto", value: undefined },
  { label: "Playable", value: "PLAYABLE_NOW" },
  { label: "Already Spin", value: "ALREADY_SPIN" },
  { label: "Deposit", value: "GO_TO_DEPOSIT" },
  { label: "Ended", value: "EVENT_ENDED" },
] as const;

export function shouldShowDevEligibilitySwitch() {
  return new URL(window.location.href).searchParams.get("dev") === "1";
}
