import Phaser from "phaser";
import {
  EligibilityStatus,
  type SpinSuccessResponse,
  type WheelSegmentDto,
} from "@lucky-wheel/contracts";
import { COLORS, FONTS, SCENE_KEYS, shouldShowDevEligibilitySwitch } from "../constants";
import { addTextButton, openExternalLink } from "../helpers";
import { prototypeState } from "../state/prototype-state";

const WHEEL_CENTER_X = 540;
const WHEEL_CENTER_Y = 1180;
const WHEEL_SCALE = 0.85;
const WHEEL_BACKDROP_SCALE = 0.86;
const WHEEL_BACKDROP_SIZE = 972;
const POINTER_SCALE = 0.58;
const POINTER_GAP = 10 * WHEEL_SCALE;
const POINTER_TIP_Y =
  WHEEL_CENTER_Y - (WHEEL_BACKDROP_SIZE * WHEEL_BACKDROP_SCALE * WHEEL_SCALE) / 2 - POINTER_GAP;

export class WheelScene extends Phaser.Scene {
  private wheelRoot?: Phaser.GameObjects.Container;
  private wheelRotation = 0;
  private renderedWheelSignature = "";
  private renderedHighlightIndex?: number;
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
    this.wheelRoot = this.add.container(WHEEL_CENTER_X, WHEEL_CENTER_Y);
    this.wheelRoot.setScale(WHEEL_SCALE);
    this.drawWheel([]);
    this.button = this.createWheelCenterButton();
    this.cameras.main.setScroll(0, Number(this.registry.get("mainScrollY") ?? 0));

    if (shouldShowDevEligibilitySwitch()) {
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
    }

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

    const syncScroll = (
      _parent: Phaser.Data.DataManager,
      key: string,
      value: number,
    ) => {
      if (key === "mainScrollY") {
        this.cameras.main.setScroll(0, value);
      }
    };
    this.registry.events.on("changedata", syncScroll);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.highlightTween?.stop();
      this.highlightGraphic?.destroy();
      this.celebrationTimer?.remove(false);
      this.clearCelebrationBursts();
      this.cleanup.forEach((cleanup) => cleanup());
      this.cleanup = [];
      this.registry.events.off("changedata", syncScroll);
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
    const wheelSignature = this.getWheelSignature(snapshot.currentEvent.wheelSegments);
    if (wheelSignature !== this.renderedWheelSignature) {
      this.drawWheel(snapshot.currentEvent.wheelSegments);
    } else {
      this.syncWinningSegmentHighlight();
    }

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

    this.highlightTween?.stop();
    this.highlightTween = undefined;
    this.highlightGraphic = undefined;
    this.renderedHighlightIndex = undefined;
    this.wheelRoot.removeAll(true);
    const wheelBackdrop = this.add.image(0, 0, "Roulette");
    wheelBackdrop.setScale(WHEEL_BACKDROP_SCALE);
    this.wheelRoot.add(wheelBackdrop);
    this.renderedWheelSignature = this.getWheelSignature(segments);

    if (segments.length === 0) {
      return;
    }

