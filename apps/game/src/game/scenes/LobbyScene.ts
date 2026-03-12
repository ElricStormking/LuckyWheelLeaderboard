import Phaser from "phaser";
import { EventStatus, type EligibilityStatus, PlatformLinkType } from "@lucky-wheel/contracts";
import { prototypeState } from "../state/prototype-state";
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
  addRoundedPanel,
  addTextButton,
  createSectionTitle,
  drawCircleIcon,
  formatTime,
  formatNumber,
  openExternalLink,
} from "../helpers";

export class LobbyScene extends Phaser.Scene {
  private cleanup: Array<() => void> = [];
  private titleText?: Phaser.GameObjects.Text;
  private subtitleText?: Phaser.GameObjects.Text;
  private periodPanel?: Phaser.GameObjects.Container;
  private periodPill?: Phaser.GameObjects.Text;
  private totalPointsText?: Phaser.GameObjects.Text;
  private eligibilityText?: Phaser.GameObjects.Text;
  private myRankText?: Phaser.GameObjects.Text;
  private syncText?: Phaser.GameObjects.Text;
  private devControls: Array<{
    container: Phaser.GameObjects.Container;
    label: Phaser.GameObjects.Text;
    value?: EligibilityStatus;
  }> = [];

  constructor() {
    super(SCENE_KEYS.Lobby);
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.pageTop);
    this.drawBackground();
    this.drawHeader();
    this.drawHero();
    this.drawActionRow();
    this.drawSummaryArea();
    this.drawBottomButtons();
    this.drawDevPanel();
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
      this.cleanup.forEach((cleanup) => cleanup());
      this.cleanup = [];
    });

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
    gradient.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    gradient.fillStyle(COLORS.stageMist, 0.08);
    gradient.fillCircle(220, 260, 240);
    gradient.fillCircle(860, 1500, 320);
    gradient.fillCircle(920, 320, 150);
  }

  private drawHeader() {
    const snapshot = prototypeState.getSnapshot();
    this.add.circle(108, 110, 64, COLORS.primary, 1);
    this.add
      .text(108, 110, "iBET", {
        fontFamily: FONTS.display,
        fontSize: "28px",
        fontStyle: "700",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.periodPanel = addRoundedPanel(this, 510, 110, 488, 82, {
      fillColor: COLORS.panel,
      radius: 41,
    });
    this.periodPanel.setSize(488, 82);
    this.periodPanel.setInteractive(
      new Phaser.Geom.Rectangle(-244, -41, 488, 82),
      Phaser.Geom.Rectangle.Contains,
    );
    this.periodPanel.on("pointerover", () => this.periodPanel?.setScale(1.01));
    this.periodPanel.on("pointerout", () => this.periodPanel?.setScale(1));
    this.periodPanel.on("pointerup", () => this.toggleOverlay(SCENE_KEYS.PeriodOverlay));

    this.add
      .text(298, 92, prototypeState.t("lobby.selectPeriod"), {
        fontFamily: FONTS.body,
        fontSize: "16px",
        fontStyle: "700",
        color: "#5f8098",
      })
      .setOrigin(0, 0.5);

    this.periodPill = this.add
      .text(510, 120, prototypeState.t("lobby.loadingLiveEvent"), {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "700",
        color: "#415f77",
      })
      .setOrigin(0.5);

    const localeBubble = drawCircleIcon(this, 874, 110, "icon-globe");
    localeBubble.setSize(84, 84);
    localeBubble.setInteractive(
      new Phaser.Geom.Circle(0, 0, 42),
      Phaser.Geom.Circle.Contains,
    );
    localeBubble.on("pointerup", () => this.toggleOverlay(SCENE_KEYS.LocaleOverlay));

    drawCircleIcon(this, 980, 110, "icon-menu");

    this.add
      .text(874, 158, snapshot.locale.toUpperCase(), {
        fontFamily: FONTS.body,
        fontSize: "14px",
        fontStyle: "700",
        color: "#dff7ff",
      })
      .setOrigin(0.5);
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

    this.titleText = this.add
      .text(540, 250, prototypeState.t("lobby.heroFallbackTitle"), {
        fontFamily: FONTS.display,
        fontSize: "86px",
        fontStyle: "700",
        color: "#63d5ff",
      })
      .setOrigin(0.5);

    this.subtitleText = this.add
      .text(540, 322, prototypeState.t("lobby.heroFallbackSubtitle"), {
        fontFamily: FONTS.body,
        fontSize: "30px",
        fontStyle: "700",
        color: "#d7f6ff",
      })
      .setOrigin(0.5);

    const steps = [
      {
        x: 250,
        icon: "icon-deposit",
        title: copy.depositTitle,
        copy: copy.depositCopy,
      },
      {
        x: 540,
        icon: "icon-spin",
        title: copy.spinTitle,
        copy: copy.spinCopy,
      },
      {
        x: 830,
        icon: "icon-rank",
        title: copy.rankTitle,
        copy: copy.rankCopy,
      },
    ];

    steps.forEach((step) => {
      drawCircleIcon(this, step.x, 398, step.icon, 0xeef9ff);
      addRoundedPanel(this, step.x, 450, 250, 174, {
        fillColor: COLORS.panel,
        radius: 30,
      });

      this.add
        .text(step.x, 460, step.title, {
          fontFamily: FONTS.display,
          fontSize: "32px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0.5);

      this.add
        .text(step.x, 504, step.copy, {
          fontFamily: FONTS.body,
          fontSize: "18px",
          color: "#5f7e97",
          align: "center",
          wordWrap: { width: 190, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
    });

    createSectionTitle(this, 540, 595, prototypeState.t("lobby.phaseSlice"));
    this.eligibilityText = this.add
      .text(540, 648, prototypeState.t("lobby.checkingEligibility"), {
        fontFamily: FONTS.body,
        fontSize: "26px",
        color: "#d7f4ff",
        align: "center",
        wordWrap: { width: 820, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
  }

  private drawActionRow() {
    const rowY = 732;
    const chips = [
      prototypeState.t("lobby.chipTop30"),
      prototypeState.t("lobby.chipWheel"),
      prototypeState.t("lobby.chipPlaceholder"),
    ];

    chips.forEach((chip, index) => {
      const pill = addPill(
        this,
        252 + index * 290,
        rowY,
        260,
        56,
        chip,
        0xe9f7ff,
        "#0a2942",
      );
      pill.text.setFontSize("18px");
      pill.text.setWordWrapWidth(230, true);
    });
  }

  private drawSummaryArea() {
    addRoundedPanel(this, 540, 1534, 908, 156, {
      fillColor: COLORS.panel,
      radius: 36,
    });

    this.add
      .text(122, 1500, prototypeState.t("lobby.myTotalPoints"), {
        fontFamily: FONTS.body,
        fontSize: "30px",
        fontStyle: "700",
        color: "#60809a",
      })
      .setOrigin(0, 0.5);

    this.totalPointsText = this.add
      .text(928, 1498, "0", {
        fontFamily: FONTS.display,
        fontSize: "72px",
        fontStyle: "700",
        color: "#10a7eb",
      })
      .setOrigin(1, 0.5);

    this.myRankText = this.add
      .text(122, 1552, prototypeState.t("lobby.rankEmpty"), {
        fontFamily: FONTS.body,
        fontSize: "24px",
        color: "#6787a0",
      })
      .setOrigin(0, 0.5);

    this.syncText = this.add
      .text(928, 1552, "Last sync -", {
        fontFamily: FONTS.body,
        fontSize: "24px",
        color: "#6787a0",
      })
      .setOrigin(1, 0.5);
  }

  private drawBottomButtons() {
    addTextButton(this, 250, 1668, 290, 92, prototypeState.t("lobby.leaderboard"), () => {
      this.toggleOverlay(SCENE_KEYS.LeaderboardOverlay);
    });

    addTextButton(
      this,
      540,
      1668,
      220,
      92,
      prototypeState.t("lobby.prizes"),
      () => this.toggleOverlay(SCENE_KEYS.PrizeOverlay),
      {
        backgroundColor: COLORS.primaryDark,
      },
    );

    addTextButton(
      this,
      830,
      1668,
      220,
      92,
      prototypeState.t("lobby.rules"),
      () => this.toggleOverlay(SCENE_KEYS.RulesOverlay),
      {
        backgroundColor: COLORS.primaryDark,
      },
    );

    addTextButton(
      this,
      300,
      1790,
      320,
      92,
      prototypeState.t("lobby.history"),
      () => this.toggleOverlay(SCENE_KEYS.HistoryOverlay),
      {
        backgroundColor: 0xeef9ff,
        labelColor: "#0a2942",
      },
    );

    addTextButton(
      this,
      624,
      1790,
      250,
      92,
      prototypeState.t("lobby.deposit"),
      () => {
        const depositUrl = prototypeState
          .getSnapshot()
          .currentEvent?.platformLinks.find(
            (link) => link.type === PlatformLinkType.Deposit,
          )?.url;
        openExternalLink(depositUrl);
      },
      {
        backgroundColor: COLORS.accent,
        labelColor: "#0a2942",
      },
    );

    addTextButton(
      this,
      848,
      1790,
      250,
      92,
      prototypeState.t("lobby.support"),
      () => {
        const supportUrl = prototypeState
          .getSnapshot()
          .currentEvent?.platformLinks.find(
            (link) => link.type === PlatformLinkType.CustomerService,
          )?.url;
        openExternalLink(supportUrl);
      },
      {
        backgroundColor: 0xeef9ff,
        labelColor: "#0a2942",
      },
    );
  }

  private drawDevPanel() {
    if (!shouldShowDevEligibilitySwitch()) {
      return;
    }

    this.add
      .text(540, 1858, prototypeState.t("lobby.devSwitch"), {
        fontFamily: FONTS.body,
        fontSize: "20px",
        fontStyle: "700",
        color: "#d7f4ff",
      })
      .setOrigin(0.5);

    DEV_ELIGIBILITY_OPTIONS.forEach((option, index) => {
      const x = 126 + index * 206;
      const pill = addRoundedPanel(this, x, 1898, 184, 44, {
        fillColor: 0xeef9ff,
        radius: 22,
      });
      pill.setSize(184, 44);
      pill.setInteractive(
        new Phaser.Geom.Rectangle(-92, -22, 184, 44),
        Phaser.Geom.Rectangle.Contains,
      );
      pill.on("pointerup", () => {
        void prototypeState.setEligibilityOverride(option.value as EligibilityStatus | undefined);
      });

      const label = this.add
        .text(x, 1898, option.label, {
          fontFamily: FONTS.body,
          fontSize: "18px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0.5);

      this.devControls.push({
        container: pill,
        label,
        value: option.value as EligibilityStatus | undefined,
      });
    });
  }

  private refreshDynamicContent() {
    const snapshot = prototypeState.getSnapshot();

    this.periodPill?.setText(
      snapshot.currentEvent?.promotionPeriodLabel ?? prototypeState.t("lobby.loadingLiveEvent"),
    );
    this.titleText?.setText(
      snapshot.currentEvent?.title ?? prototypeState.t("lobby.heroFallbackTitle"),
    );
    this.subtitleText?.setText(
      snapshot.currentEvent?.shortDescription ??
        prototypeState.t("lobby.heroFallbackSubtitle"),
    );
    this.totalPointsText?.setText(
      formatNumber(snapshot.player?.totalScore ?? 0, snapshot.locale),
    );
    this.myRankText?.setText(
      snapshot.player && snapshot.player.resultsVisible && snapshot.player.rank
        ? prototypeState.t("lobby.rankLine", {
            rank: snapshot.player.rank,
            prize: snapshot.player.prizeName ?? prototypeState.t("lobby.noPrizeYet"),
          })
        : prototypeState.t("lobby.rankEmpty"),
    );
    this.syncText?.setText(
      snapshot.currentEvent?.status === EventStatus.Live
        ? `${this.getRealtimeLabel(snapshot.realtimeStatus)}${
            snapshot.leaderboard?.lastSyncedAt
              ? ` - ${formatTime(snapshot.leaderboard.lastSyncedAt, snapshot.locale)}`
              : ""
          }`
        : snapshot.player?.resultsVisible === false
          ? prototypeState.t("lobby.resultsPending")
        : prototypeState.t("lobby.archiveSnapshot"),
    );
    this.eligibilityText?.setText(
      snapshot.player?.resultsVisible === false && snapshot.player.pendingMessage
        ? snapshot.player.pendingMessage
        : snapshot.eligibility
        ? prototypeState.t("lobby.eligibilityLine", {
            buttonLabel: snapshot.eligibility.buttonLabel,
            remaining: snapshot.eligibility.remainingSpinCount,
            granted: snapshot.eligibility.grantedSpinCount,
          })
        : snapshot.isBootstrapping
          ? prototypeState.t("lobby.loadingPayload")
          : prototypeState.t("lobby.checkingEligibility"),
    );

    this.devControls.forEach((control) => {
      const isActive = control.value === snapshot.eligibilityOverride;
      const graphics = control.container.list[0] as Phaser.GameObjects.Graphics;
      graphics.clear();
      graphics.fillStyle(isActive ? COLORS.accent : 0xeef9ff, 1);
      graphics.fillRoundedRect(-92, -22, 184, 44, 22);
      graphics.lineStyle(2, COLORS.line, 0.75);
      graphics.strokeRoundedRect(-92, -22, 184, 44, 22);
      control.label.setColor(isActive ? "#0a2942" : "#0a2942");
    });
  }

  private toggleOverlay(key: string) {
    if (this.scene.isActive(key)) {
      this.scene.stop(key);
      return;
    }

    this.scene.launch(key);
  }

  private getRealtimeLabel(status: "idle" | "connecting" | "connected" | "error") {
    switch (status) {
      case "connected":
        return prototypeState.t("lobby.feed.connected");
      case "connecting":
        return prototypeState.t("lobby.feed.connecting");
      case "error":
        return prototypeState.t("lobby.feed.error");
      case "idle":
      default:
        return prototypeState.t("lobby.feed.idle");
    }
  }
}
