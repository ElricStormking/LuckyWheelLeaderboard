import Phaser from "phaser";
import {
  EventStatus,
  EligibilityStatus,
  PlatformLinkType,
  WheelVisualState,
  type SpinSuccessResponse,
  type WheelSegmentDto,
} from "@lucky-wheel/contracts";
import { ensureBackgroundMusic, playWinningEffect } from "../../audio";
import {
  addRoundedPanel,
  addTextButton,
  formatCountdownDuration,
  formatDate,
  formatNumber,
  getNextLeaderboardRefreshRemainingMs,
  maskLeaderboardPlayerName,
  openExternalLink,
} from "../../helpers";
import {
  COLORS,
  FONTS,
  SCENE_KEYS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  shouldShowDevEligibilitySwitch,
} from "../../constants";
import { prototypeState } from "../../state/prototype-state";
import { syncPrizeArtImage } from "../../prizeImageLoader";
import { createRibbonsBurst } from "../../ribbonsFx";
import { DesktopPageScene } from "./DesktopPageScene";
import {
  DESKTOP_RANKING_PLATE_KEYS,
  DESKTOP_PAGE_CENTER_X,
  DESKTOP_PAGE_CENTER_Y,
  DESKTOP_PRIZE_BADGE_KEYS,
  getDesktopRankingPrizeTextPosition,
  getDesktopPlatformLinkUrl,
  wireImageButton,
} from "./desktopSceneShared";

type PickerOption = {
  label: string;
  description?: string;
  selected?: boolean;
  onSelect: () => Promise<void> | void;
};

type DesktopEventPickerEntry = {
  id: string;
  code: string;
  title: string;
  shortDescription: string;
  promotionPeriodLabel: string;
  status: EventStatus;
};

type DesktopEventTone = {
  accent: number;
  deep: number;
  soft: number;
  wash: number;
  edge: number;
  chipText: string;
  dateText: string;
};

type ActivityPill = {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  width: number;
  delayRemaining: number;
  progress: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  alphaPeak: number;
  startScale: number;
  endScale: number;
};

type DesktopWheelButton = {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  setLabel: (nextLabel: string) => void;
  setBackground: (color: number) => void;
  setEnabled: (enabled: boolean) => void;
};

type DesktopLeaderboardRow = {
  x: number;
  y: number;
  plate: Phaser.GameObjects.Image;
  playerText: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  prizeText: Phaser.GameObjects.Text;
};

type DesktopPrizeRow = {
  rankBadge: Phaser.GameObjects.Image;
  rewardZone: Phaser.GameObjects.Image;
  prizeArt: Phaser.GameObjects.Image;
  prizeLabel: Phaser.GameObjects.Text;
  prizeDescription: Phaser.GameObjects.Text;
};

type RankPalette = {
  fill: number;
  shadow: number;
  stripe: number;
  pillFill: number;
  rankColor: string;
  suffixColor: string;
  amountColor: string;
};

type PrizeRowLayout = {
  badgeX: number;
  rewardX: number;
  y: number;
  badgeScale: number;
  rewardScale: number;
  align: "left" | "right";
};

const CONTENT_HEIGHT = 5640;
const TOP_SECTION_END = 1460;
const LEADERBOARD_SECTION_TOP = 1460;
const PRIZE_SECTION_TOP = 2960;
const TERMS_SECTION_TOP = 4700;

const HEADER_Y = 74;
const HEADER_FOREGROUND_DEPTH = 100;
const MODAL_DEPTH = 220;
const HEADER_SHADOW_WIDTH = 1880;
const HEADER_FRAME_SCALE_X = 1.095;
/** Sample event picker center sample x=1736 → stage = 1082 (DESKTOP_PAGE_CENTER_X + 122). */
const EVENT_SELECTOR_X = DESKTOP_PAGE_CENTER_X + 122;
/** Sample picker: 299 × 55 stage-px → scaleX = 299/1096 = 0.273, scaleY = 55/347 = 0.159. */
const EVENT_SELECTOR_FRAME_SCALE_X = 0.273;
const EVENT_SELECTOR_FRAME_SCALE_Y = 0.159;
const EVENT_SELECTOR_FRAME_HOVER_SCALE_X = 0.277;
const EVENT_SELECTOR_FRAME_HOVER_SCALE_Y = 0.163;
const EVENT_SELECTOR_TEXT_OFFSET_X = -8;
const EVENT_SELECTOR_CHEVRON_OFFSET_X = 122;
const EVENT_SELECTOR_LABEL_WIDTH = 248;
const EVENT_SELECTOR_HIT_WIDTH = 390;
const EVENT_SELECTOR_HIT_HEIGHT = 66;
const DESKTOP_EVENT_PICKER_PANEL_WIDTH = 900;
const DESKTOP_EVENT_PICKER_CARD_WIDTH = 760;
const DESKTOP_EVENT_PICKER_CARD_HEIGHT = 128;
const DESKTOP_EVENT_PICKER_CARD_STEP_Y = 148;
const DESKTOP_EVENT_PICKER_STATUS_BAY_WIDTH = 92;
const DESKTOP_EVENT_PICKER_POINTER_ACCENT = 0x1db9ff;
const DESKTOP_EVENT_PICKER_POINTER_DEEP = 0x0c7bbd;

const HERO_TITLE_Y = 220;
const HERO_TUTORIAL_Y = 351;
/** Sample design y≈336 (gray Promotion Period line) → stage = 419. */
const HERO_PERIOD_Y = 434;
const ACTIVITY_BOARD_LEFT = 232;
const ACTIVITY_BOARD_RIGHT = 1688;
const ACTIVITY_BOARD_TOP = 500;
const ACTIVITY_BOARD_BOTTOM = 826;
/**
 * Two spawn bands flanking the wheel column (sample places pills on sides,
 * not over the wheel). Wheel visual ≈ x[617..1303]; use margins wider.
 */
const ACTIVITY_BAND_LEFT_MIN_X = 60;
const ACTIVITY_BAND_LEFT_MAX_X = 580;
const ACTIVITY_BAND_RIGHT_MIN_X = 1340;
const ACTIVITY_BAND_RIGHT_MAX_X = 1860;
const ACTIVITY_PILL_END_MIN_Y = HERO_PERIOD_Y + 14;
const ACTIVITY_PILL_END_MAX_Y = HERO_PERIOD_Y + 44;
const ACTIVITY_PILL_START_MIN_Y = 660;
const ACTIVITY_PILL_START_MAX_Y = 960;
const ACTIVITY_PILL_WIDTHS = [210, 238, 264, 286] as const;
const ACTIVITY_PILL_HEIGHT = 42;

const WHEEL_CENTER_X = 960;
/** Sample widest-row y=1405 → design 702 → stage = 875. */
const WHEEL_CENTER_Y = 915;
/** Sample diameter = 1202 sample-px = 601 design-px = 749 stage-px → scale = 749/972 = 0.771. */
const WHEEL_SCALE = 0.771;
const WHEEL_ASSET_SIZE = 972;
const POINTER_X = 960;
const POINTER_SCALE = 0.6;
const POINTER_ASSET_HEIGHT = 138;
const POINTER_Y_OFFSET = 15;
// Drop roughly half the desktop pointer into the wheel rim.
const POINTER_Y =
  WHEEL_CENTER_Y -
  (WHEEL_ASSET_SIZE * WHEEL_SCALE) / 2 +
  (POINTER_ASSET_HEIGHT * POINTER_SCALE) / 2 +
  POINTER_Y_OFFSET;
/** Sample design y≈1063 → stage y = 1063 * 1920/1540 = 1325. */
const SUMMARY_PANEL_Y = 1365;
const HISTORY_BUTTON_Y = SUMMARY_PANEL_Y + 88;
const LEADERBOARD_TITLE_Y = LEADERBOARD_SECTION_TOP + 144;
const LEADERBOARD_BACKGROUND_TOP = (HISTORY_BUTTON_Y + LEADERBOARD_TITLE_Y) / 2;

const LEADERBOARD_COLUMN_LEFTS = [320, 764, 1208] as const;
const LEADERBOARD_ROW_WIDTH = 392;
const LEADERBOARD_ROW_HEIGHT = 74;
const LEADERBOARD_HEADER_LABEL_Y = LEADERBOARD_SECTION_TOP + 312;
const LEADERBOARD_HEADER_DIVIDER_Y = LEADERBOARD_SECTION_TOP + 346;
const LEADERBOARD_ROW_START_Y = LEADERBOARD_SECTION_TOP + 398;
const LEADERBOARD_ROW_SPACING = 75;
const LEADERBOARD_PANEL_RADIUS = 24;
const LEADERBOARD_PLATE_SCALE = 0.156;
const LEADERBOARD_HEADER_FONT_SIZE = "18px";
const LEADERBOARD_TITLE_DISPLAY_WIDTH = 278;
const LEADERBOARD_TITLE_DISPLAY_HEIGHT = 75;
const LEADERBOARD_SUBTITLE_FONT_SIZE = "18px";
const LEADERBOARD_HEADER_RANK_X = 54;
const LEADERBOARD_HEADER_USERNAME_X = 202;
const LEADERBOARD_HEADER_SCORE_X = 336;
const LEADERBOARD_PRIZE_TEXT_FONT_SIZE = "12px";
const LEADERBOARD_ROW_TEXT_CENTER_OFFSET_Y = 5;
const LEADERBOARD_PLATE_VISUAL_CENTER_SOURCE_Y_OFFSETS = [
  -2.5, -2, -2, 0.5, 2.5, 4, 12.5, 8.5, 8.5, -2.5,
  27.5, 1.5, -2, 14, 6, -34.5, 1.5, 8.5, 0.5, 49.5,
  46.5, 49.5, 49.5, 48, 46, 46, 47, 47, 47, 47,
] as const;
const LEADERBOARD_PLATE_VISUAL_LEFT_SOURCE_X_OFFSETS = [
  -1223, -1223, -1223, -1223, -1223, -1223, -1223, -1215, -1223, -1223,
  -1190, -1217.5, -1223, -1189, -1198, -1223, -1223, -1207.5, -1204, -1198.5,
  -1198.5, -1198.5, -1198.5, -1198.5, -1198.5, -1198.5, -1198.5, -1198.5, -1198.5, -1198.5,
] as const;
const LEADERBOARD_SUMMARY_Y = PRIZE_SECTION_TOP - 290;
const LEADERBOARD_SUMMARY_DIVIDER_Y =
  (LEADERBOARD_ROW_START_Y + 9 * LEADERBOARD_ROW_SPACING + LEADERBOARD_SUMMARY_Y) / 2;
const LEADERBOARD_FOOTER_Y = LEADERBOARD_SUMMARY_Y + 88;
const PRIZE_BACKGROUND_TOP = PRIZE_SECTION_TOP - 70;
const LEADERBOARD_PLAYER_OFFSET_X = 168;
const LEADERBOARD_SCORE_INSET = 16;
const PRIZE_SECTION_CONTENT_LIFT = 122;
const TERMS_SECTION_CONTENT_LIFT = 170;

const PRIZE_ROW_LAYOUTS: PrizeRowLayout[] = [
  { badgeX: 672, rewardX: 1100, y: 3318 - PRIZE_SECTION_CONTENT_LIFT, badgeScale: 0.92, rewardScale: 0.92, align: "left" },
  { badgeX: 1248, rewardX: 820, y: 3608 - PRIZE_SECTION_CONTENT_LIFT, badgeScale: 0.92, rewardScale: 0.92, align: "right" },
  { badgeX: 672, rewardX: 1100, y: 3898 - PRIZE_SECTION_CONTENT_LIFT, badgeScale: 0.92, rewardScale: 0.92, align: "left" },
  { badgeX: 1248, rewardX: 820, y: 4188 - PRIZE_SECTION_CONTENT_LIFT, badgeScale: 0.92, rewardScale: 0.92, align: "right" },
  { badgeX: 672, rewardX: 1100, y: 4478 - PRIZE_SECTION_CONTENT_LIFT, badgeScale: 0.92, rewardScale: 0.92, align: "left" },
];

const CELEBRATION_DURATION_MS = 6000;
const FIREWORK_CADENCE_MS = 420;
const FIREWORK_BURST_COUNT = Math.ceil(CELEBRATION_DURATION_MS / FIREWORK_CADENCE_MS);
const FIREWORK_EFFECT_DEPTH = 6;
const SEGMENT_HIGHLIGHT_OUTER_RADIUS = 410;
const SEGMENT_HIGHLIGHT_INNER_RADIUS = 122;
const SEGMENT_HIGHLIGHT_DOT_COUNT = 5;
const SEGMENT_HIGHLIGHT_SHADOW = 0x8a4300;
const SEGMENT_HIGHLIGHT_ORANGE = 0xff8b1f;
const SEGMENT_HIGHLIGHT_GOLD = 0xffcb47;
const SEGMENT_HIGHLIGHT_GOLD_SOFT = 0xffefad;
const SEGMENT_HIGHLIGHT_AMBER = 0xffb347;
const ENDED_WHEEL_TEXT_DARK = "#50555d";
const ENDED_WHEEL_TEXT_LIGHT = "#f3f5f7";

function getLeaderboardPlateCenterX(rowX: number, rank: number) {
  const rowIndex = (rank - 1) % 10;
  const targetOffset = LEADERBOARD_PLATE_VISUAL_LEFT_SOURCE_X_OFFSETS[rowIndex] ?? 0;
  const sourceOffset = LEADERBOARD_PLATE_VISUAL_LEFT_SOURCE_X_OFFSETS[rank - 1] ?? 0;

  return rowX + (targetOffset - sourceOffset) * LEADERBOARD_PLATE_SCALE;
}

