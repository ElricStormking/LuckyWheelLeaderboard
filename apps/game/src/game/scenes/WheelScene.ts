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
      this.scene.launch(SCENE_KEYS.ResultPopup, result);
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
        this.spinning = false;
        this.applyState();
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
    this.animateWheelToSegmentIndex(segmentIndex);
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
  }

  private drawPointer() {
    const pointer = this.add.graphics();
    pointer.fillStyle(COLORS.danger, 1);
    pointer.fillTriangle(540, 830, 508, 760, 572, 760);
    pointer.lineStyle(4, COLORS.accentSoft, 0.95);
    pointer.strokeTriangle(540, 830, 508, 760, 572, 760);
  }
}
