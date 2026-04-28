import Phaser from "phaser";
import {
  EligibilityStatus,
  WheelSegmentOperator,
  WheelVisualState,
  type SpinSuccessResponse,
  type WheelSegmentDto,
} from "@lucky-wheel/contracts";
import { playWinningEffect } from "../../audio";
import { COLORS, FONTS, SCENE_KEYS, shouldShowDevEligibilitySwitch } from "../../constants";
import { addTextButton, openExternalLink } from "../../helpers";
import { createRibbonsBurst } from "../../ribbonsFx";
import { prototypeState } from "../../state/prototype-state";
import {
  createWinningPopup,
  getPointAroundWinningPopup,
  type WinningPopupBounds,
  type WinningPopupHandle,
} from "../../winningPopup";

const WHEEL_CENTER_X = 960;
const WHEEL_CENTER_Y = 818;
const WHEEL_SCALE = 0.705;
const WHEEL_ASSET_SIZE = 972;
const POINTER_X = 960;
const POINTER_SCALE = 0.5;
const POINTER_ASSET_HEIGHT = 138;
const POINTER_Y_OFFSET = 20;
// Drop roughly half the desktop pointer into the wheel rim.
const POINTER_Y =
  WHEEL_CENTER_Y -
  (WHEEL_ASSET_SIZE * WHEEL_SCALE) / 2 +
  (POINTER_ASSET_HEIGHT * POINTER_SCALE) / 2 +
  POINTER_Y_OFFSET;
const CELEBRATION_DURATION_MS = 8000;
const FIREWORK_CADENCE_MS = 420;
const FIREWORK_BURST_COUNT = Math.ceil(CELEBRATION_DURATION_MS / FIREWORK_CADENCE_MS);
const FIREWORK_EFFECT_DEPTH = 6;
const SEGMENT_HIGHLIGHT_OUTER_RADIUS = WHEEL_ASSET_SIZE / 2 - 18;
const SEGMENT_HIGHLIGHT_INNER_RADIUS = 122;
const SEGMENT_HIGHLIGHT_DOT_COUNT = 5;
const SEGMENT_HIGHLIGHT_SHADOW = 0x8a4300;
const SEGMENT_HIGHLIGHT_ORANGE = 0xff8b1f;
const SEGMENT_HIGHLIGHT_GOLD = 0xffcb47;
const SEGMENT_HIGHLIGHT_GOLD_SOFT = 0xffefad;
const SEGMENT_HIGHLIGHT_AMBER = 0xffb347;
const ENDED_WHEEL_TEXT_DARK = "#50555d";
const ENDED_WHEEL_TEXT_LIGHT = "#f3f5f7";

type DesktopWheelButton = {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  setLabel: (nextLabel: string) => void;
  setBackground: (color: number) => void;
  setEnabled: (enabled: boolean) => void;
};

