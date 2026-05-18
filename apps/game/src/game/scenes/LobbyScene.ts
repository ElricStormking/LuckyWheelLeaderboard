import Phaser from "phaser";
import { EventStatus, type EligibilityStatus, PlatformLinkType } from "@lucky-wheel/contracts";
import { prototypeState } from "../state/prototype-state";
import type { WheelScene } from "./WheelScene";
import {
  COLORS,
  DEV_ELIGIBILITY_OPTIONS,
  FONTS,
  SCENE_KEYS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  MOBILE_WHEEL_BACKDROP_DIAMETER,
  MOBILE_LOBBY_CONTENT_DROP_PX,
  shouldShowDevEligibilitySwitch,
} from "../constants";
import {
  addPill,
  addRoundedPanel,
  formatCountdownDuration,
  formatDate,
  formatDateWithGmtOffset,
  formatEventSelectorPillLabel,
  formatNumber,
  getNextLeaderboardRefreshRemainingMs,
  maskLeaderboardPlayerName,
  openExternalLink,
} from "../helpers";
import { syncPrizeArtImage } from "../prizeImageLoader";

type ActivityBubble = {
  container: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  width: number;
  delayRemaining: number;
  progress: number;
  duration: number;
  startX: number;
  startY: number;
  endY: number;
  startScale: number;
  endScale: number;
};

type DevControl = {
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  value?: EligibilityStatus;
};

type InlineLeaderboardRow = {
  highlightArrow: Phaser.GameObjects.Graphics;
  plate: Phaser.GameObjects.Image;
  playerText: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  prizeText: Phaser.GameObjects.Text;
};

type PrizeSectionRow = {
  rankBadge: Phaser.GameObjects.Image;
  rewardZone: Phaser.GameObjects.Image;
  prizeArt: Phaser.GameObjects.Image;
  prizeLabel: Phaser.GameObjects.Text;
  prizeDescription: Phaser.GameObjects.Text;
};

type PageTab = {
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Rectangle;
};

type MobileEventPickerEntry = {
  id: string;
  title: string;
  promotionPeriodLabel: string;
  status: EventStatus;
};

type SectionBand = {
  container: Phaser.GameObjects.Container;
  top: number;
  bottom: number;
  overscan: number;
};

const CONTENT_HEIGHT = 7776 + MOBILE_LOBBY_CONTENT_DROP_PX;
const LEADERBOARD_PAGE_SIZE = 10;
const LEADERBOARD_TOP_GAP_BELOW_QUICK = 100;
const LEADERBOARD_ROW_PITCH = 150;
const LEADERBOARD_HEADER_BLOCK_SHIFT = 64;
const PREV_LEADERBOARD_LAST_ROW_BASE_Y = 3678 + MOBILE_LOBBY_CONTENT_DROP_PX;
const LEADERBOARD_ROW_YS: number[] = (() => {
  const first =
    2560 + LEADERBOARD_TOP_GAP_BELOW_QUICK + LEADERBOARD_HEADER_BLOCK_SHIFT + MOBILE_LOBBY_CONTENT_DROP_PX;
  return Array.from({ length: 10 }, (_, i) => first + i * LEADERBOARD_ROW_PITCH);
})();
const LEADERBOARD_LIST_HEIGHT_DELTA = LEADERBOARD_ROW_YS[9] - PREV_LEADERBOARD_LAST_ROW_BASE_Y;
const INLINE_LEADERBOARD_TITLE_SCALE = 0.88;
const INLINE_LEADERBOARD_HEADER_PANEL_Y =
  2498 + LEADERBOARD_TOP_GAP_BELOW_QUICK + 64 + MOBILE_LOBBY_CONTENT_DROP_PX;
const INLINE_LEADERBOARD_COLUMN_LABEL_Y = INLINE_LEADERBOARD_HEADER_PANEL_Y + 1;
/** ~half line height of column header labels (26px) for top-edge Y. */
const INLINE_LEADERBOARD_COLUMN_HEADER_TEXT_HALF = 16;
const INLINE_LEADERBOARD_SUBTITLE_INNER_PAD = 4;
const INLINE_LEADERBOARD_HEADER_UNDERLINE_Y = INLINE_LEADERBOARD_HEADER_PANEL_Y + 22;
const INLINE_LEADERBOARD_ROW_OFFSET_Y = 60;
const INLINE_LEADERBOARD_PLATE_SCALE = 0.32;
const INLINE_LEADERBOARD_SELF_PLATE_SCALE = 0.34;
const INLINE_LEADERBOARD_LAYOUT_OFFSET_X = -29;
const INLINE_LEADERBOARD_PLATE_BASE_X = 404;
const INLINE_LEADERBOARD_RANK_COLUMN_X = 190;
const INLINE_LEADERBOARD_USERNAME_COLUMN_X = 404;
const INLINE_LEADERBOARD_TOTAL_HEADER_X = 601;
const INLINE_LEADERBOARD_PRIZE_TEXT_X = 194;
const INLINE_LEADERBOARD_SCORE_TEXT_X = 645;
const INLINE_LEADERBOARD_PAGE_CLUSTER_LIFT = 70;
const INLINE_LEADERBOARD_PAGE_TAB_RADIUS = 31;
const INLINE_LEADERBOARD_PAGE_TAB_FONT_SIZE = 42;
const INLINE_LEADERBOARD_PAGE_TAB_ACTIVE_COLOR = 0x2fa9e8;
const INLINE_LEADERBOARD_PAGE_TAB_TEXT_COLOR = "#23a9e9";
/** Extra space below the page tabs/divider; does not move pagination. */
const INLINE_LEADERBOARD_SUMMARY_FOOTER_DROP = 30;
const INLINE_LEADERBOARD_PAGE_BUTTON_Y =
  3844 +
  MOBILE_LOBBY_CONTENT_DROP_PX +
  LEADERBOARD_TOP_GAP_BELOW_QUICK +
  LEADERBOARD_LIST_HEIGHT_DELTA -
  INLINE_LEADERBOARD_PAGE_CLUSTER_LIFT;
const INLINE_LEADERBOARD_BOTTOM_DIVIDER_Y =
  3911 +
  MOBILE_LOBBY_CONTENT_DROP_PX +
  LEADERBOARD_TOP_GAP_BELOW_QUICK +
  LEADERBOARD_LIST_HEIGHT_DELTA -
  INLINE_LEADERBOARD_PAGE_CLUSTER_LIFT;
const INLINE_LEADERBOARD_SUMMARY_Y =
  3968 +
  MOBILE_LOBBY_CONTENT_DROP_PX +
  LEADERBOARD_TOP_GAP_BELOW_QUICK +
  LEADERBOARD_LIST_HEIGHT_DELTA -
  INLINE_LEADERBOARD_PAGE_CLUSTER_LIFT +
  INLINE_LEADERBOARD_SUMMARY_FOOTER_DROP;
const INLINE_LEADERBOARD_SUMMARY_PLATE_SCALE = 0.34;
const INLINE_LEADERBOARD_FOOTER_Y =
  4098 +
  MOBILE_LOBBY_CONTENT_DROP_PX +
  LEADERBOARD_TOP_GAP_BELOW_QUICK +
  LEADERBOARD_LIST_HEIGHT_DELTA -
  INLINE_LEADERBOARD_PAGE_CLUSTER_LIFT +
  INLINE_LEADERBOARD_SUMMARY_FOOTER_DROP;
const MY_TOTAL_POINTS_Y = 1990 + MOBILE_LOBBY_CONTENT_DROP_PX;
const HISTORY_AND_TEST_SPIN_Y = 2188 + MOBILE_LOBBY_CONTENT_DROP_PX;
const LEADERBOARD_TITLE_IMAGE_Y = 2340 + LEADERBOARD_TOP_GAP_BELOW_QUICK + MOBILE_LOBBY_CONTENT_DROP_PX;
const PRIZE_EXTEND = LEADERBOARD_TOP_GAP_BELOW_QUICK + LEADERBOARD_LIST_HEIGHT_DELTA;
/** Scroll section: gray from midpoint (History row ↔ title) through footer sync lines. */
const INLINE_LEADERBOARD_SECTION_TOP = Math.round(
  (HISTORY_AND_TEST_SPIN_Y + LEADERBOARD_TITLE_IMAGE_Y) / 2,
);
const INLINE_LEADERBOARD_SECTION_HEIGHT =
  4125 - 2340 + PRIZE_EXTEND + (LEADERBOARD_TITLE_IMAGE_Y - INLINE_LEADERBOARD_SECTION_TOP);
const INLINE_LEADERBOARD_SECTION_BG = 0xf2f4f9; // rgb(242,244,249)
/** Must match `drawHero` eligibility line: `y = 612 + stepSectionOffsetY`. */
const LOBBY_ELIGIBILITY_TEXT_CENTER_Y = 612 + 20 + MOBILE_LOBBY_CONTENT_DROP_PX;
const ACTIVITY_PILL_ITEM_HEIGHT = 96;
/** Keep activity pill tops below the wrapped promotion period line. */
const ACTIVITY_BUBBLE_MIN_Y =
  LOBBY_ELIGIBILITY_TEXT_CENTER_Y + 44 + 10 + Math.ceil(ACTIVITY_PILL_ITEM_HEIGHT / 2);