function getLeaderboardPlateCenterY(rowY: number, rank: number) {
  const rowIndex = (rank - 1) % 10;
  const targetOffset = LEADERBOARD_PLATE_VISUAL_CENTER_SOURCE_Y_OFFSETS[rowIndex] ?? 0;
  const sourceOffset = LEADERBOARD_PLATE_VISUAL_CENTER_SOURCE_Y_OFFSETS[rank - 1] ?? 0;

  return rowY + (targetOffset - sourceOffset) * LEADERBOARD_PLATE_SCALE;
}

function getLeaderboardRowTextCenterY(rowY: number, rank: number) {
  const rowIndex = (rank - 1) % 10;
  const targetOffset = LEADERBOARD_PLATE_VISUAL_CENTER_SOURCE_Y_OFFSETS[rowIndex] ?? 0;

  return rowY + LEADERBOARD_ROW_TEXT_CENTER_OFFSET_Y + targetOffset * LEADERBOARD_PLATE_SCALE;
}

export class DesktopMainScene extends DesktopPageScene {
  private periodLabel?: Phaser.GameObjects.Text;
  private promotionPeriodText?: Phaser.GameObjects.Text;
  private headerPointsText?: Phaser.GameObjects.Text;
  private summaryPointsText?: Phaser.GameObjects.Text;
  private playerText?: Phaser.GameObjects.Text;
  private leaderboardTitleImage?: Phaser.GameObjects.Image;
  private leaderboardSubtitleText?: Phaser.GameObjects.Text;
  private leaderboardPendingPanel?: Phaser.GameObjects.Container;
  private leaderboardPendingText?: Phaser.GameObjects.Text;
  private leaderboardMyRankPlate?: Phaser.GameObjects.Image;
  private leaderboardMyRankPlayerText?: Phaser.GameObjects.Text;
  private leaderboardMyRankScoreText?: Phaser.GameObjects.Text;
  private leaderboardMyRankPrizeText?: Phaser.GameObjects.Text;
  private leaderboardMyRankText?: Phaser.GameObjects.Text;
  private leaderboardLastSyncedText?: Phaser.GameObjects.Text;
  private prizeSubtitleText?: Phaser.GameObjects.Text;
  private rulesBodyText?: Phaser.GameObjects.Text;
  private pickerContainer?: Phaser.GameObjects.Container;
  private pickerBusy = false;
  private activityPills: ActivityPill[] = [];
  private leaderboardRows: DesktopLeaderboardRow[] = [];
  private prizeRows: DesktopPrizeRow[] = [];

