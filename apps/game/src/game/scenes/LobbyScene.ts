import Phaser from "phaser";
import { type EligibilityStatus, PlatformLinkType } from "@lucky-wheel/contracts";
import { ensureBackgroundMusic } from "../audio";
import { prototypeState } from "../state/prototype-state";
import type { WheelScene } from "./WheelScene";
import {
  COLORS,
  DEV_ELIGIBILITY_OPTIONS,
  FONTS,
  SCENE_KEYS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  shouldShowDevEligibilitySwitch,
} from "../constants";
import {
  addPill,
  addTextButton,
  addRoundedPanel,
  formatCountdownDuration,
  formatDate,
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

type SectionBand = {
  container: Phaser.GameObjects.Container;
  top: number;
  bottom: number;
  overscan: number;
};

const CONTENT_HEIGHT = 7100;
const LEADERBOARD_PAGE_SIZE = 10;
const LEADERBOARD_ROW_YS = [2240, 2370, 2490, 2610, 2735, 2860, 2983, 3109, 3231, 3358];
const INLINE_LEADERBOARD_TITLE_SCALE = 0.88;
const INLINE_LEADERBOARD_SUBTITLE_Y = 2112;
const INLINE_LEADERBOARD_HEADER_PANEL_Y = 2178;
const INLINE_LEADERBOARD_COLUMN_LABEL_Y = INLINE_LEADERBOARD_HEADER_PANEL_Y + 1;
const INLINE_LEADERBOARD_HEADER_UNDERLINE_Y = INLINE_LEADERBOARD_HEADER_PANEL_Y + 22;
const INLINE_LEADERBOARD_ROW_OFFSET_Y = 60;
const INLINE_LEADERBOARD_PLATE_SCALE = 0.32;
const INLINE_LEADERBOARD_SELF_PLATE_SCALE = 0.34;
const INLINE_LEADERBOARD_PLATE_BASE_X = 404;
const INLINE_LEADERBOARD_RANK_COLUMN_X = 182;
const INLINE_LEADERBOARD_USERNAME_COLUMN_X = 375;
const INLINE_LEADERBOARD_TOTAL_HEADER_X = 584;
const INLINE_LEADERBOARD_PRIZE_TEXT_X = 194;
const INLINE_LEADERBOARD_SCORE_TEXT_X = 598;
const INLINE_LEADERBOARD_PAGE_BUTTON_SCALE = 0.72;
const INLINE_LEADERBOARD_PAGE_BUTTON_Y = 3524;
const INLINE_LEADERBOARD_BOTTOM_DIVIDER_Y = 3566;
const INLINE_LEADERBOARD_SUMMARY_Y = 3648;
const INLINE_LEADERBOARD_SUMMARY_PLATE_SCALE = 0.34;
const INLINE_LEADERBOARD_FOOTER_Y = 3778;
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
const PRIZE_BADGE_KEYS = [
  "Prize_Ranking_01",
  "Prize_Ranking_02",
  "Prize_Ranking_03",
  "Prize_Ranking_04",
  "Prize_Ranking_05",
] as const;
const PAGE_BUTTON_KEYS = ["Button_Page", "Button_Page_1", "Button_Page_2"] as const;

export class LobbyScene extends Phaser.Scene {
  private cleanup: Array<() => void> = [];
  private sectionBands: SectionBand[] = [];
  private periodPanel?: Phaser.GameObjects.Image;
  private periodPill?: Phaser.GameObjects.Text;
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
  private pageButtons: Phaser.GameObjects.Image[] = [];
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
    ensureBackgroundMusic(this);
    this.cameras.main.setBackgroundColor(COLORS.pageTop);
    this.cameras.main.setBounds(0, 0, STAGE_WIDTH, CONTENT_HEIGHT);
    this.drawBackground();
    this.captureSection(0, 180, () => this.drawHeader());
    this.captureSection(220, 720, () => this.drawHero());
    this.activitySection = this.captureSection(620, 860, () => this.drawActionRow(), 220);
    this.captureSection(1600, 1920, () => {
      this.drawSummaryArea();
      this.drawQuickActions();
      this.drawDevPanel();
    });
    this.captureSection(2000, 3825, () => this.drawInlineLeaderboardSection(), 260);
    this.captureSection(3976, 5660, () => this.drawInlinePrizeSection(), 260);
    this.captureSection(5790, CONTENT_HEIGHT, () => this.drawInlineRulesSection(), 260);
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
      this.pageButtons = [];
      this.sectionBands = [];
    });

    this.setScrollY(Number(this.registry.get("mainScrollY") ?? 0));

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
    gradient.fillStyle(COLORS.stageMist, 0.08);
    gradient.fillCircle(220, 260, 240);
    gradient.fillCircle(860, 1500, 320);
    gradient.fillCircle(920, 320, 150);
    gradient.fillCircle(150, 3000, 260);
    gradient.fillCircle(930, 4550, 280);
    gradient.fillCircle(260, 6200, 220);
  }

  private drawHeader() {
    const centeredPeriodX = this.fromEditorX(375);
    const headerClusterOffsetX = this.fromEditorX(42);

    this.add.image(this.fromEditorX(83), 110, "Button_iBET").setScale(0.86);

    this.periodPanel = this.add.image(centeredPeriodX, 110, "Frame_time_01").setScale(0.38);
    this.periodPanel.setInteractive({ useHandCursor: true });
    this.periodPanel.on("pointerover", () => this.periodPanel?.setScale(0.392));
    this.periodPanel.on("pointerout", () => this.periodPanel?.setScale(0.38));
    this.periodPanel.on("pointerup", () => this.runTapAction(() => this.toggleOverlay(SCENE_KEYS.PeriodOverlay)));

    this.add
      .text(this.fromEditorX(207) + headerClusterOffsetX, 92, prototypeState.t("lobby.selectPeriod"), {
        fontFamily: FONTS.body,
        fontSize: "16px",
        fontStyle: "700",
        color: "#5f8098",
      })
      .setOrigin(0, 0.5);

    this.periodPill = this.add
      .text(centeredPeriodX, 120, prototypeState.t("lobby.loadingLiveEvent"), {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "700",
        color: "#415f77",
      })
      .setOrigin(0.5);

    const localeButton = this.add
      .image(this.fromEditorX(547) + headerClusterOffsetX, 110, "Button_Language")
      .setScale(0.78);
    localeButton.setInteractive({ useHandCursor: true });
    localeButton.on("pointerover", () => localeButton.setScale(0.8));
    localeButton.on("pointerout", () => localeButton.setScale(0.78));
    localeButton.on("pointerup", () => this.runTapAction(() => this.toggleOverlay(SCENE_KEYS.LocaleOverlay)));

    const supportButton = this.add
      .image(this.fromEditorX(666) + headerClusterOffsetX, 110, "Button_Support")
      .setScale(0.78);
    supportButton.setInteractive({ useHandCursor: true });
    supportButton.on("pointerover", () => supportButton.setScale(0.8));
    supportButton.on("pointerout", () => supportButton.setScale(0.78));
    supportButton.on("pointerup", () => this.runTapAction(() => {
      openExternalLink(this.getPlatformLinkUrl(PlatformLinkType.CustomerService));
    }));
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

    const stepSectionOffsetY = 20;
    const tutorialCenterX = 540;
    const tutorialScale = 0.86;
    const tutorialTextureWidth = 990;
    const tutorialIconXs = [161, 498, 830];
    this.add.image(540, 286, "Title_01").setScale(0.86);
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
    const itemWidth = 340;
    const itemHeight = 60;
    const bubbleCount = 3;

    this.activityBubbles = Array.from({ length: bubbleCount }, (_, index) => {
      const pill = addPill(
        this,
        STAGE_WIDTH / 2,
        780,
        itemWidth,
        itemHeight,
        "",
        0xe9f7ff,
        "#0a2942",
      );

      pill.text.setFontSize("20px");
      pill.text.setWordWrapWidth(284, true);
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
        startY: 780,
        endY: 780,
        startScale: 0.82,
        endScale: 0.96,
      };

      this.resetActivityBubble(bubble, index * 700 + Phaser.Math.Between(80, 260));
      return bubble;
    });

    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateActivityBubbles, this);
  }

  private drawSummaryArea() {
    this.add.image(540, 1670, "Frame_MyTotalPoint").setScale(0.79);

    this.add
      .text(258, 1670, `${prototypeState.t("lobby.myTotalPoints")}:`, {
        fontFamily: FONTS.body,
        fontSize: "52px",
        fontStyle: "700",
        color: "#15a8ee",
      })
      .setOrigin(0, 0.5);

    this.totalPointsText = this.add
      .text(822, 1668, "0", {
        fontFamily: FONTS.display,
        fontSize: "56px",
        fontStyle: "700",
        color: "#10a7eb",
      })
      .setOrigin(1, 0.5);
  }

  private drawQuickActions() {
    this.createHistoryActionButton(540, 1808, () => {
      this.toggleOverlay(SCENE_KEYS.HistoryOverlay);
    });

    this.createActionButton(820, 1808, 240, 88, "test_spin", () => {
      (this.scene.get(SCENE_KEYS.Wheel) as WheelScene | undefined)?.runVisualTestSpin();
    });
  }

  private drawInlineLeaderboardSection() {
    this.add
      .image(this.fromEditorX(379), 2020, "Title_Ranking")
      .setScale(INLINE_LEADERBOARD_TITLE_SCALE);
    this.add
      .text(540, INLINE_LEADERBOARD_SUBTITLE_Y, prototypeState.t("leaderboard.sectionSubtitle"), {
        fontFamily: FONTS.body,
        fontSize: "22px",
        fontStyle: "700",
        color: "#5a8099",
        align: "center",
        wordWrap: { width: 840, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    this.add
      .text(
        this.fromEditorX(INLINE_LEADERBOARD_RANK_COLUMN_X),
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
        this.fromEditorX(INLINE_LEADERBOARD_USERNAME_COLUMN_X),
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
        this.fromEditorX(INLINE_LEADERBOARD_TOTAL_HEADER_X),
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
    headerUnderline.lineStyle(3, 0x21b7f7, 0.96);
    headerUnderline.lineBetween(
      this.fromEditorX(72),
      INLINE_LEADERBOARD_HEADER_UNDERLINE_Y,
      this.fromEditorX(678),
      INLINE_LEADERBOARD_HEADER_UNDERLINE_Y,
    );

    this.leaderboardPendingText = this.add
      .text(540, 2346, "", {
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
        this.fromEditorX(42),
        y - 18,
        this.fromEditorX(64),
        y,
        this.fromEditorX(42),
        y + 18,
      );
      highlightArrow.setDepth(1);
      highlightArrow.setVisible(false);

      const plateScale = INLINE_LEADERBOARD_PLATE_SCALE;
      const plate = this.add
        .image(this.getLeaderboardPlateX(index + 1, plateScale), y, this.getLeaderboardPlateKey(index + 1))
        .setScale(plateScale);

      const playerText = this.add
        .text(this.fromEditorX(INLINE_LEADERBOARD_USERNAME_COLUMN_X), y - 4, "-", {
          fontFamily: FONTS.body,
          fontSize: "30px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0.5, 0.5);

      const prizeText = this.add
        .text(this.fromEditorX(INLINE_LEADERBOARD_PRIZE_TEXT_X), this.getLeaderboardPrizeTextY(y, index + 1), "", {
          fontFamily: FONTS.body,
          fontSize: "22px",
          fontStyle: "700",
          color: "#5d7d97",
        })
        .setOrigin(0.5, 0.5);

      const scoreText = this.add
        .text(this.fromEditorX(INLINE_LEADERBOARD_SCORE_TEXT_X), y - 4, "-", {
          fontFamily: FONTS.display,
          fontSize: "32px",
          fontStyle: "700",
          color: "#10a7eb",
        })
        .setOrigin(1, 0.5);

      this.inlineLeaderboardRows.push({ highlightArrow, plate, playerText, scoreText, prizeText });
    });

    const pageXs = [this.fromEditorX(295), this.fromEditorX(375), this.fromEditorX(455)];
    pageXs.forEach((x, index) => {
      const button = this.add
        .image(x, INLINE_LEADERBOARD_PAGE_BUTTON_Y, PAGE_BUTTON_KEYS[index])
        .setScale(INLINE_LEADERBOARD_PAGE_BUTTON_SCALE);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerup", () => this.runTapAction(() => {
        this.leaderboardPage = index + 1;
        this.refreshLeaderboardSection();
      }));
      this.pageButtons.push(button);
    });

    this.add.image(this.fromEditorX(374), INLINE_LEADERBOARD_BOTTOM_DIVIDER_Y, "Divider").setScale(1);

    this.myRankSummaryPlate = this.add
      .image(540, INLINE_LEADERBOARD_SUMMARY_Y, "RankingPlate_Notl")
      .setScale(INLINE_LEADERBOARD_SUMMARY_PLATE_SCALE)
      .setVisible(false);

    this.myRankSummaryPlayerText = this.add
      .text(this.fromEditorX(INLINE_LEADERBOARD_USERNAME_COLUMN_X), INLINE_LEADERBOARD_SUMMARY_Y - 4, "", {
        fontFamily: FONTS.body,
        fontSize: "30px",
        fontStyle: "700",
        color: "#0896d8",
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.myRankSummaryPrizeText = this.add
      .text(this.fromEditorX(INLINE_LEADERBOARD_PRIZE_TEXT_X), INLINE_LEADERBOARD_SUMMARY_Y, "", {
        fontFamily: FONTS.body,
        fontSize: "22px",
        fontStyle: "700",
        color: "#5d7d97",
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.myRankSummaryScoreText = this.add
      .text(this.fromEditorX(INLINE_LEADERBOARD_SCORE_TEXT_X), INLINE_LEADERBOARD_SUMMARY_Y - 4, "", {
        fontFamily: FONTS.display,
        fontSize: "32px",
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
        fontSize: "22px",
        color: "#62839b",
      })
      .setOrigin(0.5)
      .setLineSpacing(8);
  }

  private drawInlinePrizeSection() {
    this.add.image(this.fromEditorX(378), 3976, "Title_PrizeArea").setScale(1);
    this.add
      .text(540, 4046, prototypeState.t("prize.sectionSubtitle"), {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "700",
        color: "#415f77",
        align: "center",
        wordWrap: { width: 760, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    const rewardXs = [
      this.fromEditorX(480),
      this.fromEditorX(270),
      this.fromEditorX(480),
      this.fromEditorX(270),
      this.fromEditorX(480),
    ];
    const badgeXs = [
      this.fromEditorX(160),
      this.fromEditorX(590),
      this.fromEditorX(160),
      this.fromEditorX(590),
      this.fromEditorX(160),
    ];
    const yValues = [4221, 4541, 4861, 5181, 5501];

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
    const stripeBandTop = 6760;
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

    const termsPanel = this.add.graphics();
    termsPanel.fillStyle(COLORS.white, 0.98);
    termsPanel.fillRect(90, 5840, 900, 1060);
    termsPanel.lineStyle(2, COLORS.line, 0.65);
    termsPanel.strokeRect(90, 5840, 900, 1060);
    termsPanel.setDepth(1);

    const termsTitle = this.add
      .text(540, 5906, prototypeState.t("rules.title"), {
        fontFamily: FONTS.display,
        fontSize: "42px",
        fontStyle: "800",
        color: "#18aef5",
      })
      .setOrigin(0.5);
    termsTitle.setDepth(2);

    this.rulesBodyText = this.add
      .text(120, 5978, "", {
        fontFamily: FONTS.body,
        fontSize: "28px",
        color: "#253a4e",
        lineSpacing: 10,
        wordWrap: { width: 796, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
    this.rulesBodyText.setDepth(2);

    const depositButton = addTextButton(
      this,
      540,
      6990,
      830,
      104,
      "Go to Deposit",
      () =>
        this.runTapAction(() => {
          openExternalLink(this.getPlatformLinkUrl(PlatformLinkType.Deposit));
        }),
      {
        backgroundColor: COLORS.primary,
        radius: 46,
      },
    );
    depositButton.label.setFontSize(34);
    depositButton.container.setDepth(3);
  }

  private drawDevPanel() {
    if (!shouldShowDevEligibilitySwitch()) {
      return;
    }

    this.add
      .text(540, 1836, prototypeState.t("lobby.devSwitch"), {
        fontFamily: FONTS.body,
        fontSize: "20px",
        fontStyle: "700",
        color: "#119ae0",
      })
      .setOrigin(0.5);

    DEV_ELIGIBILITY_OPTIONS.forEach((option, index) => {
      const x = 126 + index * 206;
      const background = this.add.rectangle(x, 1880, 184, 44, 0xeef9ff, 1);
      background.setStrokeStyle(2, COLORS.line, 0.75);
      background.setInteractive({ useHandCursor: true });
      background.on("pointerup", () => this.runTapAction(() => {
        void prototypeState.setEligibilityOverride(option.value as EligibilityStatus | undefined);
      }));

      const label = this.add
        .text(x, 1880, option.label, {
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

      const nextScroll = this.dragStartScrollY - deltaY;
      this.setScrollY(nextScroll);

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
      this.setScrollY(this.cameras.main.scrollY + deltaY * 0.9);
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
      snapshot.currentEvent?.promotionPeriodLabel ?? prototypeState.t("lobby.loadingLiveEvent"),
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

    if (snapshot.leaderboard?.leaderboard.length) {
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
      row.prizeText.setVisible(visible);

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
      row.playerText.setY(slotBaseY - 4);
      row.scoreText.setY(slotBaseY - 4);
      row.prizeText.setY(this.getLeaderboardPrizeTextY(rowY, entry.rank));
      row.playerText.setText(maskLeaderboardPlayerName(entry.playerName, entry.isSelf));
      row.scoreText.setText(formatNumber(entry.score, snapshot.locale));
      row.prizeText.setText(entry.prizeName ?? `Rank #${entry.rank}`);
      row.playerText.setColor(entry.isSelf ? "#0896d8" : "#0a2942");
    });

    this.pageButtons.forEach((button, index) => {
      button.setAlpha(index + 1 === this.leaderboardPage ? 1 : 0.58);
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
    this.myRankSummaryPrizeText?.setVisible(showTopRankSummaryPlate);

    if (myRank) {
      const summarySlotBaseY = INLINE_LEADERBOARD_SUMMARY_Y;
      const summaryPlateY = showTopRankSummaryPlate
        ? this.getLeaderboardRowY(summarySlotBaseY, myRank.rank)
        : summarySlotBaseY;
      const summaryPlateX = showTopRankSummaryPlate
        ? this.getLeaderboardPlateX(myRank.rank, INLINE_LEADERBOARD_SUMMARY_PLATE_SCALE)
        : 540;

      this.myRankSummaryPlate
        ?.setTexture(showTopRankSummaryPlate ? this.getLeaderboardPlateKey(myRank.rank) : "RankingPlate_Notl")
        .setX(summaryPlateX)
        .setY(summaryPlateY)
        .setScale(INLINE_LEADERBOARD_SUMMARY_PLATE_SCALE);

      this.myRankSummaryPlayerText
        ?.setY(summarySlotBaseY - 4)
        .setText(myRank.playerName);

      this.myRankSummaryScoreText
        ?.setY(summarySlotBaseY - 4)
        .setText(formatNumber(myRank.score, snapshot.locale));

      this.myRankSummaryPrizeText
        ?.setY(this.getLeaderboardPrizeTextY(summaryPlateY, myRank.rank))
        .setText(myRank.prizeName ?? `Rank #${myRank.rank}`);

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
      syncPrizeArtImage(this, row.prizeArt, prize.imageUrl, 180, 120);
    });
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

  private updateActivityBubbles(_time: number, delta: number) {
    this.applyScrollMomentum(delta);

    if (this.activityBubbles.length === 0 || !this.activitySection?.visible) {
      return;
    }

    this.activityBubbles.forEach((bubble) => {
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
      if (bubble.progress < 0.2) {
        alpha = 0.96 * (bubble.progress / 0.2);
      } else if (bubble.progress > 0.72) {
        alpha = 0.96 * (1 - (bubble.progress - 0.72) / 0.28);
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

  private resetActivityBubble(
    bubble: ActivityBubble,
    delayMs = Phaser.Math.Between(360, 1100),
  ) {
    bubble.delayRemaining = delayMs;
    bubble.progress = 0;
    bubble.duration = Phaser.Math.Between(2500, 3200);
    bubble.startX = this.getRandomBubbleX(bubble.width / 2);
    bubble.startY = Phaser.Math.Between(774, 818);
    bubble.endY = Phaser.Math.Between(646, 676);
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

    bubble.text.setText(`ID ${playerId} earned ${formatNumber(points, snapshot.locale)} points`);
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
    const normalized = playerName.replace(/\s+/g, "");
    return normalized.length > 11 ? `${normalized.slice(0, 11)}...` : normalized;
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
    const baseX = this.fromEditorX(INLINE_LEADERBOARD_PLATE_BASE_X);
    const baselineVisualCenterOffset = -0.5;
    const visualCenterOffset = LEADERBOARD_PLATE_VISUAL_CENTER_OFFSETS[rank] ?? baselineVisualCenterOffset;
    return baseX + (baselineVisualCenterOffset - visualCenterOffset) * scaleX;
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

  private getLeaderboardPrizeTextY(rowY: number, rank: number) {
    if (rank >= 21) {
      return rowY + 48;
    }

    if (rank >= 11) {
      return rowY + 42;
    }

    return rowY + 30;
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
        fontSize: "30px",
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
