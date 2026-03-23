import Phaser from "phaser";
import type { SpinSuccessResponse } from "@lucky-wheel/contracts";
import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel, addTextButton, formatNumber } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

export class ResultPopupScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.ResultPopup);
  }

  create(data: SpinSuccessResponse) {
    const locale = prototypeState.getSnapshot().locale;
    const frame = this.createFrame(
      prototypeState.t("result.title"),
      prototypeState.t("result.subtitle"),
      720,
    );
    this.launchCelebration(frame);

    addRoundedPanel(this, 540, 1080, 760, 280, {
      fillColor: COLORS.white,
      radius: 40,
    });

    this.add
      .text(540, 980, prototypeState.t("result.segment", { index: data.segmentIndex + 1 }), {
        fontFamily: FONTS.body,
        fontSize: "26px",
        fontStyle: "700",
        color: "#63839b",
      })
      .setOrigin(0.5);

    this.add
      .text(
        540,
        1060,
        data.scoreDelta >= 0
          ? `+${formatNumber(data.scoreDelta, locale)}`
          : formatNumber(data.scoreDelta, locale),
        {
          fontFamily: FONTS.display,
          fontSize: "84px",
          fontStyle: "700",
          color: data.scoreDelta >= 0 ? "#10a7eb" : "#ff7c7c",
        },
      )
      .setOrigin(0.5);

    this.add
      .text(
        540,
        1140,
        prototypeState.t("result.newTotal", {
          total: formatNumber(data.runningEventTotal, locale),
        }),
        {
          fontFamily: FONTS.body,
          fontSize: "30px",
          color: "#0a2942",
        },
      )
      .setOrigin(0.5);

    this.add
      .text(540, 1186, prototypeState.t("result.rank", { rank: data.rank ?? "-" }), {
        fontFamily: FONTS.body,
        fontSize: "24px",
        color: "#65829a",
      })
      .setOrigin(0.5);

    addTextButton(this, 540, 1280, 280, 84, prototypeState.t("result.continue"), () => {
      prototypeState.acknowledgeSpinResult();
      this.scene.stop();
    });
  }

  private launchCelebration(frame: { left: number; right: number; top: number; bottom: number }) {
    const burstPoints = [
      { x: frame.left + 100, y: frame.top + 120 },
      { x: frame.right - 100, y: frame.top + 120 },
      { x: frame.left + 70, y: frame.top + 290 },
      { x: frame.right - 70, y: frame.top + 290 },
      { x: 540, y: frame.top + 80 },
      { x: 330, y: frame.bottom - 160 },
      { x: 750, y: frame.bottom - 160 },
    ];

    burstPoints.forEach((point, index) => {
      this.time.delayedCall(index * 140, () => this.createFireworkBurst(point.x, point.y));
    });
  }

  private createFireworkBurst(x: number, y: number) {
    const colors = [0xff4d6d, 0xff9f1c, 0xffd60a, 0x2dd4bf, 0x14b8ff, 0x7c4dff];

    const flash = this.add.circle(x, y, 18, 0xffffff, 0.42).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      scale: 3.4,
      alpha: 0,
      duration: 360,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });

    const ring = this.add.circle(x, y, 22);
    ring.setStrokeStyle(6, colors[Phaser.Math.Between(0, colors.length - 1)], 0.85);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: ring,
      scale: 2.8,
      alpha: 0,
      duration: 620,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    const particleCount = Phaser.Math.Between(16, 22);
    for (let index = 0; index < particleCount; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(90, 180);
      const size = Phaser.Math.Between(4, 10);
      const particle = this.add
        .circle(
          x,
          y,
          size,
          colors[index % colors.length],
          Phaser.Math.FloatBetween(0.8, 1),
        )
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + Phaser.Math.Between(-18, 28),
        scale: 0.15,
        alpha: 0,
        duration: Phaser.Math.Between(820, 1180),
        ease: "Cubic.easeOut",
        onComplete: () => particle.destroy(),
      });
    }
  }
}