  private wheelRoot?: Phaser.GameObjects.Container;
  private wheelRotation = 0;
  private renderedWheelSignature = "";
  private renderedHighlightIndex?: number;
  private button?: DesktopWheelButton;
  private testSpinButton?: ReturnType<typeof addTextButton>;
  private currentEligibility?: EligibilityStatus;
  private currentWheelVisualState = WheelVisualState.Normal;
  private spinning = false;
  private pointer?: Phaser.GameObjects.Image;
  private highlightedSegmentIndex?: number;
  private highlightGraphic?: Phaser.GameObjects.Container;
  private highlightTween?: Phaser.Tweens.Tween;
  private celebrationTimer?: Phaser.Time.TimerEvent;
  private celebrationBursts: Phaser.Time.TimerEvent[] = [];

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
    super(SCENE_KEYS.DesktopMain);
  }

  create() {
    ensureBackgroundMusic(this);

    this.cameras.main.setBackgroundColor(COLORS.pageTop);
    this.cameras.main.setBounds(0, 0, STAGE_WIDTH, CONTENT_HEIGHT);

    this.drawScrollableBackground();
    this.createHeader();
    this.createHero();
    this.createWheelSection();
    this.createLeaderboardSection();
    this.createPrizeSection();
    this.createTermsSection();
    this.setupScrollControls();
    const leaderboardFooterTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.refreshLeaderboardFooterText(),
    });

    this.bindPrototypeLifecycle(() => this.refreshDynamicContent());
    this.cleanup.push(
      () => leaderboardFooterTimer.destroy(),
      prototypeState.subscribe("spin-start", () => {
        this.spinning = true;
        this.applyState();
      }),
      prototypeState.subscribe(
        "spin-result",
        ((event: Event) => {
          const detail = (event as CustomEvent<SpinSuccessResponse>).detail;
          this.animateToSegment(detail);
        }) as EventListener,
      ),
    );

    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateScene, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, this.updateScene, this);
      this.highlightTween?.stop();
      this.highlightGraphic?.destroy();
      this.celebrationTimer?.remove(false);
      this.clearCelebrationBursts();
      this.closePicker();
      this.activityPills = [];
      this.leaderboardRows = [];
      this.prizeRows = [];
    });

    this.setScrollY(Number(this.registry.get("desktopScrollY") ?? 0));
    this.refreshDynamicContent();

    const scrollParam = new URL(window.location.href).searchParams.get("scroll");
    if (scrollParam !== null) {
      const parsed = Number.parseInt(scrollParam, 10);
      if (Number.isFinite(parsed)) {
        this.setScrollY(Phaser.Math.Clamp(parsed, 0, CONTENT_HEIGHT - STAGE_HEIGHT));
      }
    }
  }

  private drawScrollableBackground() {
    const desktopMainBackground = 0xd8f4ff;
    const leaderboardBackground = 0xf1f3f7;
    const topGradientStart = 0xffffff;
    const topGradientEnd = desktopMainBackground;
    const topGradientSteps = 96;
    const gradient = this.add.graphics();
    for (let step = 0; step < topGradientSteps; step += 1) {
      const y = (LEADERBOARD_BACKGROUND_TOP * step) / topGradientSteps;
      const nextY = (LEADERBOARD_BACKGROUND_TOP * (step + 1)) / topGradientSteps;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(topGradientStart),
        Phaser.Display.Color.IntegerToColor(topGradientEnd),
        topGradientSteps - 1,
        step,
      );
      gradient.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
      gradient.fillRect(0, y, STAGE_WIDTH, nextY - y + 1);
    }
    gradient.fillStyle(desktopMainBackground, 1);
    gradient.fillRect(0, LEADERBOARD_BACKGROUND_TOP, STAGE_WIDTH, CONTENT_HEIGHT - LEADERBOARD_BACKGROUND_TOP);

    const sectionBands = this.add.graphics();
    sectionBands.fillStyle(leaderboardBackground, 1);
    sectionBands.fillRect(0, LEADERBOARD_BACKGROUND_TOP, STAGE_WIDTH, PRIZE_BACKGROUND_TOP - LEADERBOARD_BACKGROUND_TOP);
    sectionBands.fillStyle(COLORS.white, 1);
    sectionBands.fillRect(0, PRIZE_BACKGROUND_TOP, STAGE_WIDTH, TERMS_SECTION_TOP - PRIZE_BACKGROUND_TOP);
    sectionBands.fillStyle(COLORS.white, 1);
    sectionBands.fillRect(0, TERMS_SECTION_TOP, STAGE_WIDTH, CONTENT_HEIGHT - TERMS_SECTION_TOP);

    const atmosphere = this.add.graphics();
    atmosphere.fillStyle(COLORS.stageMist, 0.08);
    atmosphere.fillCircle(250, 280, 220);
    atmosphere.fillCircle(1645, 360, 210);
    atmosphere.fillCircle(960, 960, 460);
    atmosphere.fillCircle(1240, 2250, 380);
    atmosphere.fillCircle(420, 2580, 300);
    atmosphere.fillCircle(1460, 3620, 340);
    this.add
      .image(DESKTOP_PAGE_CENTER_X, 1110, "Desktop_MainBackgroundAccent")
      .setScale(1.04)
      .setAlpha(0.12);

    const leaderboardGlow = this.add.graphics();
    leaderboardGlow.fillStyle(0xdce3eb, 0.18);
    leaderboardGlow.fillEllipse(960, 2240, 1450, 520);
    leaderboardGlow.fillStyle(0xffffff, 0.34);
    leaderboardGlow.fillEllipse(960, 2420, 840, 280);

    const prizeGlow = this.add.graphics();
    prizeGlow.fillStyle(0xffffff, 0.2);
    prizeGlow.fillEllipse(960, 3940, 1380, 760);
    prizeGlow.fillStyle(0x8fddff, 0.18);
    prizeGlow.fillEllipse(960, 4260, 980, 280);

    const separators = this.add.graphics();
    separators.fillStyle(0xffffff, 0.88);
    separators.fillRect(0, PRIZE_BACKGROUND_TOP - 16, STAGE_WIDTH, 16);
    separators.fillRect(0, TERMS_SECTION_TOP - 16, STAGE_WIDTH, 16);
  }

  private createHeader() {
    const headerShadow = this.add.rectangle(960, HEADER_Y + 4, HEADER_SHADOW_WIDTH, 88, 0x58abd3, 0.08);
    headerShadow.setDepth(HEADER_FOREGROUND_DEPTH - 2);

    const header = this.add.image(960, HEADER_Y, "Desktop_HudFrame");
    header.setScale(HEADER_FRAME_SCALE_X, 1);
    header.setDepth(HEADER_FOREGROUND_DEPTH - 1);

    const logo = this.add.image(130, HEADER_Y + 1, "Desktop_LogoIBET");
    logo.setScale(1.08);
    logo.setDepth(HEADER_FOREGROUND_DEPTH);

    this.createHeaderTab(391, "EVENT PAGE", true, () => this.scrollTo(0));
    this.createHeaderTab(513, "DEPOSIT", false, () => {
      openExternalLink(getDesktopPlatformLinkUrl(PlatformLinkType.Deposit));
    });

    const periodFrame = this.add.image(EVENT_SELECTOR_X, HEADER_Y + 1, "Desktop_FrameTime");
    periodFrame.setScale(EVENT_SELECTOR_FRAME_SCALE_X, EVENT_SELECTOR_FRAME_SCALE_Y);
    periodFrame.setDepth(HEADER_FOREGROUND_DEPTH - 1);

    this.periodLabel = this.add.text(
      EVENT_SELECTOR_X + EVENT_SELECTOR_TEXT_OFFSET_X,
      HEADER_Y + 1,
      prototypeState.t("lobby.loadingLiveEvent"),
      {
        fontFamily: FONTS.body,
        fontSize: "21px",
        fontStyle: "700",
        color: "#2f4254",
        align: "center",
        wordWrap: { width: EVENT_SELECTOR_LABEL_WIDTH, useAdvancedWrap: false },
      },
    );
    this.periodLabel.setOrigin(0.5).setDepth(HEADER_FOREGROUND_DEPTH);

    const dropdownChevron = this.add.text(EVENT_SELECTOR_X + EVENT_SELECTOR_CHEVRON_OFFSET_X, HEADER_Y + 1, "v", {
      fontFamily: FONTS.body,
      fontSize: "25px",
      fontStyle: "700",
      color: "#1da8ee",
    });
    dropdownChevron.setOrigin(0.5).setDepth(HEADER_FOREGROUND_DEPTH);

    const dropdownHitArea = this.add.rectangle(
      EVENT_SELECTOR_X + 8,
      HEADER_Y + 1,
      EVENT_SELECTOR_HIT_WIDTH,
      EVENT_SELECTOR_HIT_HEIGHT,
      0xffffff,
      0,
    );
    dropdownHitArea.setDepth(HEADER_FOREGROUND_DEPTH + 1);
    dropdownHitArea.setInteractive({ useHandCursor: true });
    dropdownHitArea.on("pointerdown", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    });
    dropdownHitArea.on("pointerup", () => this.runTapAction(() => this.openEventPicker()));
    dropdownHitArea.on("pointerover", () => {
      periodFrame.setScale(EVENT_SELECTOR_FRAME_HOVER_SCALE_X, EVENT_SELECTOR_FRAME_HOVER_SCALE_Y);
      dropdownChevron.setScale(1.05);
    });
    dropdownHitArea.on("pointerout", () => {
      periodFrame.setScale(EVENT_SELECTOR_FRAME_SCALE_X, EVENT_SELECTOR_FRAME_SCALE_Y);
      dropdownChevron.setScale(1);
    });

    const myPointIcon = this.add.image(1307, HEADER_Y, "Desktop_IconMyPoint");
    myPointIcon.setDepth(HEADER_FOREGROUND_DEPTH);

    this.headerPointsText = this.add.text(1333, HEADER_Y + 1, "MY POINTS : 0", {
      fontFamily: FONTS.body,
      fontSize: "18px",
      fontStyle: "700",
      color: "#1b2630",
    });
    this.headerPointsText.setOrigin(0, 0.5).setDepth(HEADER_FOREGROUND_DEPTH);

    const diamondIcon = this.add.image(1589, HEADER_Y, "Desktop_IconDiamond");
    diamondIcon.setDepth(HEADER_FOREGROUND_DEPTH);

    this.playerText = this.add.text(1617, HEADER_Y + 1, "--------", {
      fontFamily: FONTS.body,
      fontSize: "18px",
      fontStyle: "700",
      color: "#1b2630",
    });
    this.playerText.setOrigin(0, 0.5).setDepth(HEADER_FOREGROUND_DEPTH);

    const languageButton = this.add.image(1748, HEADER_Y, "Desktop_ButtonLanguage");
    languageButton.setScale(0.46);
    languageButton.setDepth(HEADER_FOREGROUND_DEPTH);
    wireImageButton(languageButton, 0.46, () => this.runTapAction(() => this.openLocalePicker()));

    const supportButton = this.add.image(1815, HEADER_Y, "Desktop_ButtonSupport");
    supportButton.setScale(0.46);
    supportButton.setDepth(HEADER_FOREGROUND_DEPTH);
    wireImageButton(supportButton, 0.46, () => {
      this.runTapAction(() => {
        openExternalLink(getDesktopPlatformLinkUrl(PlatformLinkType.CustomerService));
      });
    });
  }

  private createHeaderTab(
    _x: number,
    _label: string,
    _active: boolean,
    _onClick?: () => void,
  ) {
    const text = this.add.text(_x, HEADER_Y + 1, _label, {
      fontFamily: FONTS.display,
      fontSize: "18px",
      fontStyle: "700",
      color: _active ? "#18aef5" : "#171b1f",
      letterSpacing: 1.2,
    });
    text.setOrigin(0.5).setDepth(HEADER_FOREGROUND_DEPTH);

    if (!_onClick) {
      return text;
    }

    text.setInteractive({ useHandCursor: true });
    text.on("pointerover", () => text.setScale(1.04));
    text.on("pointerout", () => text.setScale(1));
    text.on("pointerup", () => this.runTapAction(_onClick));
    return text;
  }

  private createHero() {
    const tutorialScale = 0.484;
    const tutorialTextureWidth = 990;
    const tutorialIconXs = [161, 498, 830];

    this.add
      .image(960, HERO_TITLE_Y, "Desktop_MainTitle")
      .setOrigin(0.5)
      .setDisplaySize(680, 108);
    this.add.image(960, HERO_TUTORIAL_Y, "Desktop_GameTutorial").setScale(tutorialScale);

    const stepCopy = [
      `${prototypeState.t("lobby.stepDepositTitle")}\n${prototypeState.t("lobby.stepDepositCopy")}`,
      `${prototypeState.t("lobby.stepSpinTitle")}\n${prototypeState.t("lobby.stepSpinCopy")}`,
      `${prototypeState.t("lobby.stepRankTitle")}\n${prototypeState.t("lobby.stepRankCopy")}`,
    ];
    const stepXs = tutorialIconXs.map(
      (iconX) => 960 + (iconX - tutorialTextureWidth / 2) * tutorialScale,
    );

    stepXs.forEach((x, index) => {
      this.add
        .text(x, HERO_TUTORIAL_Y + 32, stepCopy[index], {
          fontFamily: FONTS.body,
          fontSize: "18px",
          fontStyle: "700",
          color: "#179fe7",
          align: "center",
          lineSpacing: 3,
          wordWrap: { width: 156, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
    });

    this.promotionPeriodText = this.add
      .text(960, HERO_PERIOD_Y, prototypeState.t("lobby.checkingEligibility"), {
        fontFamily: FONTS.body,
        fontSize: "18px",
        fontStyle: "700",
        color: "#9aa0a7",
      })
      .setOrigin(0.5);

    this.createActivityBoard();
  }

  private createActivityBoard() {
    const boardGlow = this.add.ellipse(960, 680, 1460, 440, 0xffffff, 0.22);
    boardGlow.setDepth(0.5);
    const wheelGlow = this.add.ellipse(960, 785, 1040, 260, 0xffffff, 0.3);
    wheelGlow.setDepth(0.6);

    this.activityPills = Array.from({ length: 14 }, (_, index) => {
      const width = ACTIVITY_PILL_WIDTHS[index % ACTIVITY_PILL_WIDTHS.length];
      const pill = this.createActivityPill(width);
      pill.container.setDepth(0.9);
      this.resetActivityPill(pill, index * 280 + Phaser.Math.Between(40, 260));
      return pill;
    });
  }

  private createActivityPill(width: number): ActivityPill {
    const container = this.add.container(0, 0);
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 0.38);
    graphics.fillRoundedRect(-width / 2, -ACTIVITY_PILL_HEIGHT / 2, width, ACTIVITY_PILL_HEIGHT, 21);
    graphics.lineStyle(2, 0x98dcff, 0.82);
    graphics.strokeRoundedRect(-width / 2, -ACTIVITY_PILL_HEIGHT / 2, width, ACTIVITY_PILL_HEIGHT, 21);

    const label = this.add
      .text(0, 0, "", {
        fontFamily: FONTS.body,
        fontSize: "18px",
        fontStyle: "700",
        color: "#21a5ea",
        align: "center",
      })
      .setOrigin(0.5);

    container.add([graphics, label]);
    container.setAlpha(0);

    return {
      container,
      label,
      width,
      delayRemaining: 0,
      progress: 0,
      duration: 0,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      alphaPeak: 0.72,
      startScale: 1,
      endScale: 1,
    };
  }

  private createWheelSection() {
    this.wheelRoot = this.add.container(WHEEL_CENTER_X, WHEEL_CENTER_Y);
    this.wheelRoot.setScale(WHEEL_SCALE);
    this.wheelRoot.setDepth(4);
    this.drawWheel([]);

    this.button = this.createWheelCenterButton();
    this.drawPointer();

    this.add.image(960, SUMMARY_PANEL_Y, "Desktop_FrameTotalPoint").setScale(0.58);
    this.add
      .text(820, SUMMARY_PANEL_Y + 1, `${prototypeState.t("lobby.myTotalPoints")}:`, {
        fontFamily: FONTS.body,
        fontSize: "28px",
        fontStyle: "700",
        color: "#14a8ee",
      })
      .setOrigin(0, 0.5);

    this.summaryPointsText = this.add
      .text(1118, SUMMARY_PANEL_Y, "0", {
        fontFamily: FONTS.display,
        fontSize: "44px",
        fontStyle: "700",
        color: "#10a7eb",
      })
      .setOrigin(1, 0.5);

    this.createHistoryButton(960, SUMMARY_PANEL_Y + 88);

    if (shouldShowDevEligibilitySwitch()) {
      this.testSpinButton = addTextButton(
        this,
        1552,
        SUMMARY_PANEL_Y,
        184,
        54,
        "Test Spin",
        () => this.runVisualTestSpin(),
        {
          backgroundColor: 0xe9f7ff,
          labelColor: "#0a2942",
          radius: 28,
        },
      );
      this.testSpinButton.label.setFontSize("20px");
    }
  }

  private createHistoryButton(x: number, y: number) {
    const container = this.add.container(x, y);
    container.setDepth(8);

    const label = this.add
      .text(-8, 0, prototypeState.t("lobby.history"), {
        fontFamily: FONTS.body,
        fontSize: "18px",
        fontStyle: "700",
        color: "#149fe4",
      })
      .setOrigin(1, 0.5);

    const bubble = this.add.circle(24, 0, 20, 0xffffff, 0.98);
    bubble.setStrokeStyle(2, 0xbbe9ff, 0.95);
    const chevron = this.add
      .text(24, -1, "›", {
        fontFamily: FONTS.display,
        fontSize: "28px",
        fontStyle: "700",
        color: "#149fe4",
      })
      .setOrigin(0.5);

    container.add([label, bubble, chevron]);
    container.setSize(170, 48);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-85, -24, 170, 48),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on("pointerover", () => {
      container.setScale(1.03);
      label.setColor("#0f92d5");
    });
    container.on("pointerout", () => {
      container.setScale(1);
      label.setColor("#149fe4");
    });
    container.on("pointerup", () => {
      this.runTapAction(() => {
        if (this.scene.isActive(SCENE_KEYS.HistoryOverlay)) {
          this.scene.stop(SCENE_KEYS.HistoryOverlay);
          return;
        }

        this.scene.launch(SCENE_KEYS.HistoryOverlay);
      });
    });

  }

  private createLeaderboardSection() {
    this.leaderboardTitleImage = this.add
      .image(960, LEADERBOARD_SECTION_TOP + 144, "Desktop_RankingTitle")
      .setOrigin(0.5)
      .setDisplaySize(LEADERBOARD_TITLE_DISPLAY_WIDTH, LEADERBOARD_TITLE_DISPLAY_HEIGHT);

    this.leaderboardSubtitleText = this.add
      .text(960, LEADERBOARD_SECTION_TOP + 222, prototypeState.t("leaderboard.sectionSubtitle"), {
        fontFamily: FONTS.body,
        fontSize: LEADERBOARD_SUBTITLE_FONT_SIZE,
        fontStyle: "400",
        color: "#5a8099",
        align: "center",
        wordWrap: { width: 700, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    const rankColumnLabel = prototypeState.t("leaderboard.columnRank");
    const usernameColumnLabel = prototypeState.t("leaderboard.columnUsername");
    const totalPointsColumnLabel = prototypeState.t("leaderboard.columnTotalPoints");

    const divider = this.add.graphics();
    divider.lineStyle(2, COLORS.line, 0.95);
    LEADERBOARD_COLUMN_LEFTS.forEach((left) => {
      divider.lineBetween(
        left + 10,
        LEADERBOARD_HEADER_DIVIDER_Y,
        left + LEADERBOARD_ROW_WIDTH - 10,
        LEADERBOARD_HEADER_DIVIDER_Y,
      );
    });

    LEADERBOARD_COLUMN_LEFTS.forEach((left) => {
      this.add
        .text(left + LEADERBOARD_HEADER_RANK_X, LEADERBOARD_HEADER_LABEL_Y, rankColumnLabel, {
          fontFamily: FONTS.body,
          fontSize: LEADERBOARD_HEADER_FONT_SIZE,
          fontStyle: "400",
          color: "#12a2ea",
        })
        .setOrigin(0.5, 0.5);
      this.add
        .text(left + LEADERBOARD_HEADER_USERNAME_X, LEADERBOARD_HEADER_LABEL_Y, usernameColumnLabel, {
          fontFamily: FONTS.body,
          fontSize: LEADERBOARD_HEADER_FONT_SIZE,
          fontStyle: "400",
          color: "#12a2ea",
        })
        .setOrigin(0.5, 0.5);
      this.add
        .text(left + LEADERBOARD_HEADER_SCORE_X, LEADERBOARD_HEADER_LABEL_Y, totalPointsColumnLabel, {
          fontFamily: FONTS.body,
          fontSize: LEADERBOARD_HEADER_FONT_SIZE,
          fontStyle: "400",
          color: "#12a2ea",
        })
        .setOrigin(0.5, 0.5);
    });

    this.leaderboardPendingPanel = addRoundedPanel(
      this,
      960,
      LEADERBOARD_SECTION_TOP + 665,
      820,
      220,
      {
        fillColor: COLORS.white,
        radius: 40,
      },
    );
    this.leaderboardPendingPanel.setVisible(false);
    this.leaderboardPendingText = this.add
      .text(960, LEADERBOARD_SECTION_TOP + 665, "", {
        fontFamily: FONTS.body,
        fontSize: "30px",
        fontStyle: "700",
        color: "#5d7d97",
        align: "center",
        wordWrap: { width: 660, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setVisible(false);

      Array.from({ length: 30 }, (_, index) => {
        const columnIndex = Math.floor(index / 10);
        const rowIndex = index % 10;
        const left = LEADERBOARD_COLUMN_LEFTS[columnIndex];
        const x = left + LEADERBOARD_ROW_WIDTH / 2;
        const y = LEADERBOARD_ROW_START_Y + rowIndex * LEADERBOARD_ROW_SPACING;
        const textCenterY = getLeaderboardRowTextCenterY(y, index + 1);

        const plate = this.add
          .image(x, y, "Desktop_RankingPlate_NotListed")
          .setScale(LEADERBOARD_PLATE_SCALE)
          .setVisible(false);

        const playerText = this.add
          .text(left + LEADERBOARD_PLAYER_OFFSET_X, textCenterY, "-", {
            fontFamily: FONTS.body,
            fontSize: "20px",
            fontStyle: "700",
            color: "#0a2942",
            wordWrap: { width: 126, useAdvancedWrap: true },
          })
          .setOrigin(0, 0.5)
          .setVisible(false);

        const scoreText = this.add
          .text(left + LEADERBOARD_ROW_WIDTH - LEADERBOARD_SCORE_INSET, textCenterY, "-", {
            fontFamily: FONTS.display,
            fontSize: "20px",
            fontStyle: "700",
            color: "#10a7eb",
          })
          .setOrigin(1, 0.5)
          .setVisible(false);

        const prizeText = this.add
          .text(0, 0, "", {
            fontFamily: FONTS.body,
            fontSize: LEADERBOARD_PRIZE_TEXT_FONT_SIZE,
            fontStyle: "700",
            color: "#8d98a1",
          })
          .setOrigin(0.5, 0.5)
          .setVisible(false);

        const prizePosition = getDesktopRankingPrizeTextPosition(plate, index + 1);
        prizeText.setPosition(prizePosition.x, prizePosition.y);

        this.leaderboardRows.push({
          x,
          y,
          plate,
          playerText,
          scoreText,
          prizeText,
        });
      });

    const summaryDivider = this.add.graphics();
    summaryDivider.lineStyle(2, COLORS.line, 0.85);
    summaryDivider.lineBetween(
      LEADERBOARD_COLUMN_LEFTS[0] - 28,
      LEADERBOARD_SUMMARY_DIVIDER_Y,
      LEADERBOARD_COLUMN_LEFTS[2] + LEADERBOARD_ROW_WIDTH + 28,
      LEADERBOARD_SUMMARY_DIVIDER_Y,
    );

    const summaryLeft = DESKTOP_PAGE_CENTER_X - LEADERBOARD_ROW_WIDTH / 2;
    const summaryTextCenterY = getLeaderboardRowTextCenterY(LEADERBOARD_SUMMARY_Y, 1);
    this.leaderboardMyRankPlate = this.add
      .image(DESKTOP_PAGE_CENTER_X, LEADERBOARD_SUMMARY_Y, "Desktop_RankingPlate_NotListed")
      .setScale(LEADERBOARD_PLATE_SCALE)
      .setVisible(false);

    this.leaderboardMyRankPlayerText = this.add
      .text(summaryLeft + LEADERBOARD_PLAYER_OFFSET_X, summaryTextCenterY, "", {
        fontFamily: FONTS.body,
        fontSize: "20px",
        fontStyle: "700",
        color: "#0896d8",
        wordWrap: { width: 126, useAdvancedWrap: true },
      })
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.leaderboardMyRankScoreText = this.add
      .text(summaryLeft + LEADERBOARD_ROW_WIDTH - LEADERBOARD_SCORE_INSET, summaryTextCenterY, "", {
        fontFamily: FONTS.display,
        fontSize: "20px",
        fontStyle: "700",
        color: "#10a7eb",
      })
      .setOrigin(1, 0.5)
      .setVisible(false);

    this.leaderboardMyRankPrizeText = this.add
      .text(0, 0, "", {
        fontFamily: FONTS.body,
        fontSize: LEADERBOARD_PRIZE_TEXT_FONT_SIZE,
        fontStyle: "700",
        color: "#8d98a1",
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    const summaryPrizePosition = getDesktopRankingPrizeTextPosition(this.leaderboardMyRankPlate, 1);
    this.leaderboardMyRankPrizeText.setPosition(summaryPrizePosition.x, summaryPrizePosition.y);

    this.leaderboardMyRankText = this.add
      .text(960, LEADERBOARD_SUMMARY_Y, "", {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "700",
        color: "#0a2942",
        align: "center",
        wordWrap: { width: 960, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    this.leaderboardLastSyncedText = this.add
      .text(960, LEADERBOARD_FOOTER_Y, "", {
        fontFamily: FONTS.body,
        fontSize: "18px",
        fontStyle: "700",
        color: "#62839b",
      })
      .setOrigin(0.5)
      .setLineSpacing(6);
  }

  private createPrizeSection() {
    this.add
      .image(960, PRIZE_SECTION_TOP + 126 - PRIZE_SECTION_CONTENT_LIFT, "Desktop_PrizeTitle")
      .setScale(1.08);

    this.prizeSubtitleText = this.add
      .text(960, PRIZE_SECTION_TOP + 206 - PRIZE_SECTION_CONTENT_LIFT, prototypeState.t("prize.sectionSubtitle"), {
        fontFamily: FONTS.body,
        fontSize: "21px",
        fontStyle: "700",
        color: "#3f7b93",
        align: "center",
        wordWrap: { width: 880, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    PRIZE_ROW_LAYOUTS.forEach((row, index) => {
      const rankBadge = this.add
        .image(row.badgeX, row.y, DESKTOP_PRIZE_BADGE_KEYS[index])
        .setScale(row.badgeScale);
      const rewardZone = this.add
        .image(row.rewardX, row.y, "Desktop_PrizeRewardZone")
        .setScale(row.rewardScale);
      const prizeArt = this.add
        .image(row.rewardX, row.y, "Desktop_PrizeRewardZone")
        .setVisible(false);

      const isRightAligned = row.align === "right";
      const textX = row.rewardX + (isRightAligned ? 156 : -156);
      const origin = isRightAligned ? 1 : 0;

      const prizeLabel = this.add
        .text(textX, row.y - 22, "-", {
          fontFamily: FONTS.display,
          fontSize: index === 0 ? "32px" : "28px",
          fontStyle: "700",
          color: "#ffffff",
          align: isRightAligned ? "right" : "left",
        })
        .setOrigin(origin, 0.5);

      const prizeDescription = this.add
        .text(textX, row.y + 18, "", {
          fontFamily: FONTS.body,
          fontSize: "18px",
          fontStyle: "700",
          color: "#0a2942",
          align: isRightAligned ? "right" : "left",
          wordWrap: { width: index === 0 ? 290 : 250, useAdvancedWrap: true },
        })
        .setOrigin(origin, 0.5);

      this.prizeRows.push({ rankBadge, rewardZone, prizeArt, prizeLabel, prizeDescription });
    });

  }

  private createTermsSection() {
    const stripeBandTop = TERMS_SECTION_TOP + 620 - TERMS_SECTION_CONTENT_LIFT;
    const stripeBandHeight = CONTENT_HEIGHT - stripeBandTop;
    const stripeBandBottom = stripeBandTop + stripeBandHeight;
    const stripeBand = this.add.graphics();
    const stripeSpacing = 36;
    const stripeSegments = 10;
    const stripeColor = 0xe9f8ff;
    const stripeWidth = 6;

    for (let offset = -360; offset < STAGE_WIDTH + 360; offset += stripeSpacing) {
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

    /** Sample terms panel: rgb(247,247,247) content band, full-width inset. */
    const termsPlate = this.add.graphics();
    termsPlate.fillStyle(0xf7f7f7, 1);
    termsPlate.fillRect(210, TERMS_SECTION_TOP + 118 - TERMS_SECTION_CONTENT_LIFT, 1500, 690);
    termsPlate.setDepth(1);

    const termsTitle = this.add
      .text(960, TERMS_SECTION_TOP + 208 - TERMS_SECTION_CONTENT_LIFT, prototypeState.t("rules.title"), {
        fontFamily: FONTS.display,
        fontSize: "28px",
        fontStyle: "800",
        color: "#47bdf6",
      })
      .setOrigin(0.5);
    termsTitle.setDepth(2);

    this.rulesBodyText = this.add
      .text(250, TERMS_SECTION_TOP + 350 - TERMS_SECTION_CONTENT_LIFT, "", {
        fontFamily: FONTS.body,
        fontSize: "20px",
        color: "#253a4e",
        lineSpacing: 8,
        wordWrap: { width: 1420, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
    this.rulesBodyText.setDepth(2);

  }

  private setupScrollControls() {
    const handleDown = (pointer: Phaser.Input.Pointer) => {
      if (this.isDesktopModalOpen()) {
        return;
      }

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
      if (this.isDesktopModalOpen() || pointer.id !== this.activeScrollPointerId || !pointer.isDown) {
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

      this.setScrollY(this.dragStartScrollY - deltaY);

      const now = this.time.now;
      const elapsed = Math.max(1, now - this.lastDragTime);
      const scrollDelta = this.lastDragY - pointer.y;
      const instantVelocity = scrollDelta / elapsed;
      this.scrollVelocity = Phaser.Math.Linear(this.scrollVelocity, instantVelocity, 0.35);
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
      if (this.isDesktopModalOpen()) {
        return;
      }

      this.setScrollY(this.cameras.main.scrollY + deltaY * 0.92);
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
    const totalPoints = formatNumber(snapshot.player?.totalScore ?? 0, snapshot.locale);

    this.periodLabel?.setText(this.getEventSelectorValue());
    this.promotionPeriodText?.setText(
      snapshot.currentEvent?.promotionPeriodLabel
        ? `Promotion Period: ${snapshot.currentEvent.promotionPeriodLabel}`
        : snapshot.isBootstrapping
          ? prototypeState.t("lobby.loadingPayload")
          : prototypeState.t("lobby.loadingLiveEvent"),
    );
    this.headerPointsText?.setText(`MY POINTS : ${totalPoints}`);
    this.summaryPointsText?.setText(totalPoints);
    this.playerText?.setText(this.formatAccountLabel(snapshot.player?.playerName));

    if (snapshot.leaderboard?.leaderboard.length) {
      this.activityPills.forEach((pill) => {
        if (!pill.label.text || pill.label.text === "Loading player activity...") {
          this.assignActivityMessage(pill);
        }
      });
    }

    this.refreshLeaderboardSection();
    this.refreshPrizeSection();
    this.refreshRulesSection();
    this.applyState();
  }

  private refreshLeaderboardSection() {
    const snapshot = prototypeState.getSnapshot();
    const isPending =
      snapshot.currentEvent?.status === "ended" &&
      snapshot.leaderboard?.resultsVisible === false;

    const subtitle = prototypeState.t("leaderboard.sectionSubtitle");

    this.leaderboardSubtitleText?.setText(subtitle);

    this.leaderboardPendingPanel?.setVisible(isPending);
    this.leaderboardPendingText
      ?.setVisible(isPending)
      .setText(snapshot.leaderboard?.pendingMessage ?? prototypeState.t("leaderboard.pendingSubtitle"));

      const rows = snapshot.leaderboard?.leaderboard.slice(0, 30) ?? [];
      this.leaderboardRows.forEach((row, index) => {
        const entry = rows[index];
        const visible = Boolean(entry) && !isPending;
        row.plate.setVisible(visible);
        row.playerText.setVisible(visible);
        row.scoreText.setVisible(visible);
        row.prizeText.setVisible(visible);

        if (!visible || !entry) {
          row.prizeText.setText("");
          return;
        }

        row.plate.setTexture(
          DESKTOP_RANKING_PLATE_KEYS[entry.rank - 1] ?? "Desktop_RankingPlate_NotListed",
        );
        row.plate.setX(getLeaderboardPlateCenterX(row.x, entry.rank));
        row.plate.setY(getLeaderboardPlateCenterY(row.y, entry.rank));
        const rowTextCenterY = getLeaderboardRowTextCenterY(row.y, entry.rank);
        row.playerText.setText(maskLeaderboardPlayerName(entry.playerName, entry.isSelf));
        row.playerText.setY(rowTextCenterY);
        row.scoreText.setText(formatNumber(entry.score, snapshot.locale));
        row.scoreText.setY(rowTextCenterY);
        const prizePosition = getDesktopRankingPrizeTextPosition(row.plate, entry.rank);
        row.prizeText
          .setPosition(prizePosition.x, prizePosition.y)
          .setText(this.getLeaderboardPrizeLabel(entry.rank, entry.prizeName))
          .setColor(entry.rank <= 3 ? "#149fe4" : "#8d98a1");
        row.playerText.setColor(entry.isSelf ? "#0896d8" : "#0a2942");
      });

    if (isPending) {
      this.leaderboardMyRankPlate?.setVisible(false);
      this.leaderboardMyRankPlayerText?.setVisible(false).setText("");
      this.leaderboardMyRankScoreText?.setVisible(false).setText("");
      this.leaderboardMyRankPrizeText?.setVisible(false).setText("");
      this.leaderboardMyRankText?.setText("");
      this.leaderboardLastSyncedText?.setText("");
      return;
    }

    const myRank =
      snapshot.leaderboard?.myRank ??
      snapshot.leaderboard?.leaderboard.find((entry) => entry.isSelf) ??
      null;

    if (myRank) {
      const plateKey =
        DESKTOP_RANKING_PLATE_KEYS[myRank.rank - 1] ?? "Desktop_RankingPlate_NotListed";
      const summaryPlateX = getLeaderboardPlateCenterX(DESKTOP_PAGE_CENTER_X, myRank.rank);
      const summaryPlateY = getLeaderboardPlateCenterY(LEADERBOARD_SUMMARY_Y, myRank.rank);
      const summaryTextCenterY = getLeaderboardRowTextCenterY(LEADERBOARD_SUMMARY_Y, myRank.rank);
      this.leaderboardMyRankPlate
        ?.setVisible(true)
        .setTexture(plateKey)
        .setPosition(summaryPlateX, summaryPlateY);
      this.leaderboardMyRankPlayerText
        ?.setVisible(true)
        .setY(summaryTextCenterY)
        .setText(myRank.playerName);
      this.leaderboardMyRankScoreText
        ?.setVisible(true)
        .setY(summaryTextCenterY)
        .setText(formatNumber(myRank.score, snapshot.locale));
      const summaryPrizePosition = getDesktopRankingPrizeTextPosition(this.leaderboardMyRankPlate!, myRank.rank);
      this.leaderboardMyRankPrizeText
        ?.setVisible(myRank.rank <= 30)
        .setPosition(summaryPrizePosition.x, summaryPrizePosition.y)
        .setText(this.getLeaderboardPrizeLabel(myRank.rank, myRank.prizeName))
        .setColor(myRank.rank <= 3 ? "#149fe4" : "#8d98a1");
      this.leaderboardMyRankText?.setVisible(false).setText("");
    } else {
      this.leaderboardMyRankPlate?.setVisible(false);
      this.leaderboardMyRankPlayerText?.setVisible(false).setText("");
      this.leaderboardMyRankScoreText?.setVisible(false).setText("");
      this.leaderboardMyRankPrizeText?.setVisible(false).setText("");
      this.leaderboardMyRankText
        ?.setVisible(true)
        .setY(LEADERBOARD_SUMMARY_Y)
        .setText(snapshot.isBootstrapping ? "Loading leaderboard..." : "");
    }

    this.leaderboardLastSyncedText?.setY(LEADERBOARD_FOOTER_Y);
    this.refreshLeaderboardFooterText();
  }

  private refreshPrizeSection() {
    const snapshot = prototypeState.getSnapshot();
    this.prizeSubtitleText?.setText(prototypeState.t("prize.sectionSubtitle"));

    this.prizeRows.forEach((row, index) => {
      const prize = snapshot.prizes[index];
      const visible = Boolean(prize);
      row.rankBadge.setVisible(visible);
      row.rewardZone.setVisible(visible);
      row.prizeArt.setVisible(false);
      row.prizeLabel.setVisible(visible);
      row.prizeDescription.setVisible(visible);

      if (!prize) {
        return;
      }

      row.prizeLabel.setText(prize.prizeLabel);
      row.prizeDescription.setText(
        prize.prizeDescription || prize.accentLabel || prototypeState.t("prize.defaultAccent"),
      );
      row.rewardZone.setAlpha(prize.imageUrl ? 0.28 : 1);
      syncPrizeArtImage(this, row.prizeArt, prize.imageUrl, 220, 138);
    });
  }

  private getLeaderboardPrizeLabel(rank: number, prizeName: string | null) {
    if (prizeName) {
      return prizeName;
    }

    const configuredPrize = prototypeState
      .getSnapshot()
      .prizes.find((prize) => rank >= prize.rankFrom && rank <= prize.rankTo);

    return configuredPrize?.prizeLabel ?? `Rank #${rank}`;
  }

  private refreshLeaderboardFooterText() {
    const snapshot = prototypeState.getSnapshot();
    const lastSyncedValue = snapshot.leaderboard?.lastSyncedAt
      ? formatDate(snapshot.leaderboard.lastSyncedAt, snapshot.locale, {
          dateStyle: "short",
          timeStyle: "short",
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

  private refreshRulesSection() {
    const snapshot = prototypeState.getSnapshot();
    this.rulesBodyText?.setText(snapshot.currentEvent?.rulesContent || prototypeState.t("rules.loading"));
  }

  private updateScene(_time: number, delta: number) {
    this.applyScrollMomentum(delta);
    this.updateActivityPills(delta);
  }

  private applyScrollMomentum(delta: number) {
    if (this.isDesktopModalOpen() || this.isDraggingScroll || Math.abs(this.scrollVelocity) < 0.01) {
      return;
    }

    this.setScrollY(this.cameras.main.scrollY + this.scrollVelocity * delta);
    this.scrollVelocity *= 0.94;

    const maxScroll = CONTENT_HEIGHT - STAGE_HEIGHT;
    if (this.cameras.main.scrollY <= 0 || this.cameras.main.scrollY >= maxScroll) {
      this.scrollVelocity *= 0.55;
    }

    if (Math.abs(this.scrollVelocity) < 0.01) {
      this.scrollVelocity = 0;
    }
  }

  private updateActivityPills(delta: number) {
    if (this.activityPills.length === 0) {
      return;
    }

    this.activityPills.forEach((pill) => {
      if (pill.delayRemaining > 0) {
        pill.delayRemaining = Math.max(0, pill.delayRemaining - delta);
        return;
      }

      pill.progress = Math.min(1, pill.progress + delta / pill.duration);
      const eased = Phaser.Math.Easing.Cubic.Out(pill.progress);
      pill.container.setPosition(
        pill.startX,
        Phaser.Math.Linear(pill.startY, pill.endY, eased),
      );
      const scale = Phaser.Math.Linear(pill.startScale, pill.endScale, eased);
      pill.container.setScale(scale);

      let alpha = pill.alphaPeak;
      if (pill.progress < 0.2) {
        alpha = pill.alphaPeak * (pill.progress / 0.2);
      } else if (pill.progress > 0.72) {
        alpha = pill.alphaPeak * (1 - (pill.progress - 0.72) / 0.28);
      }
      pill.container.setAlpha(Phaser.Math.Clamp(alpha, 0, pill.alphaPeak));

      if (pill.progress >= 1) {
        this.resetActivityPill(pill);
      }
    });
  }

  private resetActivityPill(
    pill: ActivityPill,
    delayMs = Phaser.Math.Between(320, 1120),
  ) {
    pill.delayRemaining = delayMs;
    pill.progress = 0;
    pill.duration = Phaser.Math.Between(2800, 3600);
    const useLeftBand = Math.random() < 0.5;
    const bandMinX = useLeftBand ? ACTIVITY_BAND_LEFT_MIN_X : ACTIVITY_BAND_RIGHT_MIN_X;
    const bandMaxX = useLeftBand ? ACTIVITY_BAND_LEFT_MAX_X : ACTIVITY_BAND_RIGHT_MAX_X;
    pill.startX = Phaser.Math.Between(
      bandMinX + pill.width / 2,
      bandMaxX - pill.width / 2,
    );
    pill.startY = Phaser.Math.Between(ACTIVITY_PILL_START_MIN_Y, ACTIVITY_PILL_START_MAX_Y);
    pill.endX = pill.startX;
    pill.endY = Phaser.Math.Between(ACTIVITY_PILL_END_MIN_Y, ACTIVITY_PILL_END_MAX_Y);
    pill.alphaPeak = Phaser.Math.FloatBetween(0.82, 0.96);
    pill.startScale = Phaser.Math.FloatBetween(0.82, 0.9);
    pill.endScale = pill.startScale + Phaser.Math.FloatBetween(0.08, 0.15);
    pill.container.setPosition(pill.startX, pill.startY);
    pill.container.setAlpha(0);
    pill.container.setScale(pill.startScale);
    this.assignActivityMessage(pill);
  }

  private assignActivityMessage(pill: ActivityPill) {
    const snapshot = prototypeState.getSnapshot();
    const leaderboardEntries = snapshot.leaderboard?.leaderboard ?? [];

    if (leaderboardEntries.length === 0) {
      pill.label.setText("Loading player activity...");
      return;
    }

    const entry = leaderboardEntries[Math.floor(Math.random() * Math.min(leaderboardEntries.length, 30))];
    const name = this.maskPlayerName(entry.playerName);
    const score = this.getRandomPositiveScore();
    pill.label.setText(`${name} Earn ${formatNumber(score, snapshot.locale)} points`);
  }

  private getRandomPositiveScore() {
    const snapshot = prototypeState.getSnapshot();
    const historyScores =
      snapshot.player?.spinHistory
        .map((entry) => entry.scoreDelta)
        .filter((score) => score > 0) ?? [];

    const pool = historyScores.length > 0 ? historyScores : [20, 80, 120, 200];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private maskPlayerName(name?: string) {
    return maskLeaderboardPlayerName(name);
  }

  private applyState() {
    const snapshot = prototypeState.getSnapshot();
    const canTestSpin = !this.spinning && Boolean(snapshot.currentEvent?.wheelSegments.length);
    if (this.testSpinButton) {
      this.testSpinButton.setEnabled(canTestSpin);
      this.testSpinButton.setBackground(canTestSpin ? 0xe9f7ff : COLORS.disabled);
      this.testSpinButton.label.setColor("#0a2942");
    }

    if (!this.wheelRoot || !this.button) {
      return;
    }

    if (!snapshot.currentEvent || !snapshot.eligibility) {
      this.button.setLabel("Loading");
      this.button.setBackground(COLORS.disabled);
      this.button.setEnabled(false);
      return;
    }

    this.currentEligibility = snapshot.eligibility.eligibilityStatus;
    this.currentWheelVisualState = snapshot.eligibility.wheelVisualState;
    const wheelSignature = this.getWheelSignature(
      snapshot.currentEvent.wheelSegments,
      this.currentWheelVisualState,
    );

    if (wheelSignature !== this.renderedWheelSignature) {
      this.drawWheel(snapshot.currentEvent.wheelSegments);
    } else {
      this.syncWinningSegmentHighlight();
    }
    this.syncPointerVisualState();

    this.button.setLabel(snapshot.eligibility.buttonLabel);
    this.button.setBackground(
      this.currentEligibility === EligibilityStatus.GoToDeposit
        ? COLORS.disabled
        : this.currentEligibility === EligibilityStatus.EventEnded
          ? COLORS.disabled
          : COLORS.primary,
    );
    this.button.setEnabled(
      !this.spinning &&
        this.currentEligibility !== EligibilityStatus.AlreadySpin &&
        this.currentEligibility !== EligibilityStatus.EventEnded,
    );
    this.button.label.setColor(
      "#ffffff",
    );
  }

  private animateToSegment(result: SpinSuccessResponse) {
    this.animateWheelToSegmentIndex(result.segmentIndex, () => {
      this.playSpinCelebration(result.segmentIndex);
    });
  }

  private animateWheelToSegmentIndex(segmentIndex: number, onComplete?: () => void) {
    if (!this.wheelRoot) {
      return;
    }

    const currentDegrees = Phaser.Math.Wrap(
      Phaser.Math.RadToDeg(this.wheelRotation),
      0,
      360,
    );
    const desiredDegrees = Phaser.Math.Wrap(-segmentIndex * 60, 0, 360);
    const travelDegrees = 360 * 5 + desiredDegrees - currentDegrees;
    const targetRotation =
      this.wheelRotation +
      Phaser.Math.DegToRad(travelDegrees <= 0 ? travelDegrees + 360 : travelDegrees);

    this.tweens.add({
      targets: this.wheelRoot,
      rotation: targetRotation,
      duration: 3800,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.wheelRotation = targetRotation;
        onComplete?.();
      },
    });
  }

  public runVisualTestSpin() {
    const segments = prototypeState.getSnapshot().currentEvent?.wheelSegments ?? [];
    if (this.spinning || segments.length === 0) {
      return;
    }

    this.spinning = true;
    this.applyState();
    const segmentIndex = Phaser.Math.Between(0, segments.length - 1);
    this.animateWheelToSegmentIndex(segmentIndex, () => {
      this.playSpinCelebration(segmentIndex);
    });
  }

  private playSpinCelebration(segmentIndex: number) {
    this.highlightedSegmentIndex = segmentIndex;
    playWinningEffect(this);
    this.applyState();
    this.launchCelebrationFireworks(segmentIndex);

    this.celebrationTimer?.remove(false);
    this.celebrationTimer = this.time.delayedCall(CELEBRATION_DURATION_MS, () => {
      this.clearCelebrationBursts();
      this.highlightedSegmentIndex = undefined;
      this.highlightTween?.stop();
      this.highlightGraphic?.destroy();
      this.highlightGraphic = undefined;
      this.highlightTween = undefined;
      this.spinning = false;
      prototypeState.acknowledgeSpinResult();
      this.applyState();
    });
  }

  private drawWheel(segments: WheelSegmentDto[]) {
    if (!this.wheelRoot) {
      return;
    }

    const wheelRoot = this.wheelRoot;
    const isGreyedOut = this.currentWheelVisualState === WheelVisualState.GreyedOut;
    this.highlightTween?.stop();
    this.highlightTween = undefined;
    this.highlightGraphic = undefined;
    this.renderedHighlightIndex = undefined;
    wheelRoot.removeAll(true);

    const wheelBackdrop = this.add.image(
      0,
      0,
      isGreyedOut ? "Desktop_RouletteExpired" : "Desktop_Roulette",
    );
    wheelRoot.add(wheelBackdrop);
    this.renderedWheelSignature = this.getWheelSignature(segments, this.currentWheelVisualState);

    if (segments.length === 0) {
      return;
    }

    segments.forEach((segment, index) => {
      const isLightSegment = index % 2 === 1;
      const labelColor = isGreyedOut
        ? isLightSegment
          ? ENDED_WHEEL_TEXT_DARK
          : ENDED_WHEEL_TEXT_LIGHT
        : isLightSegment
          ? "#14a8ee"
          : "#ffffff";

      const centerAngle = Phaser.Math.DegToRad(-90 + index * 60);
      const labelRadius = 306;
      const labelContainer = this.add.container(
        Math.cos(centerAngle) * labelRadius,
        Math.sin(centerAngle) * labelRadius,
      );

      const label = this.add
        .text(0, -28, segment.label, {
          fontFamily: FONTS.displayName,
          fontSize: "90px",
          fontStyle: "800",
          color: labelColor,
        })
        .setOrigin(0.5);

      const unit = this.add
        .text(0, 45, "points", {
          fontFamily: FONTS.bodyName,
          fontSize: "38px",
          fontStyle: "700",
          color: labelColor,
        })
        .setOrigin(0.5)
        .setAlpha(isGreyedOut ? (isLightSegment ? 0.86 : 0.92) : isLightSegment ? 0.92 : 0.88);

      labelContainer.add([label, unit]);
      labelContainer.setRotation(centerAngle + Math.PI / 2);
      wheelRoot.add(labelContainer);
    });

    this.syncWinningSegmentHighlight();
  }

  private attachWinningSegmentPulse(segmentIndex: number) {
    if (!this.wheelRoot) {
      return;
    }

    this.highlightTween?.stop();
    this.highlightGraphic?.destroy();

    const startAngle = Phaser.Math.DegToRad(-120 + segmentIndex * 60);
    const endAngle = Phaser.Math.DegToRad(-60 + segmentIndex * 60);
    const midAngle = (startAngle + endAngle) / 2;
    const startInnerX = Math.cos(startAngle) * SEGMENT_HIGHLIGHT_INNER_RADIUS;
    const startInnerY = Math.sin(startAngle) * SEGMENT_HIGHLIGHT_INNER_RADIUS;
    const endInnerX = Math.cos(endAngle) * SEGMENT_HIGHLIGHT_INNER_RADIUS;
    const endInnerY = Math.sin(endAngle) * SEGMENT_HIGHLIGHT_INNER_RADIUS;
    const highlight = this.add.container(0, 0);
    const frame = this.add.graphics();

    frame.fillStyle(SEGMENT_HIGHLIGHT_GOLD_SOFT, 0.12);
    frame.beginPath();
    frame.moveTo(startInnerX, startInnerY);
    frame.arc(0, 0, SEGMENT_HIGHLIGHT_OUTER_RADIUS, startAngle, endAngle, false);
    frame.lineTo(endInnerX, endInnerY);
    frame.arc(0, 0, SEGMENT_HIGHLIGHT_INNER_RADIUS, endAngle, startAngle, true);
    frame.closePath();
    frame.fillPath();

    frame.lineStyle(32, SEGMENT_HIGHLIGHT_SHADOW, 0.34);
    frame.beginPath();
    frame.arc(0, 0, SEGMENT_HIGHLIGHT_OUTER_RADIUS, startAngle, endAngle, false);
    frame.strokePath();

    frame.lineStyle(18, SEGMENT_HIGHLIGHT_ORANGE, 0.98);
    frame.beginPath();
    frame.arc(0, 0, SEGMENT_HIGHLIGHT_OUTER_RADIUS, startAngle, endAngle, false);
    frame.strokePath();

    frame.lineStyle(8, SEGMENT_HIGHLIGHT_GOLD, 1);
    frame.beginPath();
    frame.arc(
      0,
      0,
      SEGMENT_HIGHLIGHT_OUTER_RADIUS - 20,
      startAngle + 0.012,
      endAngle - 0.012,
      false,
    );
    frame.strokePath();

    frame.lineStyle(12, SEGMENT_HIGHLIGHT_GOLD, 0.96);
    frame.beginPath();
    frame.arc(0, 0, SEGMENT_HIGHLIGHT_INNER_RADIUS, startAngle, endAngle, false);
    frame.strokePath();

    frame.lineStyle(6, SEGMENT_HIGHLIGHT_AMBER, 0.98);
    frame.beginPath();
    frame.arc(
      0,
      0,
      SEGMENT_HIGHLIGHT_INNER_RADIUS + 16,
      startAngle + 0.025,
      endAngle - 0.025,
      false,
    );
    frame.strokePath();

    frame.lineStyle(16, SEGMENT_HIGHLIGHT_ORANGE, 0.98);
    frame.beginPath();
    frame.moveTo(startInnerX, startInnerY);
    frame.lineTo(
      Math.cos(startAngle) * SEGMENT_HIGHLIGHT_OUTER_RADIUS,
      Math.sin(startAngle) * SEGMENT_HIGHLIGHT_OUTER_RADIUS,
    );
    frame.moveTo(endInnerX, endInnerY);
    frame.lineTo(
      Math.cos(endAngle) * SEGMENT_HIGHLIGHT_OUTER_RADIUS,
      Math.sin(endAngle) * SEGMENT_HIGHLIGHT_OUTER_RADIUS,
    );
    frame.strokePath();

    frame.lineStyle(6, SEGMENT_HIGHLIGHT_GOLD, 0.98);
    frame.beginPath();
    frame.moveTo(
      Math.cos(startAngle) * (SEGMENT_HIGHLIGHT_INNER_RADIUS + 14),
      Math.sin(startAngle) * (SEGMENT_HIGHLIGHT_INNER_RADIUS + 14),
    );
    frame.lineTo(
      Math.cos(startAngle) * (SEGMENT_HIGHLIGHT_OUTER_RADIUS - 18),
      Math.sin(startAngle) * (SEGMENT_HIGHLIGHT_OUTER_RADIUS - 18),
    );
    frame.moveTo(
      Math.cos(endAngle) * (SEGMENT_HIGHLIGHT_INNER_RADIUS + 14),
      Math.sin(endAngle) * (SEGMENT_HIGHLIGHT_INNER_RADIUS + 14),
    );
    frame.lineTo(
      Math.cos(endAngle) * (SEGMENT_HIGHLIGHT_OUTER_RADIUS - 18),
      Math.sin(endAngle) * (SEGMENT_HIGHLIGHT_OUTER_RADIUS - 18),
    );
    frame.strokePath();

    const crestOuterRadius = SEGMENT_HIGHLIGHT_OUTER_RADIUS - 4;
    const crestInnerRadius = SEGMENT_HIGHLIGHT_OUTER_RADIUS - 34;
    const crest = this.add.graphics();
    crest.fillStyle(SEGMENT_HIGHLIGHT_GOLD, 1);
    crest.beginPath();
    crest.moveTo(
      Math.cos(midAngle) * crestOuterRadius,
      Math.sin(midAngle) * crestOuterRadius,
    );
    crest.lineTo(
      Math.cos(midAngle - 0.09) * crestInnerRadius,
      Math.sin(midAngle - 0.09) * crestInnerRadius,
    );
    crest.lineTo(
      Math.cos(midAngle + 0.09) * crestInnerRadius,
      Math.sin(midAngle + 0.09) * crestInnerRadius,
    );
    crest.closePath();
    crest.fillPath();
    crest.lineStyle(5, SEGMENT_HIGHLIGHT_ORANGE, 0.98);
    crest.strokePath();

    const innerBadge = this.add.graphics();
    innerBadge.fillStyle(SEGMENT_HIGHLIGHT_AMBER, 0.22);
    const innerBadgeApexRadius = SEGMENT_HIGHLIGHT_INNER_RADIUS - 24;
    innerBadge.beginPath();
    innerBadge.moveTo(
      Math.cos(midAngle - 0.16) * (SEGMENT_HIGHLIGHT_INNER_RADIUS + 2),
      Math.sin(midAngle - 0.16) * (SEGMENT_HIGHLIGHT_INNER_RADIUS + 2),
    );
    innerBadge.lineTo(
      Math.cos(midAngle) * innerBadgeApexRadius,
      Math.sin(midAngle) * innerBadgeApexRadius,
    );
    innerBadge.lineTo(
      Math.cos(midAngle + 0.16) * (SEGMENT_HIGHLIGHT_INNER_RADIUS + 2),
      Math.sin(midAngle + 0.16) * (SEGMENT_HIGHLIGHT_INNER_RADIUS + 2),
    );
    innerBadge.closePath();
    innerBadge.fillPath();
    innerBadge.lineStyle(5, SEGMENT_HIGHLIGHT_GOLD, 0.94);
    innerBadge.strokePath();

    highlight.add([frame, crest, innerBadge]);

    for (let index = 0; index < SEGMENT_HIGHLIGHT_DOT_COUNT; index += 1) {
      const dotAngle = Phaser.Math.Linear(
        startAngle + 0.1,
        endAngle - 0.1,
        index / (SEGMENT_HIGHLIGHT_DOT_COUNT - 1),
      );
      const dotRadius = SEGMENT_HIGHLIGHT_OUTER_RADIUS - 8;
      const dotX = Math.cos(dotAngle) * dotRadius;
      const dotY = Math.sin(dotAngle) * dotRadius;
      const dotShadow = this.add.circle(dotX, dotY + 4, 11, SEGMENT_HIGHLIGHT_SHADOW, 0.22);
      const dotOuter = this.add.circle(dotX, dotY, 12, SEGMENT_HIGHLIGHT_ORANGE, 1);
      const dotInner = this.add.circle(dotX, dotY, 6, SEGMENT_HIGHLIGHT_GOLD_SOFT, 1);
      highlight.add([dotShadow, dotOuter, dotInner]);
    }

    highlight.setAlpha(0.72);
    this.wheelRoot.add(highlight);
    this.highlightGraphic = highlight;

    this.highlightTween = this.tweens.add({
      targets: highlight,
      alpha: { from: 0.58, to: 1 },
      scaleX: { from: 0.992, to: 1.028 },
      scaleY: { from: 0.992, to: 1.028 },
      duration: 280,
      ease: "Quad.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }

  private syncWinningSegmentHighlight() {
    if (this.highlightedSegmentIndex === this.renderedHighlightIndex) {
      return;
    }

    if (this.highlightedSegmentIndex === undefined) {
      this.highlightTween?.stop();
      this.highlightTween = undefined;
      this.highlightGraphic?.destroy();
      this.highlightGraphic = undefined;
      this.renderedHighlightIndex = undefined;
      return;
    }

    this.attachWinningSegmentPulse(this.highlightedSegmentIndex);
    this.renderedHighlightIndex = this.highlightedSegmentIndex;
  }

  private getWheelSignature(
    segments: WheelSegmentDto[],
    wheelVisualState = WheelVisualState.Normal,
  ) {
    return [
      wheelVisualState,
      ...segments.map((segment) =>
        [
          segment.segmentIndex,
          segment.label,
          segment.scoreOperator,
          segment.scoreOperand,
          segment.weightPercent,
        ].join(":"),
      ),
    ].join("|");
  }

  private syncPointerVisualState() {
    if (!this.pointer) {
      return;
    }

    if (this.currentWheelVisualState === WheelVisualState.GreyedOut) {
      this.pointer.setTintFill(0xf8fafb);
      this.pointer.setAlpha(0.82);
      return;
    }

    this.pointer.clearTint();
    this.pointer.setAlpha(1);
  }

  private launchCelebrationFireworks(segmentIndex: number) {
    this.clearCelebrationBursts();

    for (let index = 0; index < FIREWORK_BURST_COUNT; index += 1) {
      const timer = this.time.delayedCall(index * FIREWORK_CADENCE_MS, () => {
        const point = this.getWinningSegmentFireworkPoint(segmentIndex);
        const isHeroBurst = index % 4 === 0;
        this.createFireworkBurst(
          point.x,
          point.y,
          Phaser.Math.FloatBetween(isHeroBurst ? 1.06 : 0.88, isHeroBurst ? 1.24 : 1.06),
        );

        if (Math.random() < (isHeroBurst ? 0.55 : 0.32)) {
          const echo = this.getNearbyFireworkPoint(point);
          this.createFireworkBurst(
            echo.x,
            echo.y,
            Phaser.Math.FloatBetween(isHeroBurst ? 0.72 : 0.54, isHeroBurst ? 0.92 : 0.76),
          );
        }
      });

      this.celebrationBursts.push(timer);
    }
  }

  private clearCelebrationBursts() {
    this.celebrationBursts.forEach((timer) => timer.remove(false));
    this.celebrationBursts = [];
  }

  private getWinningSegmentFireworkPoint(segmentIndex: number) {
    const wheelRadius = (WHEEL_ASSET_SIZE * WHEEL_SCALE) / 2;
    const segmentAngle =
      this.wheelRotation +
      Phaser.Math.DegToRad(-90 + segmentIndex * 60 + Phaser.Math.FloatBetween(-34, 34));
    const tangentAngle = segmentAngle + Math.PI / 2;
    const radius = wheelRadius * Phaser.Math.FloatBetween(0.42, 1.28);
    const tangentOffset = wheelRadius * Phaser.Math.FloatBetween(-0.34, 0.34);
    const x = Phaser.Math.Clamp(
      WHEEL_CENTER_X + Math.cos(segmentAngle) * radius + Math.cos(tangentAngle) * tangentOffset,
      340,
      1580,
    );
    const y = Phaser.Math.Clamp(
      WHEEL_CENTER_Y + Math.sin(segmentAngle) * radius + Math.sin(tangentAngle) * tangentOffset,
      360,
      1440,
    );

    return { x, y };
  }

  private getNearbyFireworkPoint(origin: { x: number; y: number }) {
    return {
      x: Phaser.Math.Clamp(origin.x + Phaser.Math.Between(-128, 128), 340, 1580),
      y: Phaser.Math.Clamp(origin.y + Phaser.Math.Between(-104, 104), 360, 1440),
    };
  }

  private createFireworkBurst(x: number, y: number, scale = 1) {
    const colors = [
      0xff304f,
      0xff8a00,
      0xffd400,
      0x8be000,
      0x16cf6a,
      0x00cfff,
      0x2d7cff,
      0x7c3cff,
      0xff4ed8,
    ];
    const burstBaseColor = colors[Phaser.Math.Between(0, colors.length - 1)];

    const flash = this.add.circle(x, y, 20 * scale, burstBaseColor, 0.5);
    flash.setDepth(FIREWORK_EFFECT_DEPTH);
    this.tweens.add({
      targets: flash,
      scale: 3.9,
      alpha: 0,
      duration: 440,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });

    const ring = this.add.circle(x, y, 30 * scale);
    ring.setStrokeStyle(6 * scale, burstBaseColor, 0.92);
    ring.setDepth(FIREWORK_EFFECT_DEPTH);
    this.tweens.add({
      targets: ring,
      scale: 4.2,
      alpha: 0,
      duration: 980,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    const spokes = this.add.graphics({ x, y });
    spokes.setDepth(FIREWORK_EFFECT_DEPTH);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6 + Phaser.Math.FloatBetween(-0.12, 0.12);
      const inner = 18 * scale;
      const outer = Phaser.Math.Between(88, 130) * scale;
      const spokeColor = colors[(index + Phaser.Math.Between(0, 3)) % colors.length];
      spokes.lineStyle(5 * scale, spokeColor, 0.92);
      spokes.beginPath();
      spokes.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      spokes.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      spokes.strokePath();
    }
    this.tweens.add({
      targets: spokes,
      scale: 1.22,
      alpha: 0,
      angle: Phaser.Math.Between(-25, 25),
      duration: 940,
      ease: "Quart.easeOut",
      onComplete: () => spokes.destroy(),
    });

    createRibbonsBurst(this, x, y, {
      depth: FIREWORK_EFFECT_DEPTH,
      scale: scale * Phaser.Math.FloatBetween(0.74, 0.94),
      alpha: Phaser.Math.FloatBetween(0.94, 1),
    });

    const particleCount = Phaser.Math.Between(8, 12);
    for (let index = 0; index < particleCount; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(120, 190) * scale;
      const size = Phaser.Math.Between(5, 10) * scale;
      const particleColor =
        colors[(index + Phaser.Math.Between(0, colors.length - 1)) % colors.length];
      const particle = this.add
        .circle(
          x,
          y,
          size,
          particleColor,
          Phaser.Math.FloatBetween(0.86, 1),
        );
      particle.setDepth(FIREWORK_EFFECT_DEPTH);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + Phaser.Math.Between(-24, 34) * scale,
        scale: 0.18,
        alpha: 0,
        duration: Phaser.Math.Between(900, 1450),
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private drawPointer() {
    this.pointer = this.add
      .image(POINTER_X, POINTER_Y, "Desktop_RouletteArrow")
      .setOrigin(0.5, 1)
      .setScale(POINTER_SCALE)
      .setDepth(7);
    this.syncPointerVisualState();
  }

  private createWheelCenterButton(): DesktopWheelButton {
    const container = this.add.container(WHEEL_CENTER_X, WHEEL_CENTER_Y);
    container.setDepth(7);

    const face = this.add.image(0, 0, "Desktop_SpinRed");
    const spinArrows = this.add.image(0, 0, "Desktop_SpinArrow");
    const label = this.add
      .text(0, 4, "SPIN NOW", {
        fontFamily: FONTS.displayName,
        fontSize: "40px",
        color: "#ffffff",
        fontStyle: "800",
        align: "center",
      })
      .setOrigin(0.5);
    label.setWordWrapWidth(214, true);

    face.setScale(0.79);
    spinArrows.setScale(0.86);
    container.add([face, spinArrows, label]);
    container.setSize(300, 300);

    const syncVisuals = (color: number) => {
      face.clearTint();
      spinArrows.clearTint();
      face.setTexture("Desktop_SpinRed");
      face.setAlpha(1);
      spinArrows.setAlpha(1);

      if (color === COLORS.accent) {
        face.setTint(0xffd15a);
        label.setColor("#0a2942");
        return;
      }

      if (color === COLORS.disabled) {
        face.setTexture("Desktop_SpinExpired");
        spinArrows.setTintFill(0xf0f3f6);
        spinArrows.setAlpha(0.62);
        label.setColor("#ffffff");
        return;
      }

      label.setColor("#ffffff");
    };

    const setInteractive = (enabled: boolean) => {
      face.disableInteractive();
      if (!enabled) {
        container.setAlpha(0.76);
        return;
      }

      face.setInteractive({ useHandCursor: true });
      container.setAlpha(1);
    };

    face.on("pointerup", () => {
      this.runTapAction(() => {
        const snapshot = prototypeState.getSnapshot();
        const eligibility = snapshot.eligibility?.eligibilityStatus;

        if (!eligibility || this.spinning) {
          return;
        }

        if (eligibility === EligibilityStatus.GoToDeposit) {
          openExternalLink(snapshot.eligibility?.depositUrl);
          return;
        }

        if (eligibility !== EligibilityStatus.PlayableNow) {
          return;
        }

        void prototypeState.spin();
      });
    });
    face.on("pointerover", () => {
      container.setScale(1.03);
    });
    face.on("pointerout", () => {
      container.setScale(1);
    });

    syncVisuals(COLORS.primary);
    setInteractive(true);

    return {
      container,
      label,
      setLabel(nextLabel: string) {
        label.setText(nextLabel);
      },
      setBackground(color: number) {
        syncVisuals(color === COLORS.primary ? 0xe15693 : color);
      },
      setEnabled(enabled: boolean) {
        setInteractive(enabled);
      },
    };
  }

  private addRankRibbon(x: number, y: number, rank: number, prizeLabel: string) {
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();
    const width = 152;
    const height = 56;
    const notchWidth = 28;
    const palette = this.getRankPalette(rank);

    graphics.fillStyle(palette.shadow, 0.24);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(-width / 2 + 7, -height / 2 + 6),
        new Phaser.Geom.Point(width / 2 - notchWidth + 7, -height / 2 + 6),
        new Phaser.Geom.Point(width / 2 + 7, 6),
        new Phaser.Geom.Point(width / 2 - notchWidth + 7, height / 2 + 6),
        new Phaser.Geom.Point(-width / 2 + 7, height / 2 + 6),
      ],
      true,
    );

    graphics.fillStyle(palette.fill, 1);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(-width / 2, -height / 2),
        new Phaser.Geom.Point(width / 2 - notchWidth, -height / 2),
        new Phaser.Geom.Point(width / 2, 0),
        new Phaser.Geom.Point(width / 2 - notchWidth, height / 2),
        new Phaser.Geom.Point(-width / 2, height / 2),
      ],
      true,
    );

    graphics.fillStyle(palette.stripe, 0.9);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(width / 2 - 44, -height / 2),
        new Phaser.Geom.Point(width / 2 - 18, -height / 2),
        new Phaser.Geom.Point(width / 2 - notchWidth + 2, -3),
        new Phaser.Geom.Point(width / 2 - 18, height / 2),
        new Phaser.Geom.Point(width / 2 - 44, height / 2),
        new Phaser.Geom.Point(width / 2 - notchWidth - 18, 2),
      ],
      true,
    );

    const prizePill = this.add.graphics();
    prizePill.fillStyle(palette.pillFill, 0.98);
    prizePill.fillRoundedRect(-64, 7, 88, 20, 7);

    const rankSuffix = this.getOrdinalSuffix(rank);

    const rankText = this.add
      .text(-57, -8, String(rank), {
        fontFamily: FONTS.display,
        fontSize: rank < 10 ? "34px" : "28px",
        fontStyle: "700",
        color: palette.rankColor,
      })
      .setOrigin(0, 0.5);

    const suffixText = this.add
      .text(rank < 10 ? -25 : -16, -6, rankSuffix, {
        fontFamily: FONTS.body,
        fontSize: "15px",
        fontStyle: "700",
        color: palette.suffixColor,
      })
      .setOrigin(0, 0.5);

    const prizeText = this.add
      .text(-56, 17, prizeLabel, {
        fontFamily: FONTS.body,
        fontSize: "12px",
        fontStyle: "700",
        color: palette.amountColor,
      })
      .setOrigin(0, 0.5);

    container.add([graphics, prizePill, rankText, suffixText, prizeText]);
    return container;
  }

  private getRankPalette(rank: number): RankPalette {
    if (rank <= 3) {
      return {
        fill: 0x14a8ee,
        shadow: 0x0f86c5,
        stripe: 0x9ae4ff,
        pillFill: 0xfafcff,
        rankColor: "#ffffff",
        suffixColor: "#ffffff",
        amountColor: "#0fa0e7",
      };
    }

    return {
      fill: 0xcfcfcf,
      shadow: 0x9ea5ad,
      stripe: 0xf4f4f4,
      pillFill: 0xffffff,
      rankColor: "#ffffff",
      suffixColor: "#ffffff",
      amountColor: "#9ca3ab",
    };
  }

  private getOrdinalSuffix(rank: number) {
    const remainder = rank % 100;
    if (remainder >= 11 && remainder <= 13) {
      return "th";
    }

    switch (rank % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }

  private getEventSelectorValue() {
    const currentEvent = prototypeState.getSnapshot().currentEvent;
    if (!currentEvent) {
      return prototypeState.t("lobby.loadingLiveEvent");
    }

    return currentEvent.id.length <= 22
      ? currentEvent.id
      : currentEvent.promotionPeriodLabel || currentEvent.title;
  }

  private formatAccountLabel(playerName?: string) {
    if (!playerName) {
      return "--------";
    }

    const compact = playerName.replace(/\s+/g, "");
    return compact.length > 12 ? `${compact.slice(0, 12)}...` : compact;
  }

  private openLocalePicker() {
    const snapshot = prototypeState.getSnapshot();

    this.showPicker("Choose Language", snapshot.supportedLocales.map((option) => ({
      label: option.label,
      description: option.code,
      selected: option.code === snapshot.locale,
      onSelect: () => prototypeState.setLocale(option.code),
    })));
  }

  private openEventPicker() {
    const snapshot = prototypeState.getSnapshot();

    this.showEventPicker(snapshot.events as DesktopEventPickerEntry[], snapshot.currentEvent?.id);
  }

  private showEventPicker(events: DesktopEventPickerEntry[], selectedEventId?: string) {
    if (events.length === 0) {
      return;
    }

    this.closePicker();

    const panelHeight = Math.min(
      940,
      268 + Math.max(0, events.length - 1) * DESKTOP_EVENT_PICKER_CARD_STEP_Y + DESKTOP_EVENT_PICKER_CARD_HEIGHT,
    );
    const modal = this.pinToViewport(this.add.container(0, 0));
    modal.setDepth(MODAL_DEPTH);

    const backdrop = this.pinToViewport(
      this.add
        .rectangle(DESKTOP_PAGE_CENTER_X, DESKTOP_PAGE_CENTER_Y, STAGE_WIDTH, STAGE_HEIGHT, COLORS.overlay, 0.72)
        .setInteractive(),
    );
    const swallowBackdropTap = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    };
    backdrop.on("pointerdown", swallowBackdropTap);
    backdrop.on("pointerup", swallowBackdropTap);
    modal.add(backdrop);

    const panel = this.pinToViewport(
      addRoundedPanel(
        this,
        DESKTOP_PAGE_CENTER_X,
        DESKTOP_PAGE_CENTER_Y,
        DESKTOP_EVENT_PICKER_PANEL_WIDTH,
        panelHeight,
        {
          fillColor: COLORS.panel,
          radius: 40,
        },
      ),
    );
    panel.setSize(DESKTOP_EVENT_PICKER_PANEL_WIDTH, panelHeight);
    panel.setInteractive(
      new Phaser.Geom.Rectangle(
        -DESKTOP_EVENT_PICKER_PANEL_WIDTH / 2,
        -panelHeight / 2,
        DESKTOP_EVENT_PICKER_PANEL_WIDTH,
        panelHeight,
      ),
      Phaser.Geom.Rectangle.Contains,
    );

    const swallowPanelTap = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    };

    panel.on("pointerdown", swallowPanelTap);
    panel.on("pointerup", swallowPanelTap);
    modal.add(panel);

    const titleText = this.pinToViewport(
      this.add.text(
        DESKTOP_PAGE_CENTER_X,
        DESKTOP_PAGE_CENTER_Y - panelHeight / 2 + 58,
        prototypeState.t("period.title"),
        {
          fontFamily: FONTS.display,
          fontSize: "38px",
          fontStyle: "700",
          color: "#10a7eb",
        },
      ),
    );
    titleText.setOrigin(0.5);
    modal.add(titleText);

    const subtitleText = this.pinToViewport(
      this.add.text(
        DESKTOP_PAGE_CENTER_X,
        DESKTOP_PAGE_CENTER_Y - panelHeight / 2 + 108,
        prototypeState.t("period.subtitle"),
        {
          fontFamily: FONTS.body,
          fontSize: "16px",
          color: "#60809a",
          align: "center",
          wordWrap: { width: DESKTOP_EVENT_PICKER_PANEL_WIDTH - 120, useAdvancedWrap: true },
        },
      ),
    );
    subtitleText.setOrigin(0.5);
    modal.add(subtitleText);

    const closeFrame = this.pinToViewport(
      addRoundedPanel(
        this,
        DESKTOP_PAGE_CENTER_X + DESKTOP_EVENT_PICKER_PANEL_WIDTH / 2 - 54,
        DESKTOP_PAGE_CENTER_Y - panelHeight / 2 + 58,
        44,
        44,
        {
          fillColor: COLORS.panelSoft,
          strokeColor: COLORS.line,
          radius: 15,
          skipHighlight: true,
        },
      ),
    );
    modal.add(closeFrame);

    const closeLabel = this.pinToViewport(
      this.add.text(
        DESKTOP_PAGE_CENTER_X + DESKTOP_EVENT_PICKER_PANEL_WIDTH / 2 - 54,
        DESKTOP_PAGE_CENTER_Y - panelHeight / 2 + 58,
        "x",
        {
          fontFamily: FONTS.body,
          fontSize: "28px",
          fontStyle: "700",
          color: "#0a2942",
        },
      ),
    );
    closeLabel.setOrigin(0.5);
    modal.add(closeLabel);

    const closeHitArea = this.pinToViewport(
      this.add
        .rectangle(
          DESKTOP_PAGE_CENTER_X + DESKTOP_EVENT_PICKER_PANEL_WIDTH / 2 - 54,
          DESKTOP_PAGE_CENTER_Y - panelHeight / 2 + 58,
          68,
          68,
          0xffffff,
          0,
        )
        .setInteractive({ useHandCursor: true }),
    );
    closeHitArea.on("pointerdown", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.closePicker();
    });
    modal.add(closeHitArea);

    const firstRowY = DESKTOP_PAGE_CENTER_Y - panelHeight / 2 + 190;
    events.forEach((entry, index) => {
      const y = firstRowY + index * DESKTOP_EVENT_PICKER_CARD_STEP_Y;
      this.drawDesktopEventPickerCard(modal, entry, y, entry.id === selectedEventId);
    });

    this.pickerContainer = modal;
  }

  private drawDesktopEventPickerCard(
    modal: Phaser.GameObjects.Container,
    entry: DesktopEventPickerEntry,
    y: number,
    isSelected: boolean,
  ) {
    const tone = this.getDesktopEventPickerTone(entry.status);
    const card = this.pinToViewport(this.add.container(DESKTOP_PAGE_CENTER_X, y));

    const shadow = this.add.graphics();
    shadow.fillStyle(isSelected ? tone.accent : tone.deep, isSelected ? 0.14 : 0.08);
    shadow.fillRoundedRect(
      -DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 + 8,
      -DESKTOP_EVENT_PICKER_CARD_HEIGHT / 2 + 8,
      DESKTOP_EVENT_PICKER_CARD_WIDTH,
      DESKTOP_EVENT_PICKER_CARD_HEIGHT,
      18,
    );

    const plate = this.add.graphics();
    plate.fillStyle(isSelected ? 0xf7fcff : COLORS.white, 1);
    plate.fillRoundedRect(
      -DESKTOP_EVENT_PICKER_CARD_WIDTH / 2,
      -DESKTOP_EVENT_PICKER_CARD_HEIGHT / 2,
      DESKTOP_EVENT_PICKER_CARD_WIDTH,
      DESKTOP_EVENT_PICKER_CARD_HEIGHT,
      18,
    );
    plate.lineStyle(2, isSelected ? tone.accent : tone.edge, 0.92);
    plate.strokeRoundedRect(
      -DESKTOP_EVENT_PICKER_CARD_WIDTH / 2,
      -DESKTOP_EVENT_PICKER_CARD_HEIGHT / 2,
      DESKTOP_EVENT_PICKER_CARD_WIDTH,
      DESKTOP_EVENT_PICKER_CARD_HEIGHT,
      18,
    );

    plate.fillStyle(tone.wash, isSelected ? 0.96 : 0.82);
    plate.fillRoundedRect(
      -DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 + 12,
      -DESKTOP_EVENT_PICKER_CARD_HEIGHT / 2 + 12,
      DESKTOP_EVENT_PICKER_CARD_WIDTH - 24,
      38,
      9,
    );

    plate.fillStyle(tone.soft, isSelected ? 0.9 : 0.62);
    plate.fillRoundedRect(
      -DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 + 12,
      -DESKTOP_EVENT_PICKER_CARD_HEIGHT / 2 + 12,
      DESKTOP_EVENT_PICKER_STATUS_BAY_WIDTH,
      DESKTOP_EVENT_PICKER_CARD_HEIGHT - 24,
      12,
    );

    plate.fillStyle(tone.accent, isSelected ? 0.2 : 0.1);
    plate.fillRoundedRect(
      -DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 + DESKTOP_EVENT_PICKER_STATUS_BAY_WIDTH + 22,
      -DESKTOP_EVENT_PICKER_CARD_HEIGHT / 2 + 18,
      200,
      14,
      7,
    );

    plate.lineStyle(2, tone.accent, 0.22);
    plate.beginPath();
    plate.moveTo(
      -DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 + DESKTOP_EVENT_PICKER_STATUS_BAY_WIDTH + 16,
      -DESKTOP_EVENT_PICKER_CARD_HEIGHT / 2 + 18,
    );
    plate.lineTo(
      -DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 + DESKTOP_EVENT_PICKER_STATUS_BAY_WIDTH + 16,
      DESKTOP_EVENT_PICKER_CARD_HEIGHT / 2 - 18,
    );
    plate.strokePath();

    card.add([shadow, plate]);
    if (isSelected) {
      card.add(this.createDesktopEventPickerPointer());
    }
    card.add(this.createDesktopEventPickerStatusTower(tone, entry.status));

    const title = this.add
      .text(-DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 + 112, -28, entry.title, {
        fontFamily: FONTS.display,
        fontSize: "21px",
        fontStyle: "700",
        color: "#0a2942",
      })
      .setOrigin(0, 0.5);

    const description = this.add
      .text(-DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 + 112, 15, entry.code || entry.id, {
        fontFamily: FONTS.body,
        fontSize: "13px",
        color: "#597a95",
        wordWrap: { width: 390, useAdvancedWrap: true },
      })
      .setOrigin(0, 0.5);

    const dateText = this.add
      .text(DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 - 16, -30, entry.promotionPeriodLabel, {
        fontFamily: FONTS.body,
        fontSize: "14px",
        fontStyle: "700",
        color: tone.dateText,
        align: "right",
      })
      .setOrigin(1, 0.5);

    const chip = this.createDesktopEventPickerStatusChip(
      DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 - 92,
      34,
      isSelected ? prototypeState.t("period.selected") : this.getDesktopEventPickerStatusLabel(entry.status),
      tone,
      isSelected,
    );

    const hitArea = this.add.rectangle(0, 0, DESKTOP_EVENT_PICKER_CARD_WIDTH, DESKTOP_EVENT_PICKER_CARD_HEIGHT, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });

    const beginSelection = () => {
      if (this.pickerBusy) {
        return;
      }

      this.pickerBusy = true;
      hitArea.disableInteractive();

      void prototypeState.selectEvent(entry.id)
        .then(() => {
          const snapshot = prototypeState.getSnapshot();
          this.showEventPicker(snapshot.events as DesktopEventPickerEntry[], snapshot.currentEvent?.id);
        })
        .catch(() => {
          this.pickerBusy = false;
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
    hitArea.on("pointerover", () => card.setScale(1.01));
    hitArea.on("pointerout", () => card.setScale(1));
    hitArea.on("pointerup", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    });

    card.add([title, description, dateText, chip, hitArea]);
    modal.add(card);
  }

  private createDesktopEventPickerStatusTower(tone: DesktopEventTone, status: EventStatus) {
    const tower = this.add.container(-DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 + 56, 8);
    tower.setScale(0.88);

    const shadow = this.add.graphics();
    shadow.fillStyle(tone.deep, 0.14);
    shadow.fillRoundedRect(-16, -32, 32, 84, 14);
    shadow.fillCircle(0, -50, 21);

    const body = this.add.graphics();
    body.fillStyle(tone.deep, 0.98);
    body.fillRoundedRect(-14, -36, 28, 88, 14);
    body.fillStyle(tone.accent, 1);
    body.fillRoundedRect(-5, -20, 10, 58, 5);
    body.fillStyle(0xffffff, 0.2);
    body.fillRoundedRect(-5, -20, 10, 14, 5);

    body.fillStyle(tone.deep, 1);
    body.fillCircle(0, -50, 19);
    body.lineStyle(2.5, tone.accent, 0.95);
    body.strokeCircle(0, -50, 16);
    body.fillStyle(tone.soft, 0.96);
    body.fillCircle(0, 45, 8);

    tower.add([shadow, body, this.createDesktopEventPickerStatusGlyph(status)]);
    return tower;
  }

  private createDesktopEventPickerPointer() {
    const pointer = this.add.container(-DESKTOP_EVENT_PICKER_CARD_WIDTH / 2 - 18, 8);

    const shadow = this.add.graphics();
    shadow.fillStyle(DESKTOP_EVENT_PICKER_POINTER_DEEP, 0.18);
    shadow.fillTriangle(-14, -18, 14, 0, -14, 18);

    const body = this.add.graphics();
    body.fillStyle(DESKTOP_EVENT_PICKER_POINTER_ACCENT, 0.98);
    body.fillTriangle(-18, -20, 12, 0, -18, 20);

    const highlight = this.add.graphics();
    highlight.fillStyle(0xffffff, 0.24);
    highlight.fillTriangle(-14, -9, 0, -1, -14, 7);

    pointer.add([shadow, body, highlight]);
    return pointer;
  }

  private createDesktopEventPickerStatusGlyph(status: EventStatus) {
    const glyph = this.add.graphics();

    switch (status) {
      case EventStatus.Live:
        glyph.fillStyle(0xffffff, 1);
        glyph.fillCircle(0, -50, 3);
        glyph.lineStyle(2, 0xffffff, 0.95);
        glyph.strokeCircle(0, -50, 8);
        glyph.strokeCircle(0, -50, 13);
        return glyph;

      case EventStatus.Ended:
        glyph.lineStyle(2.5, 0xffffff, 1);
        glyph.beginPath();
        glyph.moveTo(-8, -60);
        glyph.lineTo(8, -44);
        glyph.moveTo(-8, -44);
        glyph.lineTo(8, -60);
        glyph.strokePath();
        return glyph;

      case EventStatus.Finalized:
      default:
        glyph.lineStyle(3, 0xffffff, 1);
        glyph.beginPath();
        glyph.moveTo(-8, -49);
        glyph.lineTo(-2, -42);
        glyph.lineTo(10, -55);
        glyph.strokePath();
        return glyph;
    }
  }

  private createDesktopEventPickerStatusChip(
    x: number,
    y: number,
    label: string,
    tone: DesktopEventTone,
    isSelected: boolean,
  ) {
    const chip = this.add.container(x, y);
    const bg = this.add.graphics();
    const fill = isSelected ? tone.accent : tone.deep;

    bg.fillStyle(fill, 0.96);
    bg.fillRoundedRect(-74, -19, 148, 38, 12);
    bg.lineStyle(1, 0xffffff, 0.14);
    bg.strokeRoundedRect(-74, -19, 148, 38, 12);
    bg.fillStyle(0xffffff, 0.12);
    bg.fillRoundedRect(-56, -12, 112, 10, 5);

    const text = this.add
      .text(0, 1, label, {
        fontFamily: FONTS.body,
        fontSize: "11px",
        fontStyle: "700",
        color: tone.chipText,
      })
      .setOrigin(0.5);

    chip.add([bg, text]);
    return chip;
  }

  private getDesktopEventPickerTone(status: EventStatus): DesktopEventTone {
    switch (status) {
      case EventStatus.Live:
        return {
          accent: 0x1db9ff,
          deep: 0x0c7bbd,
          soft: 0xd9f4ff,
          wash: 0xebf9ff,
          edge: 0x9bdcff,
          chipText: "#ffffff",
          dateText: "#2f6888",
        };
      case EventStatus.Ended:
        return {
          accent: 0xf1b34a,
          deep: 0x8d6726,
          soft: 0xffefcc,
          wash: 0xfff7e7,
          edge: 0xf7d28c,
          chipText: "#ffffff",
          dateText: "#7d6135",
        };
      case EventStatus.Finalized:
      default:
        return {
          accent: 0x7b95af,
          deep: 0x546d87,
          soft: 0xe7eef5,
          wash: 0xf5f8fb,
          edge: 0xb9cfdf,
          chipText: "#ffffff",
          dateText: "#4d6b82",
        };
    }
  }

  private getDesktopEventPickerStatusLabel(status: EventStatus) {
    switch (status) {
      case EventStatus.Live:
        return prototypeState.t("period.live");
      case EventStatus.Ended:
        return prototypeState.t("period.ended");
      case EventStatus.Finalized:
        return prototypeState.t("period.finalized");
      default:
        return status.toUpperCase();
    }
  }

  private showPicker(title: string, options: PickerOption[]) {
    if (options.length === 0) {
      return;
    }

    this.closePicker();

    const panelHeight = Math.min(920, 180 + options.length * 118);
    const modal = this.pinToViewport(this.add.container(0, 0));
    modal.setDepth(MODAL_DEPTH);

    const backdrop = this.pinToViewport(
      this.add
        .rectangle(DESKTOP_PAGE_CENTER_X, DESKTOP_PAGE_CENTER_Y, STAGE_WIDTH, STAGE_HEIGHT, COLORS.overlay, 0.72)
        .setInteractive({ useHandCursor: true }),
    );
    backdrop.on("pointerup", () => this.closePicker());
    modal.add(backdrop);

    const panel = this.pinToViewport(
      addRoundedPanel(this, DESKTOP_PAGE_CENTER_X, DESKTOP_PAGE_CENTER_Y, 760, panelHeight, {
        fillColor: COLORS.panel,
        radius: 40,
      }),
    );
    modal.add(panel);

    const titleText = this.pinToViewport(
      this.add.text(DESKTOP_PAGE_CENTER_X, DESKTOP_PAGE_CENTER_Y - panelHeight / 2 + 54, title, {
        fontFamily: FONTS.display,
        fontSize: "38px",
        fontStyle: "700",
        color: "#10a7eb",
      }),
    );
    titleText.setOrigin(0.5);
    modal.add(titleText);

    const firstRowY = DESKTOP_PAGE_CENTER_Y - panelHeight / 2 + 144;
    options.forEach((option, index) => {
      const y = firstRowY + index * 110;
      const card = this.pinToViewport(
        addRoundedPanel(this, DESKTOP_PAGE_CENTER_X, y, 680, 88, {
          fillColor: option.selected ? 0xe7f8ff : COLORS.white,
          radius: 28,
        }),
      );
      modal.add(card);

      const hitArea = this.pinToViewport(this.add.zone(DESKTOP_PAGE_CENTER_X, y, 700, 96));
      hitArea.setInteractive(
        new Phaser.Geom.Rectangle(-350, -48, 700, 96),
        Phaser.Geom.Rectangle.Contains,
      );
      hitArea.on("pointerover", () => card.setScale(1.01));
      hitArea.on("pointerout", () => card.setScale(1));
      hitArea.on("pointerup", async () => {
        if (this.pickerBusy) {
          return;
        }

        this.pickerBusy = true;
        hitArea.disableInteractive();

        try {
          await option.onSelect();
          this.closePicker();
        } finally {
          this.pickerBusy = false;
        }
      });
      modal.add(hitArea);

      const label = this.pinToViewport(
        this.add.text(DESKTOP_PAGE_CENTER_X - 300, y - 10, option.label, {
          fontFamily: FONTS.display,
          fontSize: "30px",
          fontStyle: "700",
          color: "#0a2942",
        }),
      );
      label.setOrigin(0, 0.5);
      modal.add(label);

      if (option.description) {
        const description = this.pinToViewport(
          this.add.text(DESKTOP_PAGE_CENTER_X - 300, y + 22, option.description, {
            fontFamily: FONTS.body,
            fontSize: "18px",
            fontStyle: "700",
            color: "#5c7f9a",
          }),
        );
        description.setOrigin(0, 0.5);
        modal.add(description);
      }

      if (option.selected) {
        const chip = this.pinToViewport(
          addRoundedPanel(this, DESKTOP_PAGE_CENTER_X + 240, y, 118, 42, {
            fillColor: COLORS.accent,
            strokeColor: COLORS.accent,
            radius: 21,
          }),
        );
        chip.add(
          this.add
            .text(0, 0, "Current", {
              fontFamily: FONTS.body,
              fontSize: "16px",
              fontStyle: "700",
              color: "#0a2942",
            })
            .setOrigin(0.5),
        );
        modal.add(chip);
      }
    });

    this.pickerContainer = modal;
  }

  private closePicker() {
    this.pickerBusy = false;
    this.pickerContainer?.destroy(true);
    this.pickerContainer = undefined;
  }

  private isDesktopModalOpen() {
    return Boolean(this.pickerContainer) || this.scene.isActive(SCENE_KEYS.HistoryOverlay);
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
    this.registry.set("desktopScrollY", clamped);
  }

  private runTapAction(action: () => void) {
    if (this.isDraggingScroll || this.time.now < this.suppressTapUntil) {
      return;
    }

    action();
  }

  private pinToViewport<T extends Phaser.GameObjects.GameObject>(gameObject: T) {
    (gameObject as T & { setScrollFactor: (x: number, y?: number) => T }).setScrollFactor(0);
    return gameObject;
  }
}