/** Match mobile `WheelScene` center Y so popups can occupy the wheel's middle area. */
const ACTIVITY_BUBBLE_MAX_Y = 1410 + MOBILE_LOBBY_CONTENT_DROP_PX;
const ACTIVITY_BUBBLE_MIN_TRAVEL_Y = 120;
const ACTIVITY_BUBBLE_MAX_TRAVEL_Y = 420;
const MOBILE_SCROLL_DRAG_SENSITIVITY = 0.55;
const MOBILE_SCROLL_MOMENTUM_SENSITIVITY = 0.55;
const MOBILE_SCROLL_MOMENTUM_DECAY = 0.9;
const MOBILE_SCROLL_WHEEL_SENSITIVITY = 0.55;
const PRIZE_SECTION_TITLE_Y = 4276 + MOBILE_LOBBY_CONTENT_DROP_PX + PRIZE_EXTEND;
const PRIZE_SECTION_SUBTITLE_Y = 4346 + MOBILE_LOBBY_CONTENT_DROP_PX + PRIZE_EXTEND;
const PRIZE_BADGE_VISIBLE_LEFT = 143;
const PRIZE_BADGE_VISIBLE_RIGHT = 144;
const PRIZE_REWARD_VISIBLE_LEFT = 298;
const PRIZE_REWARD_VISIBLE_RIGHT = 303;
/** Terms + deposit + bottom stripe: shift up (closer to prize). */
const INLINE_RULES_SECTION_LIFT = 150;
/** 18px + lineSpacing 6 + 18px; `leaderboardLastSyncedText` is origin 0.5,0.5 at `INLINE_LEADERBOARD_FOOTER_Y`. */
const LEADERBOARD_FOOTER_TEXT_BLOCK_HALF_HEIGHT = (18 + 6 + 18) / 2;
/** `Title_PrizeArea` at scale 1, origin 0.5,0.5 at `PRIZE_SECTION_TITLE_Y` – tune if asset size changes. */
const PRIZE_AREA_TITLE_IMAGE_HALF_HEIGHT = 50;
/** White page band: horizontal boundary midway between footer's bottom ("Next refresh…" line) and title image top. */
const PRIZE_AND_TERMS_PAGE_BG_TOP = Math.round(
  (INLINE_LEADERBOARD_FOOTER_Y +
    LEADERBOARD_FOOTER_TEXT_BLOCK_HALF_HEIGHT +
    PRIZE_SECTION_TITLE_Y -
    PRIZE_AREA_TITLE_IMAGE_HALF_HEIGHT) /
    2,
);
const LEADERBOARD_PENDING_TEXT_Y = 2666 + MOBILE_LOBBY_CONTENT_DROP_PX + LEADERBOARD_TOP_GAP_BELOW_QUICK;
const MOBILE_EVENT_SELECTOR_WIDTH = 390;
const MOBILE_EVENT_SELECTOR_HEIGHT = 104;
const MOBILE_EVENT_SELECTOR_HOVER_WIDTH = 400;
const MOBILE_EVENT_SELECTOR_HOVER_HEIGHT = 112;
const MOBILE_EVENT_SELECTOR_STROKE = 0x08aee4;
const MOBILE_EVENT_SELECTOR_PANEL_TOP = 218;
const MOBILE_EVENT_SELECTOR_PANEL_WIDTH = 860;
const MOBILE_EVENT_SELECTOR_PANEL_HEIGHT = 1348;
const MOBILE_EVENT_SELECTOR_PANEL_RADIUS = 38;
const MOBILE_EVENT_SELECTOR_ROW_HEIGHT = 154;
const LEADERBOARD_PLATE_KEYS = [
  "RankingPlate_01",
  "RankingPlate_02",
  "RankingPlate_03",
  "RankingPlate_04",
  "RankingPlate_05",
  "RankingPlate_06",
  "RankingPlate_07",
  "RankingPlate_08",
  "RankingPlate_09",
  "RankingPlate_10",
  "RankingPlate_11",
  "RankingPlate_12",
  "RankingPlate_13",
  "RankingPlate_14",
  "RankingPlate_15",
  "RankingPlate_16",
  "RankingPlate_17",
  "RankingPlate_18",
  "RankingPlate_19",
  "RankingPlate_20",
  "RankingPlate_21",
  "RankingPlate_22",
  "RankingPlate_23",
  "RankingPlate_24",
  "RankingPlate_25",
  "RankingPlate_26",
  "RankingPlate_27",
  "RankingPlate_28",
  "RankingPlate_29",
  "RankingPlate_30",
] as const;
const LEADERBOARD_PLATE_VISUAL_CENTER_OFFSETS: Partial<Record<number, number>> = {
  11: 32.5,
  12: 5,
  13: -0.5,
  14: 33.5,
  15: 24.5,
  16: -0.5,
  17: -0.5,
  18: 15,
  19: 18.5,
  20: 24,
  21: 24,
  22: 24,
  23: 24,
  24: 24,
  25: 24,
  26: 24,
  27: 24,
  28: 24,
  29: 24,
  30: 24,
};
const LEADERBOARD_PLATE_VISUAL_CENTER_Y_OFFSETS: Partial<Record<number, number>> = {
  1: -1.5,
  2: -1,
  3: -1,
  4: 1.5,
  5: 3.5,
  6: 4.5,
  7: 13.5,
  8: 9,
  9: 9.5,
  10: -1.5,
  11: 28.5,
  12: 2.5,
  13: -1,
  14: 15,
  15: 6.5,
  16: -33.5,
  17: 2,
  18: 9.5,
  19: 1.5,
  20: 50.5,
  21: 47.5,
  22: 50.5,
  23: 50.5,
  24: 49,
  25: 47,
  26: 46.5,
  27: 48,
  28: 48,
  29: 48,
  30: 48,
};
/**
 * Image-space offset from plate PNG's bbox center to the white data row's
 * visual center. Measured per rank via alpha sampling at x=0.75*w. Multiply
 * by plate scale to get the screen-space Y adjustment for text centering.
 */
const LEADERBOARD_PLATE_TEXT_CENTER_IMG_OFFSETS: Record<number, number> = {
  1: 34,
  2: 29,
  3: 29,
  4: 34,
  5: 37,
  6: 37,
  7: 48,
  8: 43,
  9: 42,
  10: 32,
  11: 65,
  12: 35,
  13: 32,
  14: 50,
  15: 43,
  16: 0,
  17: 34,
  18: 42,
  19: 34,
  20: 80,
  21: 80,
  22: 80,
  23: 80,
  24: 80,
  25: 80,
  26: 80,
  27: 80,
  28: 80,
  29: 80,
  30: 80,
};
const LEADERBOARD_PLATE_PRIZE_BADGE_CENTER_IMG_OFFSETS: Record<number, number> = {
  1: 104,
  2: 99.5,
  3: 99.5,
  4: 104,
  5: 107.5,
  6: 107.5,
  7: 118,
  8: 113.5,
  9: 112,
  10: 102,
  11: 135,
  12: 105.5,
  13: 102,
  14: 120.5,
  15: 113,
  16: 70.5,
  17: 104.5,
  18: 112.5,
  19: 104.5,
  20: 150.5,
  21: 150.5,
  22: 150.5,
  23: 150.5,
  24: 150.5,
  25: 150.5,
  26: 150.5,
  27: 150.5,
  28: 150.5,
  29: 150.5,
  30: 150.5,
};
const PRIZE_BADGE_KEYS = [
  "Prize_Ranking_01",
  "Prize_Ranking_02",
  "Prize_Ranking_03",
  "Prize_Ranking_04",
  "Prize_Ranking_05",
] as const;

export class LobbyScene extends Phaser.Scene {
  private cleanup: Array<() => void> = [];
  private sectionBands: SectionBand[] = [];
  private periodFrame?: Phaser.GameObjects.Graphics;
  private periodPill?: Phaser.GameObjects.Text;
  private periodChevron?: Phaser.GameObjects.Graphics;
  private eventPickerContainer?: Phaser.GameObjects.Container;
  private eventPickerBusy = false;
  private totalPointsText?: Phaser.GameObjects.Text;
  private eligibilityText?: Phaser.GameObjects.Text;
  private rulesBodyText?: Phaser.GameObjects.Text;
  private leaderboardPendingText?: Phaser.GameObjects.Text;
  private leaderboardLastSyncedText?: Phaser.GameObjects.Text;
  private myRankSummaryPlate?: Phaser.GameObjects.Image;
  private myRankSummaryPlayerText?: Phaser.GameObjects.Text;
  private myRankSummaryScoreText?: Phaser.GameObjects.Text;
  private myRankSummaryPrizeText?: Phaser.GameObjects.Text;
  private myRankSummaryText?: Phaser.GameObjects.Text;
  private devControls: DevControl[] = [];
  private activityBubbles: ActivityBubble[] = [];
  private activitySection?: Phaser.GameObjects.Container;
  private inlineLeaderboardRows: InlineLeaderboardRow[] = [];
  private inlinePrizeRows: PrizeSectionRow[] = [];
  private pageTabs: PageTab[] = [];
  private leaderboardPage = 1;
  private isDraggingScroll = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartScrollY = 0;
  private lastDragY = 0;
  private lastDragTime = 0;
  private scrollVelocity = 0;
  private activeScrollPointerId?: number;
  private suppressTapUntil = 0;

