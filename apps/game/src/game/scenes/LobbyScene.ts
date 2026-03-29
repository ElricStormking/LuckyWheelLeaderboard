import Phaser from "phaser";
import { type EligibilityStatus, PlatformLinkType } from "@lucky-wheel/contracts";
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
import { addPill, addRoundedPanel, formatNumber, openExternalLink } from "../helpers";

type MarqueeCard = {
  container: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  width: number;
  speed: number;
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
  private myRankSummaryText?: Phaser.GameObjects.Text;
  private devControls: DevControl[] = [];
  private marqueeCards: MarqueeCard[] = [];
  private marqueeSection?: Phaser.GameObjects.Container;
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
    this.cameras.main.setBackgroundColor(COLORS.pageTop);
    this.cameras.main.setBounds(0, 0, STAGE_WIDTH, CONTENT_HEIGHT);
    this.drawBackground();
    this.captureSection(0, 180, () => this.drawHeader());
    this.captureSection(220, 720, () => this.drawHero());
    this.marqueeSection = this.captureSection(640, 780, () => this.drawActionRow(), 180);
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

    this.cleanup.push(
      prototypeState.subscribe("change", () => this.refreshDynamicContent()),
      prototypeState.subscribe("locale-change", () => this.scene.restart()),
      prototypeState.subscribe("error", () => {
        if (!this.scene.isActive(SCENE_KEYS.ErrorOverlay)) {
          this.scene.launch(SCENE_KEYS.ErrorOverlay);
        }
      }),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.UPDATE, this.updateMarquee, this);
      this.cleanup.forEach((cleanup) => cleanup());
      this.cleanup = [];
      this.marqueeCards = [];
      this.marqueeSection = undefined;
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
    this.add.image(this.fromEditorX(83), 110, "Button_iBET").setScale(0.86);

    this.periodPanel = this.add.image(this.fromEditorX(333), 110, "Frame_time_01").setScale(0.38);
    this.periodPanel.setInteractive({ useHandCursor: true });
    this.periodPanel.on("pointerover", () => this.periodPanel?.setScale(0.392));
    this.periodPanel.on("pointerout", () => this.periodPanel?.setScale(0.38));
    this.periodPanel.on("pointerup", () => this.runTapAction(() => this.toggleOverlay(SCENE_KEYS.PeriodOverlay)));

    this.add
      .text(this.fromEditorX(207), 92, prototypeState.t("lobby.selectPeriod"), {
        fontFamily: FONTS.body,
        fontSize: "16px",
        fontStyle: "700",
        color: "#5f8098",
      })
      .setOrigin(0, 0.5);

    this.periodPill = this.add
      .text(this.fromEditorX(333), 120, prototypeState.t("lobby.loadingLiveEvent"), {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "700",
        color: "#415f77",
      })
      .setOrigin(0.5);

    const localeButton = this.add.image(this.fromEditorX(547), 110, "Button_Language").setScale(0.78);
    localeButton.setInteractive({ useHandCursor: true });
    localeButton.on("pointerover", () => localeButton.setScale(0.8));
    localeButton.on("pointerout", () => localeButton.setScale(0.78));
    localeButton.on("pointerup", () => this.runTapAction(() => this.toggleOverlay(SCENE_KEYS.LocaleOverlay)));

    const supportButton = this.add.image(this.fromEditorX(666), 110, "Button_Support").setScale(0.78);
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
    this.add.image(540, 286, "Title_01").setScale(0.86);
    this.add.image(540, 454 + stepSectionOffsetY, "GameTutorial").setScale(0.86);

    const stepTextY = 502 + stepSectionOffsetY;
    const textPositions = [this.fromEditorX(160), this.fromEditorX(375), this.fromEditorX(590)];
    const steps = [
      `${copy.depositTitle}\n${copy.depositCopy}`,
      `${copy.spinTitle}\n${copy.spinCopy}`,
      `${copy.rankTitle}\n${copy.rankCopy}`,
    ];

    textPositions.forEach((x, index) => {
      this.add
        .text(x, stepTextY, steps[index], {
          fontFamily: FONTS.body,
          fontSize: "24px",
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
    const itemWidth = 320;
    const itemHeight = 56;
    const marqueeCount = 5;
    const laneSpacing = 240;
    const initialX = -260;

    this.marqueeCards = Array.from({ length: marqueeCount }, (_, index) => {
      const y = this.getRandomMarqueeY();
      const pill = addPill(
        this,
        initialX + index * laneSpacing,
        y,
        itemWidth,
        itemHeight,
        "",
        0xe9f7ff,
        "#0a2942",
      );

      pill.text.setFontSize("20px");
      pill.text.setWordWrapWidth(276, true);
      pill.text.setLineSpacing(-6);
      pill.container.setAlpha(Phaser.Math.FloatBetween(0.88, 0.98));
      pill.container.setScale(Phaser.Math.FloatBetween(0.94, 1.02));

      const card = {
        container: pill.container,
        text: pill.text,
        width: itemWidth,
        speed: Phaser.Math.FloatBetween(0.06, 0.1),
      };

      this.assignMarqueeMessage(card);
      return card;
    });

    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateMarquee, this);
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
    this.createActionButton(540, 1808, 240, 88, prototypeState.t("lobby.history"), () => {
      this.toggleOverlay(SCENE_KEYS.HistoryOverlay);
    });

    this.createActionButton(820, 1808, 240, 88, "test_spin", () => {
      (this.scene.get(SCENE_KEYS.Wheel) as WheelScene | undefined)?.runVisualTestSpin();
    });
  }

  private drawInlineLeaderboardSection() {
    this.add.image(this.fromEditorX(379), 2020, "Title_Ranking").setScale(1);
    this.add.image(this.fromEditorX(378), 2144, "Divider").setScale(1);

    this.leaderboardPendingText = this.add
      .text(540, 2144, "", {
        fontFamily: FONTS.body,
        fontSize: "28px",
        color: "#5d7d97",
        align: "center",
        wordWrap: { width: 800, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setVisible(false);

    LEADERBOARD_ROW_YS.forEach((y, index) => {
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

      const plateScale = 0.36;
      const plate = this.add
        .image(this.getLeaderboardPlateX(index + 1, plateScale), y, this.getLeaderboardPlateKey(index + 1))
        .setScale(plateScale);

      const playerText = this.add
        .text(this.fromEditorX(375), y - 4, "-", {
          fontFamily: FONTS.body,
          fontSize: "30px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0.5, 0.5);

      const prizeText = this.add
        .text(this.fromEditorX(112), this.getLeaderboardPrizeTextY(y, index + 1), "", {
          fontFamily: FONTS.body,
          fontSize: "22px",
          fontStyle: "700",
          color: "#5d7d97",
        })
        .setOrigin(0.5, 0.5);

      const scoreText = this.add
        .text(this.fromEditorX(655), y - 4, "-", {
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
      const button = this.add.image(x, 3512, PAGE_BUTTON_KEYS[index]).setScale(1);
      button.setInteractive({ useHandCursor: true });
      button.on("pointerup", () => this.runTapAction(() => {
        this.leaderboardPage = index + 1;
        this.refreshLeaderboardSection();
      }));
      this.pageButtons.push(button);
    });

    this.add.image(this.fromEditorX(374), 3590, "Divider").setScale(1);

    this.myRankSummaryPlate = this.add
      .image(540, 3696, "RankingPlate_Notl")
      .setScale(0.34)
      .setVisible(false);

    this.myRankSummaryText = this.add
      .text(540, 3686, "", {
        fontFamily: FONTS.body,
        fontSize: "26px",
        fontStyle: "700",
        color: "#0a2942",
        align: "center",
        wordWrap: { width: 840, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    this.leaderboardLastSyncedText = this.add
      .text(540, 3796, "", {
        fontFamily: FONTS.body,
        fontSize: "22px",
        color: "#62839b",
      })
      .setOrigin(0.5);
  }

  private drawInlinePrizeSection() {
    this.add.image(this.fromEditorX(378), 3976, "Title_PrizeArea").setScale(1);

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

      this.inlinePrizeRows.push({ rankBadge, rewardZone, prizeLabel, prizeDescription });
    });
  }

  private drawInlineRulesSection() {
    addRoundedPanel(this, 540, 6370, 900, 1060, {
      fillColor: COLORS.white,
      radius: 30,
    });

    this.add
      .text(540, 5798, "《Terms and conditions》", {
        fontFamily: FONTS.display,
        fontSize: "34px",
        fontStyle: "700",
        color: "#18aef5",
      })
      .setOrigin(0.5);

    this.rulesBodyText = this.add
      .text(110, 5865, "", {
        fontFamily: FONTS.body,
        fontSize: "28px",
        color: "#253a4e",
        lineSpacing: 12,
        wordWrap: { width: 860, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);

    const depositButton = this.add.image(540, 6990, "Reminder").setScale(1.08);
    depositButton.setInteractive({ useHandCursor: true });
    depositButton.on("pointerover", () => depositButton.setScale(1.1));
    depositButton.on("pointerout", () => depositButton.setScale(1.08));
    depositButton.on("pointerup", () =>
      this.runTapAction(() => {
        openExternalLink(this.getPlatformLinkUrl(PlatformLinkType.Deposit));
      }),
    );

    this.add
      .text(365, 6990, "GO to Deposit", {
        fontFamily: FONTS.display,
        fontSize: "34px",
        fontStyle: "700",
        color: "#ffffff",
      })
      .setOrigin(0.5);
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
      this.marqueeCards.forEach((card) => {
        if (!card.text.text || card.text.text === "Loading top 30 activity...") {
          this.assignMarqueeMessage(card);
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

      const rowY = this.getLeaderboardRowY(LEADERBOARD_ROW_YS[index], entry.rank);
      const plateScaleX = entry.isSelf ? 0.39 : 0.36;
      row.highlightArrow.setY(rowY - LEADERBOARD_ROW_YS[index]);
      row.plate.setTexture(this.getLeaderboardPlateKey(entry.rank));
      row.plate.setY(rowY);
      row.plate.setScale(plateScaleX, 0.36);
      row.plate.setX(this.getLeaderboardPlateX(entry.rank, plateScaleX));
      row.playerText.setY(rowY - 4);
      row.scoreText.setY(rowY - 4);
      row.prizeText.setY(this.getLeaderboardPrizeTextY(rowY, entry.rank));
      row.playerText.setText(entry.playerName);
      row.scoreText.setText(formatNumber(entry.score, snapshot.locale));
      row.prizeText.setText(entry.prizeName ?? `Rank #${entry.rank}`);
      row.playerText.setColor(entry.isSelf ? "#0896d8" : "#0a2942");
    });

    this.pageButtons.forEach((button, index) => {
      button.setAlpha(index + 1 === this.leaderboardPage ? 1 : 0.58);
    });

    const myRank = snapshot.leaderboard?.myRank;
    const showNotListedPlate = Boolean(myRank && myRank.rank > 30);
    this.myRankSummaryPlate?.setVisible(showNotListedPlate);

    if (myRank) {
      if (showNotListedPlate) {
        this.myRankSummaryText
          ?.setPosition(620, 3696)
          .setFontSize("24px")
          .setWordWrapWidth(560, true)
          .setAlign("center")
          .setText(
            `#${myRank.rank} | ${myRank.playerName} | ${formatNumber(myRank.score, snapshot.locale)} pts`,
          );
      } else {
        this.myRankSummaryText
          ?.setPosition(540, 3686)
          .setFontSize("26px")
          .setWordWrapWidth(840, true)
          .setAlign("center")
          .setText(
            `My Rank #${myRank.rank}  |  ${myRank.playerName}  |  ${formatNumber(myRank.score, snapshot.locale)} pts`,
          );
      }
    } else {
      this.myRankSummaryText
        ?.setPosition(540, 3686)
        .setFontSize("26px")
        .setWordWrapWidth(840, true)
        .setAlign("center")
        .setText(snapshot.isBootstrapping ? "Loading leaderboard..." : "");
    }

    this.leaderboardLastSyncedText?.setText(
      snapshot.leaderboard?.lastSyncedAt
        ? `Last synced: ${new Date(snapshot.leaderboard.lastSyncedAt).toLocaleString()}`
        : "",
    );
  }

  private refreshPrizeSection() {
    const prizes = prototypeState.getSnapshot().prizes;
    this.inlinePrizeRows.forEach((row, index) => {
      const prize = prizes[index];
      const visible = Boolean(prize);
      row.rankBadge.setVisible(visible);
      row.rewardZone.setVisible(visible);
      row.prizeLabel.setVisible(visible);
      row.prizeDescription.setVisible(visible);

      if (!prize) {
        return;
      }

      row.prizeLabel.setText(prize.prizeLabel);
      row.prizeDescription.setText(
        prize.prizeDescription || prize.accentLabel || prototypeState.t("prize.defaultAccent"),
      );
    });
  }

  private updateMarquee(_time: number, delta: number) {
    this.applyScrollMomentum(delta);

    if (this.marqueeCards.length === 0 || !this.marqueeSection?.visible) {
      return;
    }

    this.marqueeCards.forEach((card) => {
      card.container.x += delta * card.speed;
    });

    this.marqueeCards.forEach((card) => {
      if (card.container.x - card.width / 2 <= STAGE_WIDTH + 20) {
        return;
      }

      const leftmostX = Math.min(...this.marqueeCards.map((entry) => entry.container.x));
      card.container.x = leftmostX - (card.width + Phaser.Math.Between(80, 150));
      card.container.y = this.getRandomMarqueeY();
      card.speed = Phaser.Math.FloatBetween(0.06, 0.1);
      card.container.setAlpha(Phaser.Math.FloatBetween(0.88, 0.98));
      card.container.setScale(Phaser.Math.FloatBetween(0.94, 1.02));
      this.assignMarqueeMessage(card);
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

  private assignMarqueeMessage(card: MarqueeCard) {
    const snapshot = prototypeState.getSnapshot();
    const entries = snapshot.leaderboard?.leaderboard ?? [];

    if (entries.length === 0) {
      card.text.setText("Loading top 30 activity...");
      return;
    }

    const entry = entries[Math.floor(Math.random() * Math.min(entries.length, 30))];
    const playerId = this.formatMarqueePlayerId(entry.playerName);
    const points = this.getRandomMarqueePoints();

    card.text.setText(`ID ${playerId} earned ${formatNumber(points, snapshot.locale)} points`);
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

  private getRandomMarqueeY() {
    const lanes = [672, 698, 724];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    return lane + Phaser.Math.Between(-4, 4);
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
    const baseX = this.fromEditorX(370);
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
    return baseRowY + (targetVisualCenterOffset - visualCenterOffset) * 0.36;
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
