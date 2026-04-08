import Phaser from "phaser";
import {
  EligibilityStatus,
  WheelVisualState,
  type SpinSuccessResponse,
  type WheelSegmentDto,
} from "@lucky-wheel/contracts";
import { playWinningEffect } from "../audio";
import { COLORS, FONTS, SCENE_KEYS, shouldShowDevEligibilitySwitch } from "../constants";
import { addTextButton, openExternalLink } from "../helpers";
import { prototypeState } from "../state/prototype-state";

const WHEEL_CENTER_X = 540;
const WHEEL_CENTER_Y = 1180;
const WHEEL_SCALE = 0.85;
const WHEEL_BACKDROP_SCALE = 0.86;
const WHEEL_BACKDROP_SIZE = 972;
const POINTER_SCALE = 0.58;
const POINTER_GAP = -14 * WHEEL_SCALE;
const CELEBRATION_DURATION_MS = 6000;
const FIREWORK_CADENCE_MS = 420;
const FIREWORK_BURST_COUNT = Math.ceil(CELEBRATION_DURATION_MS / FIREWORK_CADENCE_MS);
const SEGMENT_HIGHLIGHT_OUTER_RADIUS = 410;
const SEGMENT_HIGHLIGHT_INNER_RADIUS = 122;
const SEGMENT_HIGHLIGHT_DOT_COUNT = 5;
const SEGMENT_HIGHLIGHT_SHADOW = 0x8a4300;
const SEGMENT_HIGHLIGHT_ORANGE = 0xff8b1f;
const SEGMENT_HIGHLIGHT_GOLD = 0xffcb47;
const SEGMENT_HIGHLIGHT_GOLD_SOFT = 0xffefad;
const SEGMENT_HIGHLIGHT_AMBER = 0xffb347;
const ENDED_WHEEL_TINT = 0xe9edf1;
const ENDED_WHEEL_SEGMENT_DARK = 0xd8dce1;
const ENDED_WHEEL_SEGMENT_LIGHT = 0xfdfdfd;
const ENDED_WHEEL_SEGMENT_DIVIDER = 0xe8edf2;
const ENDED_WHEEL_RIM_SHADOW = 0xb9c0c7;
const ENDED_WHEEL_RIM = 0xf7f9fb;
const ENDED_WHEEL_RIM_INNER = 0xcfd5dc;
const ENDED_WHEEL_TEXT_DARK = "#50555d";
const ENDED_WHEEL_TEXT_LIGHT = "#f3f5f7";
const ENDED_WHEEL_SEGMENT_RADIUS = 394;
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
  private currentWheelVisualState = WheelVisualState.Normal;
  private spinning = false;
  private pointer?: Phaser.GameObjects.Image;
  private highlightedSegmentIndex?: number;
  private highlightGraphic?: Phaser.GameObjects.Container;
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
      prototypeState.subscribe("error", () => {
        if (!this.scene.isActive(SCENE_KEYS.ErrorOverlay)) {
          this.scene.launch(SCENE_KEYS.ErrorOverlay);
        }
      }),
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
    this.button.container.setAlpha(
      this.currentEligibility === EligibilityStatus.EventEnded
        ? 1
        : !this.spinning && this.currentEligibility !== EligibilityStatus.AlreadySpin
          ? 1
          : 0.78,
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
    this.launchCelebrationFireworks();

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

    const isGreyedOut = this.currentWheelVisualState === WheelVisualState.GreyedOut;
    const wheelRadius = (WHEEL_BACKDROP_SIZE * WHEEL_BACKDROP_SCALE) / 2;
    this.highlightTween?.stop();
    this.highlightTween = undefined;
    this.highlightGraphic = undefined;
    this.renderedHighlightIndex = undefined;
    this.wheelRoot.removeAll(true);
    const wheelBackdrop = this.add.image(0, 0, "Roulette");
    wheelBackdrop.setScale(WHEEL_BACKDROP_SCALE);
    if (isGreyedOut) {
      wheelBackdrop.setTintFill(ENDED_WHEEL_TINT);
      wheelBackdrop.setAlpha(0.16);
    }
    this.wheelRoot.add(wheelBackdrop);
    this.renderedWheelSignature = this.getWheelSignature(segments, this.currentWheelVisualState);

    if (segments.length === 0) {
      return;
    }

    if (isGreyedOut) {
      const endedSegments = this.add.graphics();

      segments.forEach((_, index) => {
        const startAngle = Phaser.Math.DegToRad(-120 + index * 60);
        const endAngle = Phaser.Math.DegToRad(-60 + index * 60);
        const segmentFill =
          index % 2 === 0 ? ENDED_WHEEL_SEGMENT_DARK : ENDED_WHEEL_SEGMENT_LIGHT;

        endedSegments.fillStyle(segmentFill, index % 2 === 0 ? 0.98 : 1);
        endedSegments.beginPath();
        endedSegments.moveTo(0, 0);
        endedSegments.arc(0, 0, ENDED_WHEEL_SEGMENT_RADIUS, startAngle, endAngle, false);
        endedSegments.closePath();
        endedSegments.fillPath();

        endedSegments.lineStyle(3, ENDED_WHEEL_SEGMENT_DIVIDER, 0.92);
        endedSegments.beginPath();
        endedSegments.moveTo(0, 0);
        endedSegments.lineTo(
          Math.cos(startAngle) * ENDED_WHEEL_SEGMENT_RADIUS,
          Math.sin(startAngle) * ENDED_WHEEL_SEGMENT_RADIUS,
        );
        endedSegments.moveTo(0, 0);
        endedSegments.lineTo(
          Math.cos(endAngle) * ENDED_WHEEL_SEGMENT_RADIUS,
          Math.sin(endAngle) * ENDED_WHEEL_SEGMENT_RADIUS,
        );
        endedSegments.strokePath();
      });

      const segmentGlow = this.add.circle(0, 0, ENDED_WHEEL_SEGMENT_RADIUS - 8, 0xffffff, 0.08);
      this.wheelRoot.add([endedSegments, segmentGlow]);
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
      const labelRadius = 244;
      const labelContainer = this.add.container(
        Math.cos(centerAngle) * labelRadius,
        Math.sin(centerAngle) * labelRadius,
      );

      const label = this.add
        .text(0, -22, segment.label, {
          fontFamily: FONTS.displayName,
          fontSize: "76px",
          fontStyle: "800",
          color: labelColor,
        })
        .setOrigin(0.5);

      const unit = this.add
        .text(0, 36, "points", {
          fontFamily: FONTS.bodyName,
          fontSize: "30px",
          fontStyle: "700",
          color: labelColor,
        })
        .setOrigin(0.5)
        .setAlpha(isGreyedOut ? (isLightSegment ? 0.86 : 0.92) : isLightSegment ? 0.92 : 0.88);

      labelContainer.add([label, unit]);
      labelContainer.setRotation(centerAngle + Math.PI / 2);

      this.wheelRoot?.add(labelContainer);
    });

    if (isGreyedOut) {
      const rimShadow = this.add.circle(0, 0, wheelRadius - 5);
      rimShadow.setStrokeStyle(14, ENDED_WHEEL_RIM_SHADOW, 0.5);
      const rim = this.add.circle(0, 0, wheelRadius - 11);
      rim.setStrokeStyle(9, ENDED_WHEEL_RIM, 0.96);
      const innerRim = this.add.circle(0, 0, wheelRadius - 28);
      innerRim.setStrokeStyle(4, ENDED_WHEEL_RIM_INNER, 0.72);
      const faceBloom = this.add.circle(0, 0, wheelRadius - 42, 0xffffff, 0.08);
      this.wheelRoot.add([faceBloom, rimShadow, rim, innerRim]);
    }

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
      const dotAngle = Phaser.Math.Linear(startAngle + 0.1, endAngle - 0.1, index / (SEGMENT_HIGHLIGHT_DOT_COUNT - 1));
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

  private isEventEndedButton(color: number) {
    return color === COLORS.disabled;
  }

  private launchCelebrationFireworks() {
    this.clearCelebrationBursts();

    for (let index = 0; index < FIREWORK_BURST_COUNT; index += 1) {
      const timer = this.time.delayedCall(index * FIREWORK_CADENCE_MS, () => {
        const point = this.getRandomFireworkPoint();
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
      duration: 440,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });

    const ring = this.add.circle(x, y, 30 * scale);
    ring.setStrokeStyle(6 * scale, burstBaseColor, 0.92);
    this.tweens.add({
      targets: ring,
      scale: 4.2,
      alpha: 0,
      duration: 980,
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
      duration: 940,
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
        duration: Phaser.Math.Between(900, 1450),
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }

  private drawPointer() {
    this.pointer = this.add
      .image(WHEEL_CENTER_X, POINTER_TIP_Y, "RouletteArrow")
      .setOrigin(0.5, 1)
      .setScale(POINTER_SCALE * WHEEL_SCALE);
    this.syncPointerVisualState();
  }

  private createWheelCenterButton() {
    const container = this.add.container(WHEEL_CENTER_X, WHEEL_CENTER_Y);
    const face = this.add.image(0, 0, "Spin_Red").setScale(0.88);
    const spinArrows = this.add.image(0, 0, "SpinArrow").setScale(0.9);
    const label = this.add
      .text(0, 4, "SPIN NOW", {
        fontFamily: FONTS.displayName,
        fontSize: "40px",
        color: "#ffffff",
        fontStyle: "800",
        align: "center",
      })
      .setOrigin(0.5);
    label.setWordWrapWidth(208, true);

    const drawFace = (color: number) => {
      face.clearTint();
      spinArrows.clearTint();
      face.setAlpha(1);
      spinArrows.setAlpha(1);

      if (color === COLORS.accent) {
        face.setTint(0xffd15a);
        spinArrows.setTint(0xffffff);
        label.setColor("#0a2942");
        return;
      }

      if (this.isEventEndedButton(color)) {
        face.setTintFill(0x9fa6af);
        spinArrows.setTintFill(0xf0f3f6);
        spinArrows.setAlpha(0.62);
        label.setColor("#ffffff");
      }
    };

    drawFace(COLORS.primary);

    container.add([face, spinArrows, label]);
    container.setSize(300, 300);
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
