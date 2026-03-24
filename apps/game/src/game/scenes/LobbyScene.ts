import Phaser from "phaser";
import { type EligibilityStatus, PlatformLinkType } from "@lucky-wheel/contracts";
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
  formatNumber,
  openExternalLink,
} from "../helpers";

type MarqueeCard = {
  container: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  width: number;
  speed: number;
};

type BottomMenuAction = {
  label: string;
  onClick: () => void;
};

const HERO_TITLE = "IBET LUCKY WHEEL";
const HERO_SUBTITLE = "Spin Daily & Climb The Leaderboard For Cash Rewards!";

export class LobbyScene extends Phaser.Scene {
  private cleanup: Array<() => void> = [];
  private titleText?: Phaser.GameObjects.Text;
  private subtitleText?: Phaser.GameObjects.Text;
  private periodPanel?: Phaser.GameObjects.Container;
  private periodPill?: Phaser.GameObjects.Text;
  private totalPointsText?: Phaser.GameObjects.Text;
  private eligibilityText?: Phaser.GameObjects.Text;
  private devControls: Array<{
    container: Phaser.GameObjects.Container;
    label: Phaser.GameObjects.Text;
    value?: EligibilityStatus;
  }> = [];
  private marqueeCards: MarqueeCard[] = [];
  private bottomMenuActions: BottomMenuAction[] = [];
  private bottomMenuIndex = 0;
  private bottomMenuLabel?: Phaser.GameObjects.Text;

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

    const supportBubble = drawCircleIcon(this, 980, 110, "icon-menu");
    supportBubble.setSize(84, 84);
    supportBubble.setInteractive(
      new Phaser.Geom.Circle(0, 0, 42),
      Phaser.Geom.Circle.Contains,
    );
    supportBubble.on("pointerup", () => {
      openExternalLink(this.getPlatformLinkUrl(PlatformLinkType.CustomerService));
    });
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
      .text(540, 250, HERO_TITLE, {
        fontFamily: FONTS.display,
        fontSize: "86px",
        fontStyle: "700",
        color: "#63d5ff",
      })
      .setOrigin(0.5);

    this.subtitleText = this.add
      .text(540, 322, HERO_SUBTITLE, {
        fontFamily: FONTS.body,
        fontSize: "30px",
        fontStyle: "700",
        color: "#1697dd",
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
        color: "#9a9fa6",
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
      const badgeGlow = this.add.circle(0, 2, 40, 0xa7e6ff, 0.22);
      const badgeShadow = this.add.circle(2, 10, 34, 0x5f9bc7, 0.18);
      const badgeIcon = this.add.image(0, 0, step.icon).setScale(0.84);
      badge.add([badgeGlow, badgeShadow, badgeIcon]);

      this.add
        .text(centerX, top + 98, `${step.title}\n${step.copy}`, {
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
    addRoundedPanel(this, 540, 1630, 634, 120, {
      fillColor: COLORS.panel,
      radius: 18,
    });

    this.add
      .text(258, 1630, `${prototypeState.t("lobby.myTotalPoints")}:`, {
        fontFamily: FONTS.body,
        fontSize: "52px",
        fontStyle: "700",
        color: "#15a8ee",
      })
      .setOrigin(0, 0.5);

    this.totalPointsText = this.add
      .text(822, 1628, "0", {
        fontFamily: FONTS.display,
        fontSize: "56px",
        fontStyle: "700",
        color: "#10a7eb",
      })
      .setOrigin(1, 0.5);
  }

  private drawBottomButtons() {
    this.bottomMenuActions = [
      {
        label: prototypeState.t("lobby.history"),
        onClick: () => this.toggleOverlay(SCENE_KEYS.HistoryOverlay),
      },
      {
        label: prototypeState.t("lobby.leaderboard"),
        onClick: () => this.toggleOverlay(SCENE_KEYS.LeaderboardOverlay),
      },
      {
        label: prototypeState.t("lobby.prizes"),
        onClick: () => this.toggleOverlay(SCENE_KEYS.PrizeOverlay),
      },
      {
        label: prototypeState.t("lobby.rules"),
        onClick: () => this.toggleOverlay(SCENE_KEYS.RulesOverlay),
      },
    ];
    this.bottomMenuIndex = 0;

    addTextButton(
      this,
      220,
      1768,
      250,
      92,
      prototypeState.t("lobby.deposit"),
      () => {
        openExternalLink(this.getPlatformLinkUrl(PlatformLinkType.Deposit));
      },
      {
        backgroundColor: COLORS.primary,
        labelColor: "#ffffff",
      },
    );

    const bottomMenu = this.add.container(540, 1768);
    const hitArea = this.add.rectangle(0, 0, 430, 102, 0xffffff, 0.001);
    const arrowShadow = this.add.circle(148, 6, 36, 0x041a2c, 0.22);
    const arrowBubble = this.add.circle(140, 0, 34, COLORS.white, 0.98);
    arrowBubble.setStrokeStyle(2, COLORS.line, 0.7);

    this.bottomMenuLabel = this.add
      .text(-8, 0, this.bottomMenuActions[0].label, {
        fontFamily: FONTS.display,
        fontSize: "42px",
        fontStyle: "700",
        color: "#18aef5",
      })
      .setOrigin(0.5);

    const arrowLabel = this.add
      .text(140, 0, "›", {
        fontFamily: FONTS.display,
        fontSize: "58px",
        fontStyle: "700",
        color: "#18aef5",
      })
      .setOrigin(0.5, 0.54);

    bottomMenu.add([hitArea, this.bottomMenuLabel, arrowShadow, arrowBubble, arrowLabel]);
    bottomMenu.setSize(430, 102);
    bottomMenu.setInteractive(
      new Phaser.Geom.Rectangle(-215, -51, 430, 102),
      Phaser.Geom.Rectangle.Contains,
    );
    bottomMenu.on("pointerover", () => bottomMenu.setScale(1.03));
    bottomMenu.on("pointerout", () => bottomMenu.setScale(1));
    bottomMenu.on("pointerup", () => this.openNextBottomMenu());
  }

  private openNextBottomMenu() {
    if (this.bottomMenuActions.length === 0) {
      return;
    }

    const currentAction = this.bottomMenuActions[this.bottomMenuIndex];
    this.bottomMenuIndex = (this.bottomMenuIndex + 1) % this.bottomMenuActions.length;
    this.bottomMenuLabel?.setText(this.bottomMenuActions[this.bottomMenuIndex].label);
    currentAction.onClick();
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
    this.titleText?.setText(HERO_TITLE);
    this.subtitleText?.setText(HERO_SUBTITLE);
    this.totalPointsText?.setText(
      formatNumber(snapshot.player?.totalScore ?? 0, snapshot.locale),
    );
    this.eligibilityText?.setText(
      snapshot.currentEvent?.promotionPeriodLabel
        ? `Promotion Period: ${snapshot.currentEvent.promotionPeriodLabel}`
        : snapshot.isBootstrapping
          ? prototypeState.t("lobby.loadingPayload")
          : prototypeState.t("lobby.loadingLiveEvent"),
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
