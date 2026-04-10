import Phaser from "phaser";
import { preloadGameAudio } from "../audio";
import {
  COLORS,
  FONTS,
  SCENE_KEYS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  isDesktopLayout,
} from "../constants";
import { preloadEditorUiAssets } from "../editorUiAssets";
import { preloadRibbonsFx } from "../ribbonsFx";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Preload);
  }

  preload() {
    preloadEditorUiAssets(this);
    preloadGameAudio(this);
    preloadRibbonsFx(this);
  }

  async create() {
    await this.ensureFontsLoaded();

    this.cameras.main.setBackgroundColor(COLORS.pageTop);
    this.add
      .text(STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - 60, "Lucky Wheel", {
        fontFamily: FONTS.display,
        fontSize: "72px",
        fontStyle: "800",
        color: "#18acef",
      })
      .setOrigin(0.5);

    this.add
      .text(STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 24, "Loading game UI", {
        fontFamily: FONTS.body,
        fontSize: "28px",
        fontStyle: "700",
        color: "#5b88a0",
      })
      .setOrigin(0.5);

    this.createDepositBadgeTexture("icon-deposit");
    this.createSpinBadgeTexture("icon-spin");
    this.createRankBadgeTexture("icon-rank");
    this.createIconTexture("icon-history", COLORS.primary, "H");
    this.createIconTexture("icon-close", COLORS.ink, "X");
    this.createGlobeTexture("icon-globe");
    this.createSupportTexture("icon-menu");

    this.time.delayedCall(220, () => {
      if (isDesktopLayout()) {
        this.scene.start(SCENE_KEYS.DesktopMain);
        return;
      }

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
        fontFamily: FONTS.display,
        fontSize: "34px",
        fontStyle: "800",
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

  private createDepositBadgeTexture(key: string) {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x75d9ff, 0.18);
    graphics.fillCircle(45, 46, 34);
    graphics.fillStyle(0x4a8be9, 1);
    graphics.fillRoundedRect(24, 28, 34, 36, 12);
    graphics.fillStyle(0x8351d4, 1);
    graphics.fillRoundedRect(18, 22, 34, 36, 12);
    graphics.lineStyle(5, 0x79ddff, 1);
    graphics.beginPath();
    graphics.arc(35, 22, 8, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), false);
    graphics.strokePath();
    graphics.lineStyle(4, 0xffffff, 1);
    graphics.lineBetween(35, 31, 35, 49);
    graphics.lineBetween(27, 40, 43, 40);
    graphics.fillStyle(0x59c9ff, 1);
    graphics.fillCircle(57, 47, 10);
    graphics.lineStyle(3, 0xffffff, 1);
    graphics.lineBetween(57, 42, 57, 52);
    graphics.lineBetween(52, 47, 62, 47);
    graphics.generateTexture(key, 90, 90);
    graphics.destroy();
  }

  private createSpinBadgeTexture(key: string) {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x80dcff, 0.18);
    graphics.fillCircle(45, 45, 35);
    graphics.fillStyle(0x2f95ef, 1);
    graphics.fillCircle(45, 45, 30);
    graphics.fillStyle(0xb04a9a, 1);
    graphics.fillCircle(45, 53, 26);
    graphics.lineStyle(3, 0xffffff, 0.95);
    graphics.beginPath();
    graphics.arc(41, 42, 16, Phaser.Math.DegToRad(208), Phaser.Math.DegToRad(330), false);
    graphics.strokePath();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillTriangle(55, 27, 60, 31, 53, 35);
    graphics.generateTexture(`${key}-base`, 90, 90);
    graphics.destroy();

    const label = this.add
      .text(-1000, -1000, "SPIN", {
        fontFamily: FONTS.display,
        fontSize: "30px",
        fontStyle: "800",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setRotation(-0.18);

    const composed = this.add.renderTexture(0, 0, 90, 90).setVisible(false);
    composed.draw(`${key}-base`, 45, 45);
    composed.draw(label, 45, 43);
    composed.saveTexture(key);
    label.destroy();
    composed.destroy();
    this.textures.remove(`${key}-base`);
  }

  private createRankBadgeTexture(key: string) {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x85deff, 0.18);
    graphics.fillCircle(45, 44, 34);
    graphics.fillStyle(0xa7ebff, 1);
    graphics.fillRoundedRect(23, 24, 44, 40, 10);
    graphics.fillStyle(0xd8f7ff, 1);
    graphics.fillRoundedRect(29, 15, 12, 14, 4);
    graphics.fillRoundedRect(49, 15, 12, 14, 4);
    graphics.fillStyle(0x67cfff, 1);
    graphics.fillRect(41, 24, 8, 40);
    graphics.fillRect(23, 38, 44, 8);
    graphics.fillStyle(0x48bcff, 1);
    graphics.fillCircle(45, 48, 10);
    const star = new Phaser.Geom.Polygon([
      45, 40,
      47.7, 45.2,
      53.5, 45.8,
      49.3, 49.7,
      50.5, 55.2,
      45, 52.4,
      39.5, 55.2,
      40.7, 49.7,
      36.5, 45.8,
      42.3, 45.2,
    ]);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillPoints(star.points, true);
    graphics.generateTexture(key, 90, 90);
    graphics.destroy();
  }

  private createGlobeTexture(key: string) {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, COLORS.primary, 1);
    graphics.strokeCircle(40, 40, 20);
    graphics.lineBetween(20, 40, 60, 40);
    graphics.strokeEllipse(40, 40, 16, 40);
    graphics.strokeEllipse(40, 40, 34, 40);
    graphics.lineBetween(40, 20, 40, 60);
    graphics.generateTexture(key, 80, 80);
    graphics.destroy();
  }

  private createSupportTexture(key: string) {
    const graphics = this.add.graphics();
    graphics.lineStyle(4, COLORS.primary, 1);
    graphics.beginPath();
    graphics.arc(40, 36, 18, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    graphics.strokePath();
    graphics.strokeRoundedRect(18, 34, 8, 18, 4);
    graphics.strokeRoundedRect(54, 34, 8, 18, 4);
    graphics.lineBetween(58, 52, 48, 60);
    graphics.lineBetween(48, 60, 38, 60);
    graphics.fillStyle(COLORS.primary, 1);
    graphics.fillCircle(36, 60, 3.5);
    graphics.generateTexture(key, 80, 80);
    graphics.destroy();
  }

  private async ensureFontsLoaded() {
    if (typeof document === "undefined" || !("fonts" in document)) {
      return;
    }

    await Promise.allSettled([
      document.fonts.load(`900 72px "${FONTS.displayName}"`),
      document.fonts.load(`700 32px "${FONTS.bodyName}"`),
      document.fonts.load(`400 32px "${FONTS.bodyName}"`),
    ]);
  }
}
