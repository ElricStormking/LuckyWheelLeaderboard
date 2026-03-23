import Phaser from "phaser";
import {
  EligibilityStatus,
  type SpinSuccessResponse,
  type WheelSegmentDto,
} from "@lucky-wheel/contracts";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";
import { addTextButton, openExternalLink } from "../helpers";
import { prototypeState } from "../state/prototype-state";

export class WheelScene extends Phaser.Scene {
  private wheelRoot?: Phaser.GameObjects.Container;
  private wheelRotation = 0;
  private button?: ReturnType<typeof addTextButton>;
  private testSpinButton?: ReturnType<typeof addTextButton>;
  private currentEligibility?: EligibilityStatus;
  private spinning = false;
  private highlightedSegmentIndex?: number;
  private highlightGraphic?: Phaser.GameObjects.Graphics;
  private highlightTween?: Phaser.Tweens.Tween;
  private celebrationTimer?: Phaser.Time.TimerEvent;
  private celebrationBursts: Phaser.Time.TimerEvent[] = [];
  private cleanup: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.Wheel);
  }

  create() {
    this.wheelRoot = this.add.container(540, 1120);
    this.drawWheel([]);
    this.button = addTextButton(
      this,
      540,
      1120,
      260,
      260,
      "SPIN NOW",
      () => {
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
      },
      { shape: "circle" },
    );

    this.button.label.setFontSize("34px");
    this.button.label.setWordWrapWidth(180, true);
    this.button.label.setAlign("center");

    this.testSpinButton = addTextButton(
      this,
      192,
      786,
      196,
      64,
      "Test_Spins",
      () => {
        this.runVisualTestSpin();
      },
      {
        backgroundColor: 0xe9f7ff,
        labelColor: "#0a2942",
        radius: 28,
      },
    );
    this.testSpinButton.label.setFontSize("22px");
    this.testSpinButton.label.setWordWrapWidth(150, true);
    this.testSpinButton.label.setAlign("center");

    this.drawPointer();
    this.applyState();

    this.cleanup.push(
      prototypeState.subscribe("change", () => this.applyState()),
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

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.highlightTween?.stop();
      this.highlightGraphic?.destroy();
      this.celebrationTimer?.remove(false);
      this.clearCelebrationBursts();
      this.cleanup.forEach((cleanup) => cleanup());
      this.cleanup = [];
    });
  }

  private applyState() {
    const snapshot = prototypeState.getSnapshot();
    const canTestSpin = !this.spinning && Boolean(snapshot.currentEvent?.wheelSegments.length);
    if (this.testSpinButton) {
      this.testSpinButton.setEnabled(canTestSpin);
      this.testSpinButton.setBackground(canTestSpin ? 0xe9f7ff : COLORS.disabled);
      this.testSpinButton.label.setColor("#0a2942");
    }

    if (!snapshot.currentEvent || !snapshot.eligibility || !this.wheelRoot || !this.button) {
      return;
    }

    this.currentEligibility = snapshot.eligibility.eligibilityStatus;
    this.drawWheel(snapshot.currentEvent.wheelSegments);

    this.button.setLabel(snapshot.eligibility.buttonLabel);
    this.button.setBackground(
      this.currentEligibility === EligibilityStatus.GoToDeposit
        ? COLORS.accent
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
      this.currentEligibility === EligibilityStatus.GoToDeposit ? "#0a2942" : "#ffffff",
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

  private runVisualTestSpin() {
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
    this.applyState();
    this.launchCelebrationFireworks();

    this.celebrationTimer?.remove(false);
    this.celebrationTimer = this.time.delayedCall(4000, () => {
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

    this.wheelRoot.removeAll(true);

    const wheelBackdrop = this.add.circle(0, 0, 310, 0xf0faff, 0.96);
    wheelBackdrop.setStrokeStyle(18, 0x9ee0ff, 0.92);
    this.wheelRoot.add(wheelBackdrop);

    if (segments.length === 0) {
      return;
    }

    const navySegmentColor = 0x179fe8;
    const cyanSegmentColor = 0xaeefff;
    const segmentColors = [
      navySegmentColor,
      cyanSegmentColor,
      navySegmentColor,
      cyanSegmentColor,
      navySegmentColor,
      cyanSegmentColor,
    ];

    segments.forEach((segment, index) => {
      const graphics = this.add.graphics();
      const startAngle = Phaser.Math.DegToRad(-120 + index * 60);
      const endAngle = Phaser.Math.DegToRad(-60 + index * 60);
      const isLightSegment = index % 2 === 1;
      const fillColor =
        this.currentEligibility === EligibilityStatus.EventEnded ? 0xbdd3df : segmentColors[index];
      const labelColor = isLightSegment ? "#0a2942" : "#ffffff";
      const metaColor = isLightSegment ? "#214d6b" : "#eafaff";

      graphics.fillStyle(fillColor, 1);
      graphics.slice(0, 0, 280, startAngle, endAngle, false);
      graphics.fillPath();
      graphics.lineStyle(4, 0xf0fbff, 1);
      graphics.slice(0, 0, 280, startAngle, endAngle, false);
      graphics.strokePath();

      const centerAngle = Phaser.Math.DegToRad(-90 + index * 60);
      const labelRadius = 198;
      const labelContainer = this.add.container(
        Math.cos(centerAngle) * labelRadius,
        Math.sin(centerAngle) * labelRadius,
      );

      const label = this.add
        .text(0, -20, segment.label, {
          fontFamily: FONTS.display,
          fontSize: "54px",
          fontStyle: "700",
          color: labelColor,
        })
        .setOrigin(0.5);

      const unit = this.add
        .text(0, 24, "points", {
          fontFamily: FONTS.body,
          fontSize: "18px",
          fontStyle: "700",
          color: labelColor,
        })
        .setOrigin(0.5)
        .setAlpha(isLightSegment ? 0.92 : 0.88);

      labelContainer.add([label, unit]);
      labelContainer.setRotation(centerAngle + Math.PI / 2);

      const meta = this.add
        .text(
          Math.cos(centerAngle) * 110,
          Math.sin(centerAngle) * 110,
          `${segment.weightPercent}%`,
          {
            fontFamily: FONTS.body,
            fontSize: "22px",
            color: metaColor,
          },
        )
        .setOrigin(0.5)
        .setAlpha(isLightSegment ? 0.9 : 0.82)
        .setRotation(centerAngle + Math.PI / 2);

      this.wheelRoot?.add([graphics, labelContainer, meta]);
    });

    const centerRing = this.add.circle(0, 0, 114, 0xf8fdff, 1);
    centerRing.setStrokeStyle(12, 0xffffff, 0.6);
    this.wheelRoot.add(centerRing);

    if (this.highlightedSegmentIndex !== undefined) {
      this.attachWinningSegmentPulse(this.highlightedSegmentIndex);
    }
  }

  private attachWinningSegmentPulse(segmentIndex: number) {
    if (!this.wheelRoot) {
      return;
    }

    this.highlightTween?.stop();
    this.highlightGraphic?.destroy();

    const startAngle = Phaser.Math.DegToRad(-120 + segmentIndex * 60);
    const endAngle = Phaser.Math.DegToRad(-60 + segmentIndex * 60);
    const highlight = this.add.graphics();
    highlight.fillStyle(0xffffff, 0.18);
    highlight.slice(0, 0, 282, startAngle, endAngle, false);
    highlight.fillPath();
    highlight.lineStyle(8, 0xfff7c2, 0.95);
    highlight.slice(0, 0, 286, startAngle, endAngle, false);
    highlight.strokePath();
    highlight.setBlendMode(Phaser.BlendModes.ADD);

    this.wheelRoot.add(highlight);
    this.highlightGraphic = highlight;

    this.highlightTween = this.tweens.add({
      targets: highlight,
      alpha: 0.18,
      duration: 240,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: 7,
    });
  }

  private launchCelebrationFireworks() {
    this.clearCelebrationBursts();

    const burstCount = 34;
    for (let index = 0; index < burstCount; index += 1) {
      const timer = this.time.delayedCall(index * 110, () => {
        const point = this.getRandomFireworkPoint();
        this.createFireworkBurst(point.x, point.y, Phaser.Math.FloatBetween(0.9, 1.15));

        if (Math.random() < 0.62) {
          const echo = this.getNearbyFireworkPoint(point);
          this.createFireworkBurst(echo.x, echo.y, Phaser.Math.FloatBetween(0.58, 0.9));
        }

        if (Math.random() < 0.28) {
          const extra = this.getRandomFireworkPoint();
          this.createFireworkBurst(extra.x, extra.y, Phaser.Math.FloatBetween(0.7, 1));
        }
      });

      this.celebrationBursts.push(timer);
    }
  }

  private clearCelebrationBursts() {
    this.celebrationBursts.forEach((timer) => timer.remove(false));
    this.celebrationBursts = [];
  }

  private getRandomFireworkPoint() {
    const centerX = 540;
    const centerY = 1120;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(250, 520);
    const x = Phaser.Math.Clamp(
      centerX + Math.cos(angle) * radius + Phaser.Math.Between(-40, 40),
      90,
      990,
    );
    const y = Phaser.Math.Clamp(
      centerY + Math.sin(angle) * radius + Phaser.Math.Between(-35, 35),
      700,
      1545,
    );

    return { x, y };
  }

  private getNearbyFireworkPoint(origin: { x: number; y: number }) {
    return {
      x: Phaser.Math.Clamp(origin.x + Phaser.Math.Between(-110, 110), 90, 990),
      y: Phaser.Math.Clamp(origin.y + Phaser.Math.Between(-95, 95), 700, 1545),
    };
  }

  private createFireworkBurst(x: number, y: number, scale = 1) {
    const colors = [
      0xff4d6d,
      0xff7b00,
      0xffd60a,
      0x9ef01a,
      0x2dd4bf,
      0x14b8ff,
      0x7c4dff,
      0xff66c4,
    ];

    const flash = this.add
      .circle(x, y, 22 * scale, 0xffffff, 0.48)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      scale: 5.6,
      alpha: 0,
      duration: 420,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });

    const ring = this.add.circle(x, y, 30 * scale);
    ring.setStrokeStyle(8 * scale, colors[Phaser.Math.Between(0, colors.length - 1)], 0.9);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: ring,
      scale: 4.6,
      alpha: 0,
      duration: 920,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    const cloud = this.add.container(x, y).setBlendMode(Phaser.BlendModes.ADD);
    Array.from({ length: 6 }).forEach((_, index) => {
      const puff = this.add.circle(
        Phaser.Math.Between(-34, 34) * scale,
        Phaser.Math.Between(-30, 30) * scale,
        Phaser.Math.Between(12, 24) * scale,
        colors[(index + Phaser.Math.Between(0, colors.length - 1)) % colors.length],
        0.34,
      );
      cloud.add(puff);
    });
    this.tweens.add({
      targets: cloud,
      scale: 1.9,
      alpha: 0,
      duration: 760,
      ease: "Cubic.easeOut",
      onComplete: () => cloud.destroy(),
    });

    const spokes = this.add.graphics({ x, y }).setBlendMode(Phaser.BlendModes.ADD);
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12 + Phaser.Math.FloatBetween(-0.08, 0.08);
      const inner = 18 * scale;
      const outer = Phaser.Math.Between(90, 160) * scale;
      spokes.lineStyle(7 * scale, colors[index % colors.length], 0.95);
      spokes.beginPath();
      spokes.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      spokes.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      spokes.strokePath();
    }
    this.tweens.add({
      targets: spokes,
      scale: 1.28,
      alpha: 0,
      angle: Phaser.Math.Between(-25, 25),
      duration: 860,
      ease: "Quart.easeOut",
      onComplete: () => spokes.destroy(),
    });

    const particleCount = Phaser.Math.Between(22, 30);
    for (let index = 0; index < particleCount; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(150, 260) * scale;
      const size = Phaser.Math.Between(6, 14) * scale;
      const particle = this.add
        .circle(
          x,
          y,
          size,
          colors[index % colors.length],
          Phaser.Math.FloatBetween(0.78, 1),
        )
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + Phaser.Math.Between(-24, 34) * scale,
        scale: 0.12,
        alpha: 0,
        duration: Phaser.Math.Between(1200, 1850),
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private drawPointer() {
    const pointer = this.add.graphics();
    pointer.fillStyle(COLORS.danger, 1);
    pointer.fillTriangle(540, 830, 508, 760, 572, 760);
    pointer.lineStyle(4, COLORS.accentSoft, 0.95);
    pointer.strokeTriangle(540, 830, 508, 760, 572, 760);
  }
}