export class DesktopWheelScene extends Phaser.Scene {
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
  private winningPopup?: WinningPopupHandle;
  private cleanup: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.DesktopWheel);
  }

  create() {
    this.wheelRoot = this.add.container(WHEEL_CENTER_X, WHEEL_CENTER_Y);
    this.wheelRoot.setScale(WHEEL_SCALE);
    this.drawWheel([]);
    this.button = this.createWheelCenterButton();

    if (shouldShowDevEligibilitySwitch()) {
      this.testSpinButton = addTextButton(
        this,
        1734,
        148,
        188,
        56,
        "Test Spin",
        () => {
          this.runVisualTestSpin();
        },
        {
          backgroundColor: 0xe9f7ff,
          labelColor: "#0a2942",
          radius: 28,
        },
      );
      this.testSpinButton.label.setFontSize("20px");
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

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.highlightTween?.stop();
      this.highlightGraphic?.destroy();
      this.celebrationTimer?.remove(false);
      this.clearCelebrationBursts();
      this.clearWinningPopup();
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
      this.playSpinCelebration(result);
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

  private playSpinCelebration(result: SpinSuccessResponse | number) {
    const segmentIndex = typeof result === "number" ? result : result.segmentIndex;
    const totalPoints =
      typeof result === "number" ? this.getPreviewTotalPoints(result) : result.runningEventTotal;
    this.highlightedSegmentIndex = segmentIndex;
    playWinningEffect(this);
    this.applyState();
    const popupBounds = this.showWinningPopup(totalPoints);
    this.launchCelebrationFireworks(segmentIndex, popupBounds);

    this.celebrationTimer?.remove(false);
    this.celebrationTimer = this.time.delayedCall(CELEBRATION_DURATION_MS, () => {
      this.clearCelebrationBursts();
      this.clearWinningPopup();
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

  private showWinningPopup(totalPoints: number) {
    this.clearWinningPopup();
    const popup = createWinningPopup(this, {
      x: WHEEL_CENTER_X,
      y: WHEEL_CENTER_Y - 230,
      totalPoints,
      locale: prototypeState.getSnapshot().locale,
      depth: FIREWORK_EFFECT_DEPTH + 2,
      scale: 0.86,
    });
    this.winningPopup = popup;
    return popup.bounds;
  }

  private clearWinningPopup() {
    this.winningPopup?.destroy();
    this.winningPopup = undefined;
  }

  private getPreviewTotalPoints(segmentIndex: number) {
    const snapshot = prototypeState.getSnapshot();
    const baseTotal = snapshot.player?.totalScore ?? 0;
    const segment = snapshot.currentEvent?.wheelSegments[segmentIndex];
    if (!segment) {
      return baseTotal;
    }

    const operand = segment.scoreOperand;
    if (segment.scoreOperator === WheelSegmentOperator.Subtract) {
      return baseTotal - operand;
    }
    if (segment.scoreOperator === WheelSegmentOperator.Multiply) {
      return baseTotal * operand;
    }
    if (segment.scoreOperator === WheelSegmentOperator.Divide) {
      return operand === 0 ? baseTotal : Math.floor(baseTotal / operand);
    }
    if (segment.scoreOperator === WheelSegmentOperator.Equals) {
      return operand;
    }
    return baseTotal + operand;
  }

  private drawWheel(segments: WheelSegmentDto[]) {
    if (!this.wheelRoot) {
      return;
    }

    const isGreyedOut = this.currentWheelVisualState === WheelVisualState.GreyedOut;
    this.highlightTween?.stop();
    this.highlightTween = undefined;
    this.highlightGraphic = undefined;
    this.renderedHighlightIndex = undefined;
    this.wheelRoot.removeAll(true);

    const wheelBackdrop = this.add.image(
      0,
      0,
      isGreyedOut ? "Desktop_RouletteExpired" : "Desktop_Roulette",
    );
    this.wheelRoot.add(wheelBackdrop);
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

  private launchCelebrationFireworks(segmentIndex: number, popupBounds?: WinningPopupBounds) {
    this.clearCelebrationBursts();

    for (let index = 0; index < FIREWORK_BURST_COUNT; index += 1) {
      const timer = this.time.delayedCall(index * FIREWORK_CADENCE_MS, () => {
        const point = popupBounds
          ? getPointAroundWinningPopup(popupBounds, {
              minX: 340,
              maxX: 1580,
              minY: 250,
              maxY: 950,
            })
          : this.getWinningSegmentFireworkPoint(segmentIndex);
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
      300,
      930,
    );

    return { x, y };
  }

  private getNearbyFireworkPoint(origin: { x: number; y: number }) {
    return {
      x: Phaser.Math.Clamp(origin.x + Phaser.Math.Between(-128, 128), 340, 1580),
      y: Phaser.Math.Clamp(origin.y + Phaser.Math.Between(-104, 104), 300, 930),
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
      .setScale(POINTER_SCALE);
    this.syncPointerVisualState();
  }

  private createWheelCenterButton(): DesktopWheelButton {
    const container = this.add.container(WHEEL_CENTER_X, WHEEL_CENTER_Y);
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
      const snapshot = prototypeState.getSnapshot();
      const eligibility = snapshot.eligibility?.eligibilityStatus;

      if (!eligibility || this.spinning) {
        return;
      }

      if (eligibility === EligibilityStatus.GoToDeposit) {
        openExternalLink(prototypeState.getDepositUrl());
        return;
      }

      if (eligibility !== EligibilityStatus.PlayableNow) {
        return;
      }

      void prototypeState.spin();
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
}