    segments.forEach((segment, index) => {
      const isLightSegment = index % 2 === 1;
      const labelColor = isLightSegment ? "#0a2942" : "#ffffff";

      const centerAngle = Phaser.Math.DegToRad(-90 + index * 60);
      const labelRadius = 244;
      const labelContainer = this.add.container(
        Math.cos(centerAngle) * labelRadius,
        Math.sin(centerAngle) * labelRadius,
      );

      const label = this.add
        .text(0, -20, segment.label, {
          fontFamily: FONTS.display,
          fontSize: "64px",
          fontStyle: "800",
          color: labelColor,
        })
        .setOrigin(0.5);

      const unit = this.add
        .text(0, 28, "points", {
          fontFamily: FONTS.body,
          fontSize: "26px",
          fontStyle: "700",
          color: labelColor,
        })
        .setOrigin(0.5)
        .setAlpha(isLightSegment ? 0.92 : 0.88);

      labelContainer.add([label, unit]);
      labelContainer.setRotation(centerAngle + Math.PI / 2);

      this.wheelRoot?.add(labelContainer);
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
    const highlight = this.add.graphics();
    highlight.fillStyle(0xffffff, 0.18);
    highlight.slice(0, 0, 420, startAngle, endAngle, false);
    highlight.fillPath();
    highlight.lineStyle(8, 0xfff7c2, 0.95);
    highlight.slice(0, 0, 425, startAngle, endAngle, false);
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

  private getWheelSignature(segments: WheelSegmentDto[]) {
    return segments
      .map((segment) =>
        [
          segment.segmentIndex,
          segment.label,
          segment.scoreOperator,
          segment.scoreOperand,
          segment.weightPercent,
        ].join(":"),
      )
      .join("|");
  }

  private launchCelebrationFireworks() {
    this.clearCelebrationBursts();

    const burstCount = 10;
    for (let index = 0; index < burstCount; index += 1) {
      const timer = this.time.delayedCall(index * 220, () => {
        const point = this.getRandomFireworkPoint();
        this.createFireworkBurst(point.x, point.y, Phaser.Math.FloatBetween(0.92, 1.1));

        if (Math.random() < 0.25) {
          const echo = this.getNearbyFireworkPoint(point);
          this.createFireworkBurst(echo.x, echo.y, Phaser.Math.FloatBetween(0.58, 0.78));
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
    const centerX = WHEEL_CENTER_X;
    const centerY = WHEEL_CENTER_Y;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(280, 580);
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
    this.tweens.add({
      targets: flash,
      scale: 3.9,
      alpha: 0,
      duration: 360,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });

    const ring = this.add.circle(x, y, 30 * scale);
    ring.setStrokeStyle(6 * scale, burstBaseColor, 0.92);
    this.tweens.add({
      targets: ring,
      scale: 4.2,
      alpha: 0,
      duration: 860,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    const spokes = this.add.graphics({ x, y });
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
      duration: 760,
      ease: "Quart.easeOut",
      onComplete: () => spokes.destroy(),
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

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + Phaser.Math.Between(-24, 34) * scale,
        scale: 0.18,
        alpha: 0,
        duration: Phaser.Math.Between(760, 1180),
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private drawPointer() {
    this.add
      .image(WHEEL_CENTER_X, POINTER_TIP_Y, "RouletteArrow")
      .setOrigin(0.5, 1)
      .setScale(POINTER_SCALE * WHEEL_SCALE);
  }

  private createWheelCenterButton() {
    const container = this.add.container(WHEEL_CENTER_X, WHEEL_CENTER_Y);
    const shadow = this.add.circle(6, 10, 108, 0x8f4b75, 0.18);
    const face = this.add.image(0, 0, "Spin_Red").setScale(0.69);
    const spinArrows = this.add.image(0, 0, "SpinArrow").setScale(0.72);
    const label = this.add
      .text(0, 10, "SPIN NOW", {
        fontFamily: FONTS.display,
        fontSize: "42px",
        color: "#ffffff",
        fontStyle: "800",
        align: "center",
      })
      .setOrigin(0.5);
    label.setWordWrapWidth(180, true);

    const drawFace = (color: number) => {
      face.clearTint();
      spinArrows.clearTint();

      if (color === COLORS.accent) {
        face.setTint(0xffd15a);
        spinArrows.setTint(0xffffff);
        return;
      }

      if (color === COLORS.disabled) {
        face.setTint(0xb4bdc9);
        spinArrows.setTint(0xf3f6fa);
      }
    };

    drawFace(COLORS.primary);

    container.add([shadow, face, spinArrows, label]);
    container.setSize(240, 240);
    container.setScale(WHEEL_SCALE);
    face.setInteractive({ useHandCursor: true });
    face.on("pointerup", () => {
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
    face.on("pointerover", () => {
      container.setScale(WHEEL_SCALE * 1.02);
    });
    face.on("pointerout", () => {
      container.setScale(WHEEL_SCALE);
    });

    return {
      container,
      label,
      setLabel(nextLabel: string) {
        label.setText(nextLabel);
      },
      setBackground(color: number) {
        drawFace(color === COLORS.primary ? 0xe15693 : color);
      },
      setEnabled(enabled: boolean) {
        face.disableInteractive();
        if (enabled) {
          face.setInteractive({ useHandCursor: true });
        }

        container.setAlpha(enabled ? 1 : 0.78);
      },
    };
  }
}
