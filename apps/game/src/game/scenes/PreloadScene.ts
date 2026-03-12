import Phaser from "phaser";
import { COLORS, SCENE_KEYS, STAGE_HEIGHT, STAGE_WIDTH } from "../constants";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Preload);
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.pageTop);
    this.add
      .text(STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 60, "Lucky Wheel", {
        fontFamily: "Trebuchet MS",
        fontSize: "72px",
        fontStyle: "700",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 24, "Building placeholder assets", {
        fontFamily: "Segoe UI",
        fontSize: "28px",
        color: "#d7f4ff",
      })
      .setOrigin(0.5);

    this.createIconTexture("icon-deposit", COLORS.primary, "D");
    this.createIconTexture("icon-spin", COLORS.primary, "S");
    this.createIconTexture("icon-rank", COLORS.primary, "R");
    this.createIconTexture("icon-history", COLORS.primary, "H");
    this.createIconTexture("icon-close", COLORS.ink, "X");
    this.createIconTexture("icon-globe", COLORS.primary, "G");
    this.createIconTexture("icon-menu", COLORS.primary, "M");

    this.time.delayedCall(220, () => {
      this.scene.start(SCENE_KEYS.Lobby);
      this.scene.launch(SCENE_KEYS.Wheel);
    });
  }

  private createIconTexture(key: string, backgroundColor: number, glyph: string) {
    const circle = this.add.graphics();
    circle.fillStyle(backgroundColor, 1);
    circle.fillCircle(40, 40, 40);
    circle.fillStyle(COLORS.white, 0.24);
    circle.fillCircle(32, 28, 12);
    circle.generateTexture(`${key}-base`, 80, 80);
    circle.destroy();

    const label = this.add
      .text(-1000, -1000, glyph, {
        fontFamily: "Trebuchet MS",
        fontSize: "34px",
        fontStyle: "700",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const composed = this.add.renderTexture(0, 0, 80, 80).setVisible(false);
    composed.draw(`${key}-base`, 40, 40);
    composed.draw(label, 40, 40);
    composed.saveTexture(key);
    label.destroy();
    composed.destroy();
    this.textures.remove(`${key}-base`);
  }
}
