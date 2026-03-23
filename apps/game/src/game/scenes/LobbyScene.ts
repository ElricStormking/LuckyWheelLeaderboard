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
  drawCircleIcon,
  formatTime,
  formatNumber,
  openExternalLink,
} from "../helpers";

type MarqueeCard = {
  container: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  width: number;
  speed: number;
};

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
  private marqueeCards: MarqueeCard[] = [];

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
      this.events.off(Phaser.Scenes.Events.UPDATE, this.updateMarquee, this);
      this.cleanup.forEach((cleanup) => cleanup());
      this.cleanup = [];
      this.marqueeCards = [];
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
    const localeIcon = localeBubble.getAt(1) as Phaser.GameObjects.Image | undefined;
    localeIcon?.setY(-10).setScale(0.62);
    localeBubble.setSize(84, 84);
    localeBubble.setInteractive(
      new Phaser.Geom.Circle(0, 0, 42),
      Phaser.Geom.Circle.Contains,
    );
    localeBubble.on("pointerup", () => this.toggleOverlay(SCENE_KEYS.LocaleOverlay));
    localeBubble.add(
      this.add
        .text(0, 20, snapshot.locale.toUpperCase(), {
          fontFamily: FONTS.body,
          fontSize: "13px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0.5),
    );

    drawCircleIcon(this, 980, 110, "icon-menu");
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
        align: "center",
        wordWrap: { width: 860, useAdvancedWrap: true },
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

    this.drawHeroRibbon(steps);

    this.eligibilityText = this.add
      .text(540, 612, prototypeState.t("lobby.checkingEligibility"), {
        fontFamily: FONTS.body,
        fontSize: "26px",
        color: "#d7f4ff",
        align: "center",
        wordWrap: { width: 820, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
  }

  private drawHeroRibbon(
    steps: Array<{ x: number; icon: string; title: string; copy: string }>,
  ) {
    const ribbonCenterX = 540;
    const ribbonCenterY = 454;
    const ribbonWidth = 846;
    const ribbonHeight = 152;
    const left = ribbonCenterX - ribbonWidth / 2;
    const top = ribbonCenterY - ribbonHeight / 2;
    const segmentWidth = ribbonWidth / 3;
    const dividerInset = 26;

    const ribbonShadow = this.add.graphics();
    ribbonShadow.fillStyle(0x041a2c, 0.22);
    ribbonShadow.fillRoundedRect(left, top + 10, ribbonWidth, ribbonHeight, 38);

    const ribbon = this.add.graphics();
    ribbon.fillStyle(COLORS.panel, 0.98);
    ribbon.fillRoundedRect(left, top, ribbonWidth, ribbonHeight, 38);
    ribbon.lineStyle(3, COLORS.primary, 0.95);
    ribbon.strokeRoundedRect(left, top, ribbonWidth, ribbonHeight, 38);

    steps.forEach((_, index) => {
      const segmentLeft = left + index * segmentWidth;
      ribbon.fillStyle(COLORS.white, index === 1 ? 0.18 : 0.13);
      ribbon.fillRoundedRect(
        segmentLeft + 38,
        top + 10,
        segmentWidth - 76,
        28,
        18,
      );

      if (index < steps.length - 1) {
        const dividerX = segmentLeft + segmentWidth;
        ribbon.fillStyle(COLORS.primary, 0.08);
        ribbon.fillTriangle(
          dividerX - dividerInset,
          top + 10,
          dividerX + dividerInset,
          ribbonCenterY,
          dividerX - dividerInset,
          top + ribbonHeight - 10,
        );

        ribbon.lineStyle(5, COLORS.primary, 0.95);
        ribbon.beginPath();
        ribbon.moveTo(dividerX - dividerInset, top + 10);
        ribbon.lineTo(dividerX + dividerInset, ribbonCenterY);
        ribbon.lineTo(dividerX - dividerInset, top + ribbonHeight - 10);
        ribbon.strokePath();
      }
    });

    steps.forEach((step, index) => {
      const centerX = left + segmentWidth * (index + 0.5);
      const badge = this.add.container(centerX, top + 18);
      const badgeGlow = this.add.circle(0, 0, 44, 0xc3f0ff, 0.26);
      const badgeCircle = this.add.circle(0, 0, 38, COLORS.primary, 1);
      badgeCircle.setStrokeStyle(4, 0xb9efff, 0.98);
      const badgeIcon = this.add.image(0, -2, step.icon).setScale(0.62).setTint(0xffffff);
      badge.add([badgeGlow, badgeCircle, badgeIcon]);

      this.add
        .text(centerX, top + 78, step.title, {
          fontFamily: FONTS.display,
          fontSize: "28px",
          fontStyle: "700",
          color: "#12324a",
          align: "center",
          wordWrap: { width: 210, useAdvancedWrap: true },
        })
        .setOrigin(0.5);

      this.add
        .text(centerX, top + 116, step.copy, {
          fontFamily: FONTS.body,
          fontSize: "18px",
          color: "#5f7e97",
          align: "center",
          wordWrap: { width: 210, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
    });
  }

  private drawActionRow() {
    const itemWidth = 320;
    const itemHeight = 56;
    const marqueeCount = 8;
    const laneSpacing = 190;
    const initialX = -220;

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
        speed: Phaser.Math.FloatBetween(0.08, 0.13),
      };

      this.assignMarqueeMessage(card);
      return card;
    });

    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateMarquee, this);
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
    this.drawCenteredButtonRow(1668, 32, [
      {
        label: prototypeState.t("lobby.leaderboard"),
        width: 290,
        onClick: () => this.toggleOverlay(SCENE_KEYS.LeaderboardOverlay),
      },
      {
        label: prototypeState.t("lobby.prizes"),
        width: 220,
        onClick: () => this.toggleOverlay(SCENE_KEYS.PrizeOverlay),
        options: {
          backgroundColor: COLORS.primaryDark,
        },
      },
      {
        label: prototypeState.t("lobby.rules"),
        width: 220,
        onClick: () => this.toggleOverlay(SCENE_KEYS.RulesOverlay),
        options: {
          backgroundColor: COLORS.primaryDark,
        },
      },
    ]);

    this.drawCenteredButtonRow(1790, 32, [
      {
        label: prototypeState.t("lobby.history"),
        width: 320,
        onClick: () => this.toggleOverlay(SCENE_KEYS.HistoryOverlay),
        options: {
          backgroundColor: 0xeef9ff,
          labelColor: "#0a2942",
        },
      },
      {
        label: prototypeState.t("lobby.deposit"),
        width: 250,
        onClick: () => {
          const depositUrl = prototypeState
            .getSnapshot()
            .currentEvent?.platformLinks.find(
              (link) => link.type === PlatformLinkType.Deposit,
            )?.url;
          openExternalLink(depositUrl);
        },
        options: {
          backgroundColor: COLORS.accent,
          labelColor: "#0a2942",
        },
      },
      {
        label: prototypeState.t("lobby.support"),
        width: 250,
        onClick: () => {
          const supportUrl = prototypeState
            .getSnapshot()
            .currentEvent?.platformLinks.find(
              (link) => link.type === PlatformLinkType.CustomerService,
            )?.url;
          openExternalLink(supportUrl);
        },
        options: {
          backgroundColor: 0xeef9ff,
          labelColor: "#0a2942",
        },
      },
    ]);
  }

  private drawCenteredButtonRow(
    y: number,
    gap: number,
    buttons: Array<{
      label: string;
      width: number;
      onClick: () => void;
      options?: Parameters<typeof addTextButton>[7];
    }>,
  ) {
    const totalWidth =
      buttons.reduce((sum, button) => sum + button.width, 0) + gap * (buttons.length - 1);
    let left = STAGE_WIDTH / 2 - totalWidth / 2;

    buttons.forEach((button) => {
      addTextButton(
        this,
        left + button.width / 2,
        y,
        button.width,
        92,
        button.label,
        button.onClick,
        button.options,
      );
      left += button.width + gap;
    });
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
            used: snapshot.eligibility.usedSpinCount,
            remaining: snapshot.eligibility.remainingSpinCount,
            granted: snapshot.eligibility.grantedSpinCount,
          })
        : snapshot.isBootstrapping
          ? prototypeState.t("lobby.loadingPayload")
          : prototypeState.t("lobby.checkingEligibility"),
    );

    if (snapshot.leaderboard?.leaderboard.length) {
      this.marqueeCards.forEach((card) => {
        if (!card.text.text || card.text.text === "Loading top 30 activity...") {
          this.assignMarqueeMessage(card);
        }
      });
    }

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

  private updateMarquee(_time: number, delta: number) {
    if (this.marqueeCards.length === 0) {
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
      card.speed = Phaser.Math.FloatBetween(0.08, 0.13);
      card.container.setAlpha(Phaser.Math.FloatBetween(0.88, 0.98));
      card.container.setScale(Phaser.Math.FloatBetween(0.94, 1.02));
      this.assignMarqueeMessage(card);
    });
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

    card.text.setText(
      `ID ${playerId} earned ${formatNumber(points, snapshot.locale)} points`,
    );
  }

  private getRandomMarqueePoints() {
    const segmentLabels =
      prototypeState
        .getSnapshot()
        .currentEvent?.wheelSegments.map((segment) =>
          Number(segment.label.replace(/[^\d]/g, "")),
        )
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
