import type { GameLayout } from "../runtimeEnvironment";

const STAGE_DIMENSIONS = {
  mobile: {
    width: 1080,
    height: 1920,
  },
  desktop: {
    width: 1920,
    height: 1080,
  },
} as const;

export let ACTIVE_GAME_LAYOUT: GameLayout = "mobile";
export let STAGE_WIDTH: number = STAGE_DIMENSIONS.mobile.width;
export let STAGE_HEIGHT: number = STAGE_DIMENSIONS.mobile.height;

export const COLORS = {
  pageTop: 0xfefefe,
  pageBottom: 0xcff3ff,
  stageMist: 0x79dcff,
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
  display: '"Roboto", "Segoe UI", sans-serif',
  body: '"Roboto", "Segoe UI", sans-serif',
  displayName: "Roboto",
  bodyName: "Roboto",
};

export const SCENE_KEYS = {
  Boot: "BootScene",
  Preload: "PreloadScene",
  Lobby: "LobbyScene",
  Wheel: "WheelScene",
  DesktopMain: "DesktopMainScene",
  DesktopRanking: "DesktopRankingScene",
  DesktopPrize: "DesktopPrizeScene",
  DesktopWheel: "DesktopWheelScene",
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

function resolveMobileStageHeight() {
  if (typeof window === "undefined") {
    return STAGE_DIMENSIONS.mobile.height;
  }

  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

  if (!viewportWidth || !viewportHeight) {
    return STAGE_DIMENSIONS.mobile.height;
  }

  const resolvedHeight = Math.round((STAGE_DIMENSIONS.mobile.width * viewportHeight) / viewportWidth);
  return Math.max(STAGE_DIMENSIONS.mobile.height, resolvedHeight);
}

export function shouldShowDevEligibilitySwitch() {
  return new URL(window.location.href).searchParams.get("dev") === "1";
}

export function configureStageLayout(layout: GameLayout) {
  ACTIVE_GAME_LAYOUT = layout;
  STAGE_WIDTH = STAGE_DIMENSIONS[layout].width;
  STAGE_HEIGHT =
    layout === "mobile" ? resolveMobileStageHeight() : STAGE_DIMENSIONS.desktop.height;
}

export function isDesktopLayout() {
  return ACTIVE_GAME_LAYOUT === "desktop";
}

/** Backdrop ring outer width in mobile layout; keep in sync with WheelScene `WHEEL_*` constants. */
export const MOBILE_WHEEL_BACKDROP_DIAMETER = 972 * 0.86 * 1.05;