  constructor() {
    super(SCENE_KEYS.Lobby);
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.pageTop);
    this.cameras.main.setBounds(0, 0, STAGE_WIDTH, CONTENT_HEIGHT);
    this.drawBackground();
    this.captureSection(0, 180, () => this.drawHeader());
    this.captureSection(220, 800, () => this.drawHero());
    this.activitySection = this.captureSection(620, 1020, () => this.drawActionRow(), 360);
    this.captureSection(1900, INLINE_LEADERBOARD_SECTION_TOP, () => {
      this.drawSummaryArea();
      this.drawQuickActions();
      this.drawDevPanel();
    });
    this.captureSection(
      INLINE_LEADERBOARD_SECTION_TOP,
      INLINE_LEADERBOARD_SECTION_TOP + INLINE_LEADERBOARD_SECTION_HEIGHT,
      () => this.drawInlineLeaderboardSection(),
      260,
    );
    this.captureSection(
      4276 + MOBILE_LOBBY_CONTENT_DROP_PX + PRIZE_EXTEND,
      5960 + MOBILE_LOBBY_CONTENT_DROP_PX + PRIZE_EXTEND,
      () => this.drawInlinePrizeSection(),
      260,
    );
    this.captureSection(
      6090 + MOBILE_LOBBY_CONTENT_DROP_PX + PRIZE_EXTEND - INLINE_RULES_SECTION_LIFT,
      CONTENT_HEIGHT,
      () => this.drawInlineRulesSection(),
      260,
    );
    this.setupScrollControls();
    this.refreshDynamicContent();
    const leaderboardFooterTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.refreshLeaderboardFooterText(),
    });

    this.cleanup.push(
      () => leaderboardFooterTimer.destroy(),
      prototypeState.subscribe("change", () => this.refreshDynamicContent()),
      prototypeState.subscribe("locale-change", () => this.scene.restart()),
      prototypeState.subscribe("error", () => {
        if (!this.scene.isActive(SCENE_KEYS.ErrorOverlay)) {
          this.scene.launch(SCENE_KEYS.ErrorOverlay);
        }
      }),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, this.updateActivityBubbles, this);
      this.cleanup.forEach((cleanup) => cleanup());
      this.cleanup = [];
      this.activityBubbles = [];
      this.activitySection = undefined;
      this.inlineLeaderboardRows = [];
      this.inlinePrizeRows = [];
      this.pageTabs = [];
      this.sectionBands = [];
      this.eventPickerContainer = undefined;
    });

    const debugScrollYParam = new URL(window.location.href).searchParams.get("scrollY");
    const debugScrollY = debugScrollYParam ? Number(debugScrollYParam) : NaN;
    this.setScrollY(
      Number.isFinite(debugScrollY) && debugScrollY > 0
        ? debugScrollY
        : Number(this.registry.get("mainScrollY") ?? 0),
    );

    if (!prototypeState.getSnapshot().currentEvent && !prototypeState.getSnapshot().isBootstrapping) {
      void prototypeState.bootstrap();
    }
  }

  private drawBackground() {
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(
      COLORS.pageTop,
      COLORS.pageTop,
      COLORS.pageBottom,
      COLORS.pageBottom,
      1,
    );
    gradient.fillRect(0, 0, STAGE_WIDTH, CONTENT_HEIGHT);

    const prizeTermsBg = this.add.graphics();
    prizeTermsBg.fillStyle(COLORS.white, 1);
    prizeTermsBg.fillRect(0, PRIZE_AND_TERMS_PAGE_BG_TOP, STAGE_WIDTH, CONTENT_HEIGHT - PRIZE_AND_TERMS_PAGE_BG_TOP);
  }

  private drawHeader() {
    const periodCenterX = this.fromEditorX(340);
    const headerIconScale = 0.84;

    this.add.image(this.fromEditorX(83), 110, "Button_iBET").setScale(0.82);

    this.periodFrame = this.add.graphics();
    this.periodFrame.setPosition(periodCenterX, 110);
    this.drawMobileEventSelectorFrame(
      this.periodFrame,
      MOBILE_EVENT_SELECTOR_WIDTH,
      MOBILE_EVENT_SELECTOR_HEIGHT,
    );

    this.periodPill = this.add
      .text(periodCenterX - 12, 110, prototypeState.t("lobby.loadingLiveEvent"), {
        fontFamily: FONTS.body,
        fontSize: "32px",
        fontStyle: "400",
        color: "#111111",
        align: "center",
        wordWrap: { width: MOBILE_EVENT_SELECTOR_WIDTH - 84, useAdvancedWrap: false },
      })
      .setOrigin(0.5);

    this.periodChevron = this.createMobileEventSelectorChevron(
      periodCenterX + MOBILE_EVENT_SELECTOR_WIDTH / 2 - 56,
      110,
    );

    const periodHitArea = this.add.rectangle(
      periodCenterX,
      110,
      MOBILE_EVENT_SELECTOR_WIDTH + 28,
      MOBILE_EVENT_SELECTOR_HEIGHT + 28,
      0xffffff,
      0,
    );
    periodHitArea.setInteractive({ useHandCursor: true });
    periodHitArea.on("pointerdown", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    });
    periodHitArea.on("pointerup", () => this.runTapAction(() => this.toggleOverlay(SCENE_KEYS.PeriodOverlay)));
    periodHitArea.on("pointerover", () => {
      if (!this.periodFrame) {
        return;
      }

      this.drawMobileEventSelectorFrame(
        this.periodFrame,
        MOBILE_EVENT_SELECTOR_HOVER_WIDTH,
        MOBILE_EVENT_SELECTOR_HOVER_HEIGHT,
      );
      this.periodChevron?.setScale(1.05);
    });
    periodHitArea.on("pointerout", () => {
      if (!this.periodFrame) {
        return;
      }

      this.drawMobileEventSelectorFrame(
        this.periodFrame,
        MOBILE_EVENT_SELECTOR_WIDTH,
        MOBILE_EVENT_SELECTOR_HEIGHT,
      );
      this.periodChevron?.setScale(1);
    });

    const localeButton = this.add
      .image(this.fromEditorX(570), 110, "Button_Language")
      .setScale(headerIconScale);
    localeButton.setInteractive({ useHandCursor: true });
    localeButton.on("pointerover", () => localeButton.setScale(0.86));
    localeButton.on("pointerout", () => localeButton.setScale(headerIconScale));
    localeButton.on("pointerup", () => this.runTapAction(() => this.toggleOverlay(SCENE_KEYS.LocaleOverlay)));

    const supportButton = this.add
      .image(this.fromEditorX(668), 110, "Button_Support")
      .setScale(headerIconScale);
    supportButton.setInteractive({ useHandCursor: true });
    supportButton.on("pointerover", () => supportButton.setScale(0.86));
    supportButton.on("pointerout", () => supportButton.setScale(headerIconScale));
    supportButton.on("pointerup", () => this.runTapAction(() => {
      openExternalLink(this.getPlatformLinkUrl(PlatformLinkType.CustomerService));
    }));
  }

  private drawMobileEventSelectorFrame(
    frame: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
  ) {
    const radius = height / 2;
    frame.clear();
    frame.fillStyle(0xffffff, 1);
    frame.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    frame.lineStyle(3, MOBILE_EVENT_SELECTOR_STROKE, 1);
    frame.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  }

  private createMobileEventSelectorChevron(x: number, y: number) {
    const chevron = this.add.graphics();
    chevron.setPosition(x, y);
    chevron.lineStyle(6, MOBILE_EVENT_SELECTOR_STROKE, 1);
    chevron.beginPath();
    chevron.moveTo(-12, -6);
    chevron.lineTo(0, 7);
    chevron.lineTo(12, -6);
    chevron.strokePath();
    return chevron;
  }

  private openMobileEventPicker() {
    const snapshot = prototypeState.getSnapshot();
    const events = snapshot.events as MobileEventPickerEntry[];

    if (events.length === 0) {
      return;
    }

    this.closeMobileEventPicker();

    const modal = this.add.container(0, 0);
    modal.setScrollFactor(0);
    modal.setDepth(1200);

    const swallowPickerTap = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    };

    const backdrop = this.add
      .rectangle(STAGE_WIDTH / 2, STAGE_HEIGHT / 2, STAGE_WIDTH, STAGE_HEIGHT, 0xffffff, 0.001)
      .setScrollFactor(0)
      .setInteractive();
    backdrop.on("pointerdown", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.closeMobileEventPicker();
    });
    backdrop.on("pointerup", swallowPickerTap);
    modal.add(backdrop);

    const panelX = STAGE_WIDTH / 2;
    const panelLeft = panelX - MOBILE_EVENT_SELECTOR_PANEL_WIDTH / 2;
    const panel = this.add.container(0, 0).setScrollFactor(0);
    const shadow = this.add.graphics().setScrollFactor(0);
    const shadowLayers = [
      { inset: -28, offsetY: 20, alpha: 0.035, radiusOffset: 28 },
      { inset: -18, offsetY: 14, alpha: 0.055, radiusOffset: 20 },
      { inset: -9, offsetY: 8, alpha: 0.08, radiusOffset: 12 },
      { inset: 0, offsetY: 3, alpha: 0.13, radiusOffset: 0 },
    ] as const;
    shadowLayers.forEach((layer) => {
      shadow.fillStyle(0x000000, layer.alpha);
      shadow.fillRoundedRect(
        panelLeft + layer.inset,
        MOBILE_EVENT_SELECTOR_PANEL_TOP + layer.offsetY + layer.inset,
        MOBILE_EVENT_SELECTOR_PANEL_WIDTH - layer.inset * 2,
        MOBILE_EVENT_SELECTOR_PANEL_HEIGHT - layer.inset * 2,
        MOBILE_EVENT_SELECTOR_PANEL_RADIUS + layer.radiusOffset,
      );
    });

    const background = this.add.graphics().setScrollFactor(0);
    background.fillStyle(0xffffff, 0.98);
    background.fillRoundedRect(
      panelLeft,
      MOBILE_EVENT_SELECTOR_PANEL_TOP,
      MOBILE_EVENT_SELECTOR_PANEL_WIDTH,
      MOBILE_EVENT_SELECTOR_PANEL_HEIGHT,
      MOBILE_EVENT_SELECTOR_PANEL_RADIUS,
    );
    background.lineStyle(1.5, 0xffffff, 0.9);
    background.strokeRoundedRect(
      panelLeft + 1,
      MOBILE_EVENT_SELECTOR_PANEL_TOP + 1,
      MOBILE_EVENT_SELECTOR_PANEL_WIDTH - 2,
      MOBILE_EVENT_SELECTOR_PANEL_HEIGHT - 2,
      MOBILE_EVENT_SELECTOR_PANEL_RADIUS - 1,
    );

    const panelHitArea = this.add
      .rectangle(
        panelX,
        MOBILE_EVENT_SELECTOR_PANEL_TOP + MOBILE_EVENT_SELECTOR_PANEL_HEIGHT / 2,
        MOBILE_EVENT_SELECTOR_PANEL_WIDTH,
        MOBILE_EVENT_SELECTOR_PANEL_HEIGHT,
        0xffffff,
        0.001,
      )
      .setScrollFactor(0)
      .setInteractive();
    panelHitArea.on("pointerdown", swallowPickerTap);
    panelHitArea.on("pointerup", swallowPickerTap);
    panel.add([shadow, background, panelHitArea]);
    modal.add(panel);

    const maxRows = Math.min(
      events.length,
      Math.floor((MOBILE_EVENT_SELECTOR_PANEL_HEIGHT - 36) / MOBILE_EVENT_SELECTOR_ROW_HEIGHT),
    );

    events.slice(0, maxRows).forEach((entry, index) => {
      this.drawMobileEventPickerRow(
        modal,
        entry,
        panelLeft,
        MOBILE_EVENT_SELECTOR_PANEL_TOP + 52 + index * MOBILE_EVENT_SELECTOR_ROW_HEIGHT,
      );
    });

    this.eventPickerContainer = modal;
  }

  private drawMobileEventPickerRow(
    modal: Phaser.GameObjects.Container,
    entry: MobileEventPickerEntry,
    panelLeft: number,
    rowTop: number,
  ) {
    const row = this.add.container(0, 0).setScrollFactor(0);
    const title = this.add
      .text(panelLeft + 48, rowTop, entry.title, {
        fontFamily: FONTS.display,
        fontSize: "38px",
        fontStyle: "700",
        color: "#050505",
        wordWrap: { width: MOBILE_EVENT_SELECTOR_PANEL_WIDTH - 300, useAdvancedWrap: false },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0);

    const period = this.add
      .text(panelLeft + 48, rowTop + 58, entry.promotionPeriodLabel, {
        fontFamily: FONTS.body,
        fontSize: "36px",
        fontStyle: "400",
        color: "#8c8c8c",
        wordWrap: { width: MOBILE_EVENT_SELECTOR_PANEL_WIDTH - 300, useAdvancedWrap: false },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0);

    const chip = this.createMobileEventDropdownStatusChip(
      panelLeft + MOBILE_EVENT_SELECTOR_PANEL_WIDTH - 138,
      rowTop + 48,
      entry.status,
    );

    const hitArea = this.add
      .rectangle(
        panelLeft + MOBILE_EVENT_SELECTOR_PANEL_WIDTH / 2,
        rowTop + MOBILE_EVENT_SELECTOR_ROW_HEIGHT / 2 - 2,
        MOBILE_EVENT_SELECTOR_PANEL_WIDTH,
        MOBILE_EVENT_SELECTOR_ROW_HEIGHT,
        0xffffff,
        0.001,
      )
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    const beginSelection = () => {
      if (this.eventPickerBusy) {
        return;
      }

      this.eventPickerBusy = true;
      hitArea.disableInteractive();

      void prototypeState.selectEvent(entry.id)
        .then(() => this.closeMobileEventPicker())
        .catch(() => {
          this.eventPickerBusy = false;
          hitArea.setInteractive({ useHandCursor: true });
        });
    };

    hitArea.on("pointerdown", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      beginSelection();
    });
    hitArea.on("pointerover", () => title.setColor("#0b9fd9"));
    hitArea.on("pointerout", () => title.setColor("#050505"));
    hitArea.on("pointerup", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    });

    row.add([title, period, chip, hitArea]);
    modal.add(row);
  }

  private createMobileEventDropdownStatusChip(x: number, y: number, status: EventStatus) {
    const chip = this.add.container(x, y).setScrollFactor(0);
    const bg = this.add.graphics().setScrollFactor(0);
    const isLive = status === EventStatus.Live;

    bg.fillStyle(isLive ? 0x06aee4 : 0xc4c4c4, 1);
    bg.fillRoundedRect(-115, -45, 230, 90, 45);

    const text = this.add
      .text(0, 1, this.getMobileEventPickerStatusLabel(status), {
        fontFamily: FONTS.body,
        fontSize: "36px",
        fontStyle: "700",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    chip.add([bg, text]);
    return chip;
  }

  private getMobileEventPickerStatusLabel(status: EventStatus) {
    return status === EventStatus.Live ? "Active" : "Expired";
  }

  private closeMobileEventPicker() {
    this.eventPickerBusy = false;
    this.eventPickerContainer?.destroy(true);
    this.eventPickerContainer = undefined;
  }

  private drawHero() {
    const copy = {
      depositTitle: prototypeState.t("lobby.stepDepositTitle"),
      depositCopy: prototypeState.t("lobby.stepDepositCopy"),
      spinTitle: prototypeState.t("lobby.stepSpinTitle"),
      spinCopy: prototypeState.t("lobby.stepSpinCopy"),
      rankTitle: prototypeState.t("lobby.stepRankTitle"),
      rankCopy: prototypeState.t("lobby.stepRankCopy"),
    };

    const stepSectionOffsetY = 20 + MOBILE_LOBBY_CONTENT_DROP_PX;
    const tutorialCenterX = 540;
    const tutorialScale = 0.86;
    const tutorialTextureWidth = 990;
    const tutorialIconXs = [161, 498, 830];
    this.add
      .text(540, 264, "iBET LUCKY WHEEL", {
        fontFamily: FONTS.display,
        fontSize: "82px",
        fontStyle: "900",
        color: "#15a9e8",
      })
      .setOrigin(0.5);
    this.add
      .text(540, 334, "Spin Daily & Climb The Leaderboard For Cash Rewards!", {
        fontFamily: FONTS.body,
        fontSize: "38px",
        fontStyle: "700",
        color: "#119fe6",
      })
      .setOrigin(0.5);
    this.add.image(tutorialCenterX, 454 + stepSectionOffsetY, "GameTutorial").setScale(tutorialScale);

    const stepTextY = 502 + stepSectionOffsetY;
    const textPositions = tutorialIconXs.map(
      (iconX) => tutorialCenterX + (iconX - tutorialTextureWidth / 2) * tutorialScale,
    );
    const steps = [
      `${copy.depositTitle}\n${copy.depositCopy}`,
      `${copy.spinTitle}\n${copy.spinCopy}`,
      `${copy.rankTitle}\n${copy.rankCopy}`,
    ];

    textPositions.forEach((x, index) => {
      this.add
        .text(x, stepTextY, steps[index], {
          fontFamily: FONTS.body,
          fontSize: "36px",
          fontStyle: "700",
          color: "#119ae0",
          align: "center",
          lineSpacing: 4,
          wordWrap: { width: 210, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
    });

    this.eligibilityText = this.add
      .text(540, 612 + stepSectionOffsetY, prototypeState.t("lobby.checkingEligibility"), {
        fontFamily: FONTS.body,
        fontSize: "26px",
        color: "#9a9fa6",
        align: "center",
        wordWrap: { width: 820, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
  }

  private drawActionRow() {
    const itemWidth = 560;
    const itemHeight = ACTIVITY_PILL_ITEM_HEIGHT;
    const bubbleCount = 3;

    this.activityBubbles = Array.from({ length: bubbleCount }, (_, index) => {
      const pill = addPill(
        this,
        STAGE_WIDTH / 2,
        970 + MOBILE_LOBBY_CONTENT_DROP_PX,
        itemWidth,
        itemHeight,
        "",
        0xe9f7ff,
        "#0a2942",
      );

      pill.text.setFontSize("34px");
      pill.text.setWordWrapWidth(500, true);
      pill.text.setAlign("center");
      pill.container.setAlpha(0);
      pill.container.setScale(0.82);

      const bubble = {
        container: pill.container,
        text: pill.text,
        width: itemWidth,
        delayRemaining: 0,
        progress: 0,
        duration: 0,
        startX: STAGE_WIDTH / 2,
        startY: 970 + MOBILE_LOBBY_CONTENT_DROP_PX,
        endY: 970 + MOBILE_LOBBY_CONTENT_DROP_PX,
        startScale: 0.82,
        endScale: 0.96,
      };

      this.resetActivityBubble(bubble, index * 700 + Phaser.Math.Between(80, 260));
      return bubble;
    });

    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateActivityBubbles, this);
  }

  private drawSummaryArea() {
    const y = MY_TOTAL_POINTS_Y;
    const frame = this.add.image(540, y, "Frame_MyTotalPoint");
    const naturalW = frame.frame?.width ?? frame.width;
    const myTotalScale = MOBILE_WHEEL_BACKDROP_DIAMETER / Math.max(1, naturalW);
    frame.setScale(myTotalScale);
    const halfW = frame.displayWidth / 2;
    const insetX = 72;
    this.add
      .text(540 - halfW + insetX, y, `${prototypeState.t("lobby.myTotalPoints")}:`, {
        fontFamily: FONTS.body,
        fontSize: "52px",
        fontStyle: "700",
        color: "#15a8ee",
      })
      .setOrigin(0, 0.5);

    this.totalPointsText = this.add
      .text(540 + halfW - insetX, y, "0", {
        fontFamily: FONTS.display,
        fontSize: "56px",
        fontStyle: "700",
        color: "#10a7eb",
      })
      .setOrigin(1, 0.5);
  }

  private drawQuickActions() {
    this.createHistoryActionButton(540, HISTORY_AND_TEST_SPIN_Y, () => {
      this.toggleOverlay(SCENE_KEYS.HistoryOverlay);
    });

    this.createActionButton(820, HISTORY_AND_TEST_SPIN_Y, 240, 88, "test_spin", () => {
      (this.scene.get(SCENE_KEYS.Wheel) as WheelScene | undefined)?.runVisualTestSpin();
    });
  }

  private drawInlineLeaderboardSection() {
    const sectionBg = this.add.graphics();
    sectionBg.fillStyle(INLINE_LEADERBOARD_SECTION_BG, 1);
    // Stop gray at white transition (not full SECTION_HEIGHT) — `prizeTermsBg` is beneath this section and would be fully covered.
    const leaderGrayEndY = Math.min(
      INLINE_LEADERBOARD_SECTION_TOP + INLINE_LEADERBOARD_SECTION_HEIGHT,
      PRIZE_AND_TERMS_PAGE_BG_TOP,
    );
    const leaderGrayHeight = Math.max(0, leaderGrayEndY - INLINE_LEADERBOARD_SECTION_TOP);
    sectionBg.fillRect(0, INLINE_LEADERBOARD_SECTION_TOP, STAGE_WIDTH, leaderGrayHeight);
    sectionBg.setDepth(-1);

    const titleImage = this.add
      .image(this.fromEditorX(379), LEADERBOARD_TITLE_IMAGE_Y, "Title_Ranking")
      .setScale(INLINE_LEADERBOARD_TITLE_SCALE);
    const titleBottomY = titleImage.getBounds().bottom;
    const columnHeaderRowTopY = INLINE_LEADERBOARD_COLUMN_LABEL_Y - INLINE_LEADERBOARD_COLUMN_HEADER_TEXT_HALF;
    const spanTop = titleBottomY + INLINE_LEADERBOARD_SUBTITLE_INNER_PAD;
    const spanBottom = columnHeaderRowTopY - INLINE_LEADERBOARD_SUBTITLE_INNER_PAD;
    const subtitleCenterY =
      spanBottom > spanTop
        ? (spanTop + spanBottom) / 2
        : (titleBottomY + columnHeaderRowTopY) / 2;
    this.add
      .text(540, subtitleCenterY, prototypeState.t("leaderboard.sectionSubtitle"), {
        fontFamily: FONTS.body,
        fontSize: "28px",
        fontStyle: "700",
        color: "#5a8099",
        align: "center",
        lineSpacing: 4,
        wordWrap: { width: 840, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0.5);

      this.add
        .text(
        this.getInlineLeaderboardX(INLINE_LEADERBOARD_RANK_COLUMN_X),
        INLINE_LEADERBOARD_COLUMN_LABEL_Y,
        prototypeState.t("leaderboard.columnRank"),
        {
        fontFamily: FONTS.body,
        fontSize: "26px",
        fontStyle: "700",
        color: "#12a2ea",
        },
      )
      .setOrigin(0.5);

      this.add
        .text(
        this.getInlineLeaderboardX(INLINE_LEADERBOARD_USERNAME_COLUMN_X),
        INLINE_LEADERBOARD_COLUMN_LABEL_Y,
        prototypeState.t("leaderboard.columnUsername"),
        {
        fontFamily: FONTS.body,
        fontSize: "26px",
        fontStyle: "700",
        color: "#12a2ea",
        },
      )
      .setOrigin(0.5);

      this.add
        .text(
        this.getInlineLeaderboardX(INLINE_LEADERBOARD_TOTAL_HEADER_X),
        INLINE_LEADERBOARD_COLUMN_LABEL_Y,
        prototypeState.t("leaderboard.columnTotalPoints"),
        {
        fontFamily: FONTS.body,
        fontSize: "26px",
        fontStyle: "700",
        color: "#12a2ea",
        },
      )
      .setOrigin(0.5);

    const headerUnderline = this.add.graphics();
    const headerUnderlineCenterX = this.fromEditorX(379);
    const headerUnderlineHalfWidth = this.fromEditorX((678 - 72) / 2);
    headerUnderline.lineStyle(3, 0x21b7f7, 0.96);
    headerUnderline.lineBetween(
      headerUnderlineCenterX - headerUnderlineHalfWidth,
      INLINE_LEADERBOARD_HEADER_UNDERLINE_Y,
      headerUnderlineCenterX + headerUnderlineHalfWidth,
      INLINE_LEADERBOARD_HEADER_UNDERLINE_Y,
    );

    this.leaderboardPendingText = this.add
      .text(540, LEADERBOARD_PENDING_TEXT_Y, "", {
        fontFamily: FONTS.body,
        fontSize: "28px",
        color: "#5d7d97",
        align: "center",
        wordWrap: { width: 800, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setVisible(false);

    LEADERBOARD_ROW_YS.forEach((baseY, index) => {
      const y = baseY + INLINE_LEADERBOARD_ROW_OFFSET_Y;
      const highlightArrow = this.add.graphics();
      highlightArrow.fillStyle(COLORS.primary, 1);
      highlightArrow.fillTriangle(
        this.getInlineLeaderboardX(82),
        y - 18,
        this.getInlineLeaderboardX(104),
        y,
        this.getInlineLeaderboardX(82),
        y + 18,
      );
      highlightArrow.setDepth(1);
      highlightArrow.setVisible(false);

      const plateScale = INLINE_LEADERBOARD_PLATE_SCALE;
      const plate = this.add
        .image(this.getLeaderboardPlateX(index + 1, plateScale), y, this.getLeaderboardPlateKey(index + 1))
        .setScale(plateScale);

      const playerText = this.add
        .text(this.getInlineLeaderboardX(INLINE_LEADERBOARD_USERNAME_COLUMN_X), y - 4, "-", {
          fontFamily: FONTS.body,
          fontSize: "30px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0.5, 0.5);

      const prizeText = this.add
        .text(this.getInlineLeaderboardX(INLINE_LEADERBOARD_PRIZE_TEXT_X), this.getLeaderboardPrizeTextY(y, index + 1, INLINE_LEADERBOARD_PLATE_SCALE), "", {
          fontFamily: FONTS.body,
          fontSize: "33px",
          fontStyle: "700",
          color: "#5d7d97",
        })
        .setOrigin(0.5, 0.5);

      const scoreText = this.add
        .text(this.getInlineLeaderboardX(INLINE_LEADERBOARD_SCORE_TEXT_X), y - 4, "-", {
          fontFamily: FONTS.display,
          fontSize: "42px",
          fontStyle: "700",
          color: "#10a7eb",
        })
        .setOrigin(1, 0.5);

      this.inlineLeaderboardRows.push({ highlightArrow, plate, playerText, scoreText, prizeText });
    });

    this.drawInlineLeaderboardPagination();

    this.add.image(this.fromEditorX(374), INLINE_LEADERBOARD_BOTTOM_DIVIDER_Y, "Divider").setScale(1);

    this.myRankSummaryPlate = this.add
      .image(this.getInlineLeaderboardX(INLINE_LEADERBOARD_PLATE_BASE_X), INLINE_LEADERBOARD_SUMMARY_Y, "RankingPlate_Notl")
      .setScale(INLINE_LEADERBOARD_SUMMARY_PLATE_SCALE)
      .setVisible(false);

    this.myRankSummaryPlayerText = this.add
      .text(this.getInlineLeaderboardX(INLINE_LEADERBOARD_USERNAME_COLUMN_X), INLINE_LEADERBOARD_SUMMARY_Y - 4, "", {
        fontFamily: FONTS.body,
        fontSize: "30px",
        fontStyle: "700",
        color: "#0896d8",
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.myRankSummaryPrizeText = this.add
      .text(this.getInlineLeaderboardX(INLINE_LEADERBOARD_PRIZE_TEXT_X), INLINE_LEADERBOARD_SUMMARY_Y, "", {
        fontFamily: FONTS.body,
        fontSize: "33px",
        fontStyle: "700",
        color: "#5d7d97",
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.myRankSummaryScoreText = this.add
      .text(this.getInlineLeaderboardX(INLINE_LEADERBOARD_SCORE_TEXT_X), INLINE_LEADERBOARD_SUMMARY_Y - 4, "", {
        fontFamily: FONTS.display,
        fontSize: "42px",
        fontStyle: "700",
        color: "#10a7eb",
      })
      .setOrigin(1, 0.5)
      .setVisible(false);

    this.myRankSummaryText = this.add
      .text(540, INLINE_LEADERBOARD_SUMMARY_Y - 10, "", {
        fontFamily: FONTS.body,
        fontSize: "26px",
        fontStyle: "700",
        color: "#0a2942",
        align: "center",
        wordWrap: { width: 840, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    this.leaderboardLastSyncedText = this.add
      .text(540, INLINE_LEADERBOARD_FOOTER_Y, "", {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "400",
        color: "#000000",
        align: "center",
      })
      .setOrigin(0.5)
      .setLineSpacing(6);
  }

  private drawInlineLeaderboardPagination() {
    const pageXs = [this.fromEditorX(295), this.fromEditorX(375), this.fromEditorX(455)];
    const arrowY = INLINE_LEADERBOARD_PAGE_BUTTON_Y;

    this.drawPaginationChevron(this.fromEditorX(235), arrowY, -1, () => {
      this.leaderboardPage = Math.max(1, this.leaderboardPage - 1);
      this.refreshLeaderboardSection();
    });
    this.drawPaginationChevron(this.fromEditorX(515), arrowY, 1, () => {
      this.leaderboardPage = Math.min(3, this.leaderboardPage + 1);
      this.refreshLeaderboardSection();
    });

    pageXs.forEach((x, index) => {
      const page = index + 1;
      const circle = this.add
        .circle(
          x,
          INLINE_LEADERBOARD_PAGE_BUTTON_Y,
          INLINE_LEADERBOARD_PAGE_TAB_RADIUS,
          INLINE_LEADERBOARD_PAGE_TAB_ACTIVE_COLOR,
          1,
        )
        .setVisible(false);
      const label = this.add
        .text(x, INLINE_LEADERBOARD_PAGE_BUTTON_Y + 1, String(page), {
          fontFamily: FONTS.body,
          fontSize: `${INLINE_LEADERBOARD_PAGE_TAB_FONT_SIZE}px`,
          fontStyle: "700",
          color: INLINE_LEADERBOARD_PAGE_TAB_TEXT_COLOR,
        })
        .setOrigin(0.5);
      const hitArea = this.add
        .rectangle(
          x,
          INLINE_LEADERBOARD_PAGE_BUTTON_Y,
          INLINE_LEADERBOARD_PAGE_TAB_RADIUS * 2.4,
          INLINE_LEADERBOARD_PAGE_TAB_RADIUS * 2.4,
          0xffffff,
          0,
        )
        .setInteractive({ useHandCursor: true });
      hitArea.on("pointerup", () => this.runTapAction(() => {
        this.leaderboardPage = page;
        this.refreshLeaderboardSection();
      }));

      this.pageTabs.push({ circle, label, hitArea });
    });
  }

  private drawPaginationChevron(x: number, y: number, direction: -1 | 1, onClick: () => void) {
    const chevron = this.add.graphics();
    chevron.lineStyle(8, INLINE_LEADERBOARD_PAGE_TAB_ACTIVE_COLOR, 1);
    chevron.beginPath();
    chevron.moveTo(x - direction * 12, y - 20);
    chevron.lineTo(x + direction * 8, y);
    chevron.lineTo(x - direction * 12, y + 20);
    chevron.strokePath();

    const hitArea = this.add
      .rectangle(x, y, 80, 88, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on("pointerup", () => this.runTapAction(onClick));
  }

  private drawInlinePrizeSection() {
    this.add.image(this.fromEditorX(378), PRIZE_SECTION_TITLE_Y, "Title_PrizeArea").setScale(1);
    this.add
      .text(540, PRIZE_SECTION_SUBTITLE_Y, prototypeState.t("prize.sectionSubtitle"), {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "700",
        color: "#415f77",
        align: "center",
        wordWrap: { width: 760, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    const prizeRowLeft = this.fromEditorX(160) - PRIZE_BADGE_VISIBLE_LEFT;
    const prizeRowRight = this.fromEditorX(480) + PRIZE_REWARD_VISIBLE_RIGHT;
    const leftBadgeX = prizeRowLeft + PRIZE_BADGE_VISIBLE_LEFT;
    const leftRewardX = prizeRowRight - PRIZE_REWARD_VISIBLE_RIGHT;
    const rightRewardX = prizeRowLeft + PRIZE_REWARD_VISIBLE_LEFT;
    const rightBadgeX = prizeRowRight - PRIZE_BADGE_VISIBLE_RIGHT;
    const rewardXs = [leftRewardX, rightRewardX, leftRewardX, rightRewardX, leftRewardX];
    const badgeXs = [leftBadgeX, rightBadgeX, leftBadgeX, rightBadgeX, leftBadgeX];
    const yValues = [4521, 4841, 5161, 5481, 5801].map(
      (y) => y + MOBILE_LOBBY_CONTENT_DROP_PX + PRIZE_EXTEND,
    );

    yValues.forEach((y, index) => {
      const rankBadge = this.add.image(badgeXs[index], y, PRIZE_BADGE_KEYS[index]).setScale(1);
      const rewardZone = this.add.image(rewardXs[index], y, "Prize_RewardZone").setScale(1);
      const prizeArt = this.add.image(rewardXs[index], y, "Prize_RewardZone").setVisible(false);
      const textAlign = index % 2 === 0 ? 0 : 1;
      const textX = rewardXs[index] + (index % 2 === 0 ? -180 : 180);

      const prizeLabel = this.add
        .text(textX, y - 28, "-", {
          fontFamily: FONTS.display,
          fontSize: "34px",
          fontStyle: "700",
          color: "#ffffff",
          align: index % 2 === 0 ? "left" : "right",
        })
        .setOrigin(textAlign, 0.5);

      const prizeDescription = this.add
        .text(textX, y + 20, "", {
          fontFamily: FONTS.body,
          fontSize: "20px",
          fontStyle: "700",
          color: "#0a2942",
          align: index % 2 === 0 ? "left" : "right",
          wordWrap: { width: 280, useAdvancedWrap: true },
        })
        .setOrigin(textAlign, 0.5);

      this.inlinePrizeRows.push({ rankBadge, rewardZone, prizeArt, prizeLabel, prizeDescription });
    });
  }

  private drawInlineRulesSection() {
    const stripeBandTop = 7060 + MOBILE_LOBBY_CONTENT_DROP_PX + PRIZE_EXTEND - INLINE_RULES_SECTION_LIFT;
    const stripeBandHeight = 340;
    const stripeBandBottom = stripeBandTop + stripeBandHeight;
    const stripeBand = this.add.graphics();
    const stripeSpacing = 24;
    const stripeSegments = 10;
    const stripeColor = 0xe9f8ff;
    const stripeWidth = 5;

    for (let offset = -220; offset < STAGE_WIDTH + 220; offset += stripeSpacing) {
      for (let segment = 0; segment < stripeSegments; segment += 1) {
        const progressStart = segment / stripeSegments;
        const progressEnd = (segment + 1) / stripeSegments;
        const startX = offset + stripeBandHeight * progressStart;
        const startY = stripeBandBottom - stripeBandHeight * progressStart;
        const endX = offset + stripeBandHeight * progressEnd;
        const endY = stripeBandBottom - stripeBandHeight * progressEnd;
        const alpha = Phaser.Math.Linear(0.92, 0.18, progressStart);

        stripeBand.lineStyle(stripeWidth, stripeColor, alpha);
        stripeBand.lineBetween(startX, startY, endX, endY);
      }
    }
    stripeBand.setDepth(0);

    const termsX = 90;
    const termsY = 6140 + MOBILE_LOBBY_CONTENT_DROP_PX - INLINE_RULES_SECTION_LIFT;
    const termsW = 900;
    const termsH = 1060;
    const termsOuterR = 20;
    const termsInnerPad = 18;
    const termsInnerGray = 0xf2f2f2; // rgb(242,242,242)
    const termsPanel = this.add.graphics();
    termsPanel.fillStyle(COLORS.white, 0.98);
    termsPanel.fillRoundedRect(termsX, termsY + PRIZE_EXTEND, termsW, termsH, termsOuterR);
    termsPanel.fillStyle(termsInnerGray, 1);
    termsPanel.fillRect(
      termsX + termsInnerPad,
      termsY + termsInnerPad + PRIZE_EXTEND,
      termsW - 2 * termsInnerPad,
      termsH - 2 * termsInnerPad,
    );
    termsPanel.setDepth(1);

    const termsTitle = this.add
      .text(
        540,
        6206 + MOBILE_LOBBY_CONTENT_DROP_PX + PRIZE_EXTEND - INLINE_RULES_SECTION_LIFT,
        prototypeState.t("rules.title"),
        {
          fontFamily: FONTS.display,
          fontSize: "42px",
          fontStyle: "800",
          color: "#18aef5",
        },
      )
      .setOrigin(0.5);
    termsTitle.setDepth(2);

    this.rulesBodyText = this.add
      .text(132, 6296 + MOBILE_LOBBY_CONTENT_DROP_PX + PRIZE_EXTEND - INLINE_RULES_SECTION_LIFT, "", {
        fontFamily: FONTS.body,
        fontSize: "28px",
        color: "#000000",
        lineSpacing: 10,
        wordWrap: { width: 816, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
    this.rulesBodyText.setDepth(2);
  }

  private drawDevPanel() {
    if (!shouldShowDevEligibilitySwitch()) {
      return;
    }

    this.add
      .text(540, 2258 + MOBILE_LOBBY_CONTENT_DROP_PX, prototypeState.t("lobby.devSwitch"), {
        fontFamily: FONTS.body,
        fontSize: "20px",
        fontStyle: "700",
        color: "#119ae0",
      })
      .setOrigin(0.5);

    DEV_ELIGIBILITY_OPTIONS.forEach((option, index) => {
      const x = 126 + index * 206;
      const background = this.add.rectangle(x, 2310 + MOBILE_LOBBY_CONTENT_DROP_PX, 184, 44, 0xeef9ff, 1);
      background.setStrokeStyle(2, COLORS.line, 0.75);
      background.setInteractive({ useHandCursor: true });
      background.on("pointerup", () => this.runTapAction(() => {
        void prototypeState.setEligibilityOverride(option.value as EligibilityStatus | undefined);
      }));

      const label = this.add
        .text(x, 2310 + MOBILE_LOBBY_CONTENT_DROP_PX, option.label, {
          fontFamily: FONTS.body,
          fontSize: "18px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0.5);

      this.devControls.push({
        background,
        label,
        value: option.value as EligibilityStatus | undefined,
      });
    });
  }

  private setupScrollControls() {
    const handleDown = (pointer: Phaser.Input.Pointer) => {
      this.activeScrollPointerId = pointer.id;
      this.isDraggingScroll = false;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.cameras.main.scrollY;
      this.lastDragY = pointer.y;
      this.lastDragTime = this.time.now;
      this.scrollVelocity = 0;
    };

    const handleMove = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.activeScrollPointerId || !pointer.isDown) {
        return;
      }

      const deltaX = pointer.x - this.dragStartX;
      const deltaY = pointer.y - this.dragStartY;

      if (!this.isDraggingScroll) {
        const passedThreshold = Math.abs(deltaY) > 12;
        const mostlyVertical = Math.abs(deltaY) > Math.abs(deltaX) * 1.15;
        if (!passedThreshold || !mostlyVertical) {
          return;
        }

        this.isDraggingScroll = true;
        this.suppressTapUntil = this.time.now + 220;
      }

      const nextScroll = this.dragStartScrollY - deltaY * MOBILE_SCROLL_DRAG_SENSITIVITY;
      this.setScrollY(nextScroll);

      const now = this.time.now;
      const elapsed = Math.max(1, now - this.lastDragTime);
      const scrollDelta = (this.lastDragY - pointer.y) * MOBILE_SCROLL_DRAG_SENSITIVITY;
      const instantVelocity = scrollDelta / elapsed;
      this.scrollVelocity = Phaser.Math.Linear(this.scrollVelocity, instantVelocity, 0.22);
      this.lastDragY = pointer.y;
      this.lastDragTime = now;
    };

    const handleUp = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.activeScrollPointerId) {
        return;
      }

      if (this.isDraggingScroll) {
        this.suppressTapUntil = this.time.now + 220;
      }

      this.isDraggingScroll = false;
      this.activeScrollPointerId = undefined;
    };

    const handleWheel = (
      _pointer: Phaser.Input.Pointer,
      _gameObjects: Phaser.GameObjects.GameObject[],
      _deltaX: number,
      deltaY: number,
    ) => {
      this.setScrollY(this.cameras.main.scrollY + deltaY * MOBILE_SCROLL_WHEEL_SENSITIVITY);
      this.scrollVelocity = 0;
      this.suppressTapUntil = this.time.now + 120;
    };

    this.input.on("pointerdown", handleDown);
    this.input.on("pointermove", handleMove);
    this.input.on("pointerup", handleUp);
    this.input.on("wheel", handleWheel);

    this.cleanup.push(() => {
      this.input.off("pointerdown", handleDown);
      this.input.off("pointermove", handleMove);
      this.input.off("pointerup", handleUp);
      this.input.off("wheel", handleWheel);
    });
  }

  private refreshDynamicContent() {
    const snapshot = prototypeState.getSnapshot();

    this.periodPill?.setText(
      snapshot.currentEvent?.promotionPeriodLabel
        ? formatEventSelectorPillLabel(snapshot.currentEvent.promotionPeriodLabel)
        : prototypeState.t("lobby.loadingLiveEvent"),
    );
    this.totalPointsText?.setText(formatNumber(snapshot.player?.totalScore ?? 0, snapshot.locale));
    this.eligibilityText?.setText(
      snapshot.currentEvent?.promotionPeriodLabel
        ? `Promotion Period: ${snapshot.currentEvent.promotionPeriodLabel}`
        : snapshot.isBootstrapping
          ? prototypeState.t("lobby.loadingPayload")
          : prototypeState.t("lobby.loadingLiveEvent"),
    );
    this.rulesBodyText?.setText(
      snapshot.currentEvent?.rulesContent || prototypeState.t("rules.loading"),
    );

    const showActivityBubbles = snapshot.currentEvent?.status === "live";
    this.activityBubbles.forEach((bubble) => {
      bubble.container.setVisible(showActivityBubbles);
      if (!showActivityBubbles) {
        bubble.container.setAlpha(0);
      }
    });

    if (showActivityBubbles && snapshot.leaderboard?.leaderboard.length) {
      this.activityBubbles.forEach((bubble) => {
        if (!bubble.text.text || bubble.text.text === "Loading top 30 activity...") {
          this.assignMarqueeMessage(bubble);
        }
      });
    }

    this.refreshLeaderboardSection();
    this.refreshPrizeSection();

    this.devControls.forEach((control) => {
      const isActive = control.value === snapshot.eligibilityOverride;
      control.background.setFillStyle(isActive ? COLORS.accent : 0xeef9ff, 1);
      control.label.setColor("#0a2942");
    });
  }

  private refreshLeaderboardSection() {
    const snapshot = prototypeState.getSnapshot();
    const isPending =
      snapshot.currentEvent?.status === "ended" &&
      snapshot.leaderboard?.resultsVisible === false;
    const pageEntries =
      snapshot.leaderboard?.leaderboard.slice(
        (this.leaderboardPage - 1) * LEADERBOARD_PAGE_SIZE,
        this.leaderboardPage * LEADERBOARD_PAGE_SIZE,
      ) ?? [];

    this.leaderboardPendingText?.setVisible(Boolean(isPending));
    this.leaderboardPendingText?.setText(snapshot.leaderboard?.pendingMessage ?? "");

    this.inlineLeaderboardRows.forEach((row, index) => {
      const entry = pageEntries[index];
      const visible = Boolean(entry) && !isPending;
      row.highlightArrow.setVisible(Boolean(entry?.isSelf) && visible);
      row.plate.setVisible(visible);
      row.playerText.setVisible(visible);
      row.scoreText.setVisible(visible);
      row.prizeText.setVisible(false).setText("");

      if (!entry || isPending) {
        return;
      }

      const slotBaseY = LEADERBOARD_ROW_YS[index] + INLINE_LEADERBOARD_ROW_OFFSET_Y;
      const rowY = this.getLeaderboardRowY(slotBaseY, entry.rank);
      const plateScale = entry.isSelf
        ? INLINE_LEADERBOARD_SELF_PLATE_SCALE
        : INLINE_LEADERBOARD_PLATE_SCALE;
      row.highlightArrow.setY(rowY - slotBaseY);
      row.plate.setTexture(this.getLeaderboardPlateKey(entry.rank));
      row.plate.setY(rowY);
      row.plate.setScale(plateScale);
      row.plate.setX(this.getLeaderboardPlateX(entry.rank, plateScale));
      const textCenterY = this.getLeaderboardTextCenterY(rowY, entry.rank, plateScale);
      row.playerText.setY(textCenterY);
      row.scoreText.setY(textCenterY);
      row.playerText.setText(maskLeaderboardPlayerName(entry.playerName, entry.isSelf));
      row.scoreText.setText(formatNumber(entry.score, snapshot.locale));
      row.prizeText
        .setY(this.getLeaderboardPrizeTextY(rowY, entry.rank, plateScale))
        .setVisible(Boolean(entry.prizeName))
        .setText(entry.prizeName ?? "");
      row.playerText.setColor(entry.isSelf ? "#0896d8" : "#0a2942");
    });

    this.pageTabs.forEach((tab, index) => {
      const isActive = index + 1 === this.leaderboardPage;
      tab.circle.setVisible(isActive);
      tab.label.setColor(isActive ? "#ffffff" : INLINE_LEADERBOARD_PAGE_TAB_TEXT_COLOR);
    });

    const myRank =
      snapshot.leaderboard?.myRank ??
      snapshot.leaderboard?.leaderboard.find((entry) => entry.isSelf) ??
      null;
    const hasMyRank = Boolean(myRank);
    const showTopRankSummaryPlate = Boolean(myRank && myRank.rank <= 30);
    const showNotListedPlate = Boolean(myRank && myRank.rank > 30);
    this.myRankSummaryPlate?.setVisible(hasMyRank);
    this.myRankSummaryPlayerText?.setVisible(hasMyRank);
    this.myRankSummaryScoreText?.setVisible(hasMyRank);
    this.myRankSummaryPrizeText?.setVisible(false).setText("");

    if (myRank) {
      const summarySlotBaseY = INLINE_LEADERBOARD_SUMMARY_Y;
      const summaryPlateY = showTopRankSummaryPlate
        ? this.getLeaderboardRowY(summarySlotBaseY, myRank.rank)
        : summarySlotBaseY;
      const summaryPlateX = showTopRankSummaryPlate
        ? this.getLeaderboardPlateX(myRank.rank, INLINE_LEADERBOARD_SUMMARY_PLATE_SCALE)
        : this.getInlineLeaderboardX(INLINE_LEADERBOARD_PLATE_BASE_X);

      this.myRankSummaryPlate
        ?.setTexture(showTopRankSummaryPlate ? this.getLeaderboardPlateKey(myRank.rank) : "RankingPlate_Notl")
        .setX(summaryPlateX)
        .setY(summaryPlateY)
        .setScale(INLINE_LEADERBOARD_SUMMARY_PLATE_SCALE);

      const summaryTextCenterY = showTopRankSummaryPlate
        ? this.getLeaderboardTextCenterY(summaryPlateY, myRank.rank, INLINE_LEADERBOARD_SUMMARY_PLATE_SCALE)
        : summarySlotBaseY - 4;

      this.myRankSummaryPlayerText
        ?.setY(summaryTextCenterY)
        .setText(myRank.playerName);

      this.myRankSummaryScoreText
        ?.setY(summaryTextCenterY)
        .setText(formatNumber(myRank.score, snapshot.locale));

      this.myRankSummaryPrizeText
        ?.setY(
          showTopRankSummaryPlate
            ? this.getLeaderboardPrizeTextY(
                summaryPlateY,
                myRank.rank,
                INLINE_LEADERBOARD_SUMMARY_PLATE_SCALE,
              )
            : summarySlotBaseY + 32,
        )
        .setVisible(Boolean(myRank.prizeName))
        .setText(myRank.prizeName ?? "");

      this.myRankSummaryText?.setVisible(false).setText("");
    } else {
      this.myRankSummaryPlayerText?.setVisible(false).setText("");
      this.myRankSummaryScoreText?.setVisible(false).setText("");
      this.myRankSummaryPrizeText?.setVisible(false).setText("");
      this.myRankSummaryText
        ?.setPosition(540, INLINE_LEADERBOARD_SUMMARY_Y - 10)
        .setFontSize("26px")
        .setWordWrapWidth(840, true)
        .setAlign("center")
        .setVisible(true)
        .setText(snapshot.isBootstrapping ? "Loading leaderboard..." : "");
    }

    this.refreshLeaderboardFooterText();
  }

  private refreshPrizeSection() {
    const prizes = prototypeState.getSnapshot().prizes;
    this.inlinePrizeRows.forEach((row, index) => {
      const prize = prizes[index];
      const visible = Boolean(prize);
      row.rankBadge.setVisible(visible);
      row.rewardZone.setVisible(visible);
       row.prizeArt.setVisible(false);
      row.prizeLabel.setVisible(false).setText("");
      row.prizeDescription.setVisible(Boolean(prize && !prize.imageUrl));

      if (!prize) {
        return;
      }

      row.prizeDescription.setText(
        prize.accentLabel || prototypeState.t("prize.defaultAccent"),
      );
      row.rewardZone.setAlpha(prize.imageUrl ? 0.28 : 1);
      syncPrizeArtImage(this, row.prizeArt, prize.imageUrl, 624, 308);
    });
  }

  private refreshLeaderboardFooterText() {
    const snapshot = prototypeState.getSnapshot();
    const lastSyncedValue = snapshot.leaderboard?.lastSyncedAt
      ? formatDateWithGmtOffset(snapshot.leaderboard.lastSyncedAt, snapshot.locale, {
          dateStyle: "short",
          timeStyle: "medium",
        })
      : "-";

    const footerLines = [
      prototypeState.t("leaderboard.lastSynced", {
        value: lastSyncedValue,
      }),
    ];

    if (snapshot.currentEvent?.status === "live") {
      const remainingMs = getNextLeaderboardRefreshRemainingMs(snapshot.leaderboard?.lastSyncedAt);
      if (remainingMs !== null) {
        footerLines.push(
          prototypeState.t("leaderboard.nextRefreshIn", {
            value: formatCountdownDuration(remainingMs),
          }),
        );
      }
    }

    this.leaderboardLastSyncedText?.setText(footerLines.join("\n"));
  }

  private updateActivityBubbles(_time: number, delta: number) {
    this.applyScrollMomentum(delta);

    if (this.activityBubbles.length === 0 || !this.activitySection?.visible) {
      return;
    }

    if (prototypeState.getSnapshot().currentEvent?.status !== "live") {
      this.activityBubbles.forEach((bubble) => {
        bubble.container.setVisible(false);
        bubble.container.setAlpha(0);
      });
      return;
    }

    this.activityBubbles.forEach((bubble) => {
      bubble.container.setVisible(true);

      if (bubble.delayRemaining > 0) {
        bubble.delayRemaining = Math.max(0, bubble.delayRemaining - delta);
        return;
      }

      bubble.progress = Math.min(1, bubble.progress + delta / bubble.duration);
      const easedProgress = Phaser.Math.Easing.Cubic.Out(bubble.progress);

      bubble.container.setPosition(
        bubble.startX,
        Phaser.Math.Linear(bubble.startY, bubble.endY, easedProgress),
      );
      bubble.container.setScale(
        Phaser.Math.Linear(bubble.startScale, bubble.endScale, easedProgress),
      );

      let alpha = 0.96;
      const FADE_IN_END = 0.18;
      const FADE_OUT_START = 0.88;
      if (bubble.progress < FADE_IN_END) {
        alpha = 0.96 * (bubble.progress / FADE_IN_END);
      } else if (bubble.progress > FADE_OUT_START) {
        alpha = 0.96 * (1 - (bubble.progress - FADE_OUT_START) / (1 - FADE_OUT_START));
      }
      bubble.container.setAlpha(Phaser.Math.Clamp(alpha, 0, 0.96));

      if (bubble.progress >= 1) {
        this.resetActivityBubble(bubble);
      }
    });
  }

  private applyScrollMomentum(delta: number) {
    if (this.isDraggingScroll || Math.abs(this.scrollVelocity) < 0.01) {
      return;
    }

    this.setScrollY(this.cameras.main.scrollY + this.scrollVelocity * delta * MOBILE_SCROLL_MOMENTUM_SENSITIVITY);
    this.scrollVelocity *= MOBILE_SCROLL_MOMENTUM_DECAY;

    const maxScroll = CONTENT_HEIGHT - STAGE_HEIGHT;
    if (this.cameras.main.scrollY <= 0 || this.cameras.main.scrollY >= maxScroll) {
      this.scrollVelocity *= 0.55;
    }

    if (Math.abs(this.scrollVelocity) < 0.01) {
      this.scrollVelocity = 0;
    }
  }

  private resetActivityBubble(
    bubble: ActivityBubble,
    delayMs = Phaser.Math.Between(360, 1100),
  ) {
    bubble.delayRemaining = delayMs;
    bubble.progress = 0;
    bubble.duration = Phaser.Math.Between(2500, 3200);
    bubble.startX = this.getRandomBubbleX(bubble.width / 2);
    bubble.startY = Phaser.Math.Between(ACTIVITY_BUBBLE_MIN_Y, ACTIVITY_BUBBLE_MAX_Y);
    bubble.endY = Math.max(
      ACTIVITY_BUBBLE_MIN_Y,
      bubble.startY - Phaser.Math.Between(ACTIVITY_BUBBLE_MIN_TRAVEL_Y, ACTIVITY_BUBBLE_MAX_TRAVEL_Y),
    );
    bubble.startScale = Phaser.Math.FloatBetween(0.78, 0.88);
    bubble.endScale = bubble.startScale + Phaser.Math.FloatBetween(0.08, 0.15);
    bubble.container.setPosition(bubble.startX, bubble.startY);
    bubble.container.setAlpha(0);
    bubble.container.setScale(bubble.startScale);
    this.assignMarqueeMessage(bubble);
  }

  private assignMarqueeMessage(bubble: ActivityBubble) {
    const snapshot = prototypeState.getSnapshot();
    const entries = snapshot.leaderboard?.leaderboard ?? [];

    if (entries.length === 0) {
      bubble.text.setText("Loading top 30 activity...");
      return;
    }

    const entry = entries[Math.floor(Math.random() * Math.min(entries.length, 30))];
    const playerId = this.formatMarqueePlayerId(entry.playerName);
    const points = this.getRandomMarqueePoints();

    bubble.text.setText(`${playerId} earned ${formatNumber(points, snapshot.locale)} points`);
  }

  private getRandomMarqueePoints() {
    const segmentLabels =
      prototypeState
        .getSnapshot()
        .currentEvent?.wheelSegments.map((segment) => Number(segment.label.replace(/[^\d]/g, "")))
        .filter((value) => Number.isFinite(value) && value >= 10) ?? [];

    const pointsPool = segmentLabels.length > 0 ? segmentLabels : [40, 80, 120];
    return pointsPool[Math.floor(Math.random() * pointsPool.length)];
  }

  private formatMarqueePlayerId(playerName: string) {
    return maskLeaderboardPlayerName(playerName);
  }

  private getRandomBubbleX(halfWidth: number) {
    const anchors = [255, 540, 825];
    const anchor = anchors[Math.floor(Math.random() * anchors.length)];
    return Phaser.Math.Clamp(
      anchor + Phaser.Math.Between(-36, 36),
      halfWidth + 20,
      STAGE_WIDTH - halfWidth - 20,
    );
  }

  private captureSection(top: number, bottom: number, draw: () => void, overscan = 220) {
    const startIndex = this.children.list.length;
    draw();

    const getDepth = (child: Phaser.GameObjects.GameObject) => {
      const depth = (child as Phaser.GameObjects.GameObject & { depth?: number }).depth;
      return typeof depth === "number" ? depth : 0;
    };
    const createdChildren = (this.children.list.slice(startIndex) as Phaser.GameObjects.GameObject[])
      .map((child, index) => ({ child, index }))
      .sort((left, right) =>
        getDepth(left.child) === getDepth(right.child)
          ? left.index - right.index
          : getDepth(left.child) - getDepth(right.child),
      )
      .map((entry) => entry.child);
    const container = this.add.container(0, 0);
    if (createdChildren.length > 0) {
      container.add(createdChildren);
    }

    this.sectionBands.push({
      container,
      top,
      bottom,
      overscan,
    });

    return container;
  }

  private refreshSectionVisibility() {
    const viewTop = this.cameras.main.scrollY;
    const viewBottom = viewTop + STAGE_HEIGHT;

    this.sectionBands.forEach((section) => {
      const visible =
        section.bottom >= viewTop - section.overscan &&
        section.top <= viewBottom + section.overscan;

      if (section.container.visible !== visible) {
        section.container.setVisible(visible);
      }
    });
  }

  private getLeaderboardPlateKey(rank: number) {
    return LEADERBOARD_PLATE_KEYS[rank - 1] ?? "RankingPlate_Notl";
  }

  private getLeaderboardPlateX(rank: number, scaleX: number) {
    const baseX = this.getInlineLeaderboardX(INLINE_LEADERBOARD_PLATE_BASE_X);
    const baselineVisualCenterOffset = -0.5;
    const visualCenterOffset = LEADERBOARD_PLATE_VISUAL_CENTER_OFFSETS[rank] ?? baselineVisualCenterOffset;
    return baseX + (baselineVisualCenterOffset - visualCenterOffset) * scaleX;
  }

  private getInlineLeaderboardX(editorX: number) {
    return this.fromEditorX(editorX + INLINE_LEADERBOARD_LAYOUT_OFFSET_X);
  }

  private getLeaderboardRowY(baseRowY: number, rank: number) {
    const slotRank = ((rank - 1) % LEADERBOARD_PAGE_SIZE) + 1;
    const targetVisualCenterOffset = LEADERBOARD_PLATE_VISUAL_CENTER_Y_OFFSETS[slotRank] ?? 0;
    const visualCenterOffset =
      LEADERBOARD_PLATE_VISUAL_CENTER_Y_OFFSETS[rank] ?? targetVisualCenterOffset;

    // Normalize rank-plate PNGs with inconsistent transparent top/bottom padding
    // so pages 2 and 3 align to the same row grid as page 1.
    return baseRowY + (targetVisualCenterOffset - visualCenterOffset) * INLINE_LEADERBOARD_PLATE_SCALE;
  }

  /**
   * Vertical center of the plate's white data cell on screen; use this for
   * username / total-points text so they sit in the row's visual middle.
   */
  private getLeaderboardTextCenterY(rowY: number, rank: number, plateScale: number) {
    const offset = LEADERBOARD_PLATE_TEXT_CENTER_IMG_OFFSETS[rank] ?? 0;
    return rowY + offset * plateScale;
  }

  private getLeaderboardPrizeTextY(rowY: number, rank: number, plateScale: number) {
    const offset =
      LEADERBOARD_PLATE_PRIZE_BADGE_CENTER_IMG_OFFSETS[rank] ??
      LEADERBOARD_PLATE_PRIZE_BADGE_CENTER_IMG_OFFSETS[30];
    return rowY + offset * plateScale;
  }

  private createActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
  ) {
    const button = this.add.rectangle(x, y, width, height, COLORS.white, 0.98);
    button.setStrokeStyle(2, COLORS.line, 0.7);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerover", () => button.setScale(1.02));
    button.on("pointerout", () => button.setScale(1));
    button.on("pointerup", () => this.runTapAction(onClick));

    this.add
      .text(x, y, label, {
        fontFamily: FONTS.display,
        fontSize: "34px",
        fontStyle: "700",
        color: "#18aef5",
      })
      .setOrigin(0.5);
  }

  private createHistoryActionButton(x: number, y: number, onClick: () => void) {
    const width = 214;
    const height = 72;
    const container = this.add.container(x, y);
    const arrowCenterX = 72;

    const label = this.add
      .text(-18, 1, prototypeState.t("lobby.history"), {
        fontFamily: FONTS.display,
        fontSize: "36px",
        fontStyle: "700",
        color: "#149fe4",
      })
      .setOrigin(0.5);

    const arrowBubble = this.add.circle(arrowCenterX, 0, 28, 0xf5fcff, 1);
    arrowBubble.setStrokeStyle(1.5, 0xf9feff, 0.98);

    const chevron = this.add.graphics();
    chevron.lineStyle(6, 0x19a6eb, 1);
    chevron.beginPath();
    chevron.moveTo(arrowCenterX - 7, -10);
    chevron.lineTo(arrowCenterX + 5, 0);
    chevron.lineTo(arrowCenterX - 7, 10);
    chevron.strokePath();

    container.add([label, arrowBubble, chevron]);

    const labelHitArea = this.add.rectangle(x - 18, y, 154, height, 0xffffff, 0);
    labelHitArea.setInteractive({ useHandCursor: true });

    const arrowHitArea = this.add.circle(x + arrowCenterX, y, 34, 0xffffff, 0);
    arrowHitArea.setInteractive({ useHandCursor: true });

    const handlePointerOver = () => {
      container.setScale(1.02);
      label.setColor("#0f94d8");
      arrowBubble.setFillStyle(0xf1fbff, 1);
      arrowBubble.setStrokeStyle(1.5, 0xf5fdff, 1);
    };

    const handlePointerOut = () => {
      container.setScale(1);
      label.setColor("#149fe4");
      arrowBubble.setFillStyle(0xf5fcff, 1);
      arrowBubble.setStrokeStyle(1.5, 0xf9feff, 0.98);
    };

    const handlePointerDown = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    };

    const handlePointerUp = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.runTapAction(onClick);
    };

    [labelHitArea, arrowHitArea].forEach((target) => {
      target.on("pointerover", handlePointerOver);
      target.on("pointerout", handlePointerOut);
      target.on("pointerdown", handlePointerDown);
      target.on("pointerup", handlePointerUp);
    });
  }

  private scrollTo(targetY: number) {
    this.scrollVelocity = 0;
    const target = Phaser.Math.Clamp(targetY, 0, CONTENT_HEIGHT - STAGE_HEIGHT);
    this.tweens.addCounter({
      from: this.cameras.main.scrollY,
      to: target,
      duration: 420,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        this.setScrollY(tween.getValue() ?? target);
      },
    });
  }

  private setScrollY(scrollY: number) {
    const clamped = Phaser.Math.Clamp(scrollY, 0, CONTENT_HEIGHT - STAGE_HEIGHT);
    this.cameras.main.setScroll(0, clamped);
    this.registry.set("mainScrollY", clamped);
    this.refreshSectionVisibility();
  }

  private runTapAction(action: () => void) {
    if (this.isDraggingScroll || this.time.now < this.suppressTapUntil) {
      return;
    }

    action();
  }

  private fromEditorX(value: number) {
    return value * (STAGE_WIDTH / 750);
  }

  private getPlatformLinkUrl(type: PlatformLinkType) {
    if (type === PlatformLinkType.Deposit) {
      return prototypeState.getDepositUrl();
    }

    return prototypeState
      .getSnapshot()
      .currentEvent?.platformLinks.find((link) => link.type === type)?.url;
  }

  private toggleOverlay(key: string) {
    if (this.scene.isActive(key)) {
      this.scene.stop(key);
      return;
    }

    this.scene.launch(key);
  }
}
