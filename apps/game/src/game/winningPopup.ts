import Phaser from "phaser";
import type { AppLocale } from "@lucky-wheel/contracts";
import { COLORS, FONTS } from "./constants";
import { formatNumber } from "./helpers";

export type WinningPopupBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

type WinningPopupOptions = {
  x: number;
  y: number;
  totalPoints: number;
  locale: AppLocale;
  depth?: number;
  scale?: number;
};

export type WinningPopupHandle = {
  container: Phaser.GameObjects.Container;
  bounds: WinningPopupBounds;
  destroy: () => void;
};

const POPUP_WIDTH = 845;
const POPUP_HEIGHT = 450;

export function createWinningPopup(
  scene: Phaser.Scene,
  { x, y, totalPoints, locale, depth = 12, scale = 1 }: WinningPopupOptions,
): WinningPopupHandle {
  const container = scene.add.container(x, y).setDepth(depth).setScale(scale);
  const sign = totalPoints >= 0 ? "+" : "-";
  const formattedTotal = formatNumber(Math.abs(totalPoints), locale);
  const totalLine = `${sign} ${formattedTotal} total points!`;
  const totalFontSize = totalLine.length > 24 ? "44px" : totalLine.length > 18 ? "50px" : "58px";

  const shadow = scene.add.ellipse(0, 236, POPUP_WIDTH * 0.78, 92, 0x1478a8, 0.2);

  const glow = scene.add.graphics();
  glow.fillStyle(0x7edfff, 0.18);
  glow.fillEllipse(0, 0, POPUP_WIDTH + 80, POPUP_HEIGHT + 70);
  glow.lineStyle(8, 0xffffff, 0.42);
  glow.strokeEllipse(0, 0, POPUP_WIDTH + 42, POPUP_HEIGHT + 38);
  glow.setBlendMode(Phaser.BlendModes.ADD);

  const card = scene.add.graphics();
  card.fillStyle(0xffffff, 0.98);
  card.fillRoundedRect(-POPUP_WIDTH / 2, -POPUP_HEIGHT / 2, POPUP_WIDTH, POPUP_HEIGHT, 42);
  card.lineStyle(8, 0x9ee8ff, 0.96);
  card.strokeRoundedRect(-POPUP_WIDTH / 2 + 4, -POPUP_HEIGHT / 2 + 4, POPUP_WIDTH - 8, POPUP_HEIGHT - 8, 38);
  card.lineStyle(3, 0xffffff, 0.9);
  card.strokeRoundedRect(-POPUP_WIDTH / 2 + 18, -POPUP_HEIGHT / 2 + 18, POPUP_WIDTH - 36, POPUP_HEIGHT - 36, 28);
  card.fillStyle(0xd9f7ff, 0.52);
  card.fillRoundedRect(-POPUP_WIDTH / 2 + 30, -POPUP_HEIGHT / 2 + 28, POPUP_WIDTH - 60, 86, 28);
  card.fillStyle(0xffffff, 0.48);
  card.fillEllipse(-286, -186, 290, 44);
  card.fillEllipse(282, 178, 320, 42);

  const sideAccent = scene.add.graphics();
  sideAccent.fillStyle(0xffc455, 1);
  sideAccent.fillRoundedRect(-POPUP_WIDTH / 2 - 18, -118, 36, 236, 18);
  sideAccent.fillRoundedRect(POPUP_WIDTH / 2 - 18, -118, 36, 236, 18);
  sideAccent.fillStyle(0xffe59a, 1);
  sideAccent.fillCircle(-POPUP_WIDTH / 2, -138, 17);
  sideAccent.fillCircle(-POPUP_WIDTH / 2, 0, 14);
  sideAccent.fillCircle(-POPUP_WIDTH / 2, 138, 17);
  sideAccent.fillCircle(POPUP_WIDTH / 2, -138, 17);
  sideAccent.fillCircle(POPUP_WIDTH / 2, 0, 14);
  sideAccent.fillCircle(POPUP_WIDTH / 2, 138, 17);

  const crown = scene.add.graphics();
  const crownPoints = [
    new Phaser.Math.Vector2(-100, -118),
    new Phaser.Math.Vector2(-84, -166),
    new Phaser.Math.Vector2(-50, -145),
    new Phaser.Math.Vector2(-26, -180),
    new Phaser.Math.Vector2(0, -150),
    new Phaser.Math.Vector2(28, -190),
    new Phaser.Math.Vector2(52, -145),
    new Phaser.Math.Vector2(86, -166),
    new Phaser.Math.Vector2(100, -118),
  ];

  crown.fillStyle(0xd38c19, 0.22);
  crown.fillRoundedRect(-90, -112, 180, 26, 13);
  crown.fillStyle(0xffc455, 1);
  crown.fillPoints(crownPoints, true);
  crown.fillRoundedRect(-98, -126, 196, 38, 16);
  crown.fillStyle(0xffe59a, 1);
  crown.fillCircle(-84, -166, 10);
  crown.fillCircle(-26, -180, 9);
  crown.fillCircle(28, -190, 12);
  crown.fillCircle(86, -166, 10);
  crown.fillStyle(0xffa929, 0.6);
  crown.fillRoundedRect(-92, -104, 184, 16, 8);
  crown.fillStyle(0xffffff, 0.34);
  crown.fillTriangle(-72, -124, -52, -146, -30, -124);
  crown.fillTriangle(4, -126, 28, -160, 54, -126);
  crown.fillRoundedRect(-76, -119, 54, 8, 4);
  crown.fillStyle(0x17aef3, 1);
  crown.fillCircle(-48, -107, 7);
  crown.fillStyle(0xff3f82, 1);
  crown.fillCircle(0, -106, 8);
  crown.fillStyle(0x17aef3, 1);
  crown.fillCircle(48, -107, 7);
  crown.lineStyle(5, 0xffffff, 0.82);
  crown.strokePoints(crownPoints, true);
  crown.strokeRoundedRect(-98, -126, 196, 38, 16);
  crown.lineStyle(3, 0xd38c19, 0.34);
  crown.lineBetween(-88, -126, 88, -126);
  crown.setY(-75);

  const title = scene.add
    .text(0, -50, "YOU WIN!", {
      fontFamily: FONTS.displayName,
      fontSize: "68px",
      fontStyle: "900",
      color: "#0b9ee3",
      align: "center",
    })
    .setOrigin(0.5)
    .setStroke("#ffffff", 9);

  const pointsText = scene.add
    .text(0, 92, totalLine, {
      fontFamily: FONTS.displayName,
      fontSize: totalFontSize,
      fontStyle: "900",
      color: "#ff3f82",
      align: "center",
    })
    .setOrigin(0.5)
    .setStroke("#ffffff", 8);
  pointsText.setWordWrapWidth(POPUP_WIDTH - 80, true);

  const sparkle = scene.add.graphics();
  sparkle.fillStyle(0xffc455, 1);
  sparkle.fillCircle(-332, -68, 8);
  sparkle.fillCircle(336, -38, 7);
  sparkle.fillCircle(-292, 150, 6);
  sparkle.fillCircle(294, 142, 8);
  sparkle.fillStyle(COLORS.primary, 1);
  sparkle.fillTriangle(-360, 76, -342, 50, -322, 78);
  sparkle.fillTriangle(366, 86, 344, 60, 332, 94);

  const shine = scene.add.graphics();
  shine.fillStyle(0xffffff, 0.38);
  shine.fillRoundedRect(-346, -204, 128, 18, 9);
  shine.fillRoundedRect(186, -198, 178, 15, 8);
  shine.fillRoundedRect(-172, 162, 344, 12, 6);

  container.add([shadow, glow, card, sideAccent, crown, sparkle, title, pointsText, shine]);
  container.setAlpha(0);
  container.setScale(scale * 0.82);

  scene.tweens.add({
    targets: container,
    alpha: 1,
    scaleX: scale,
    scaleY: scale,
    duration: 360,
    ease: "Back.easeOut",
  });

  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.76, to: 1 },
    scaleX: { from: 0.98, to: 1.04 },
    scaleY: { from: 0.98, to: 1.04 },
    duration: 720,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  scene.tweens.add({
    targets: sparkle,
    alpha: { from: 0.78, to: 1 },
    scaleX: { from: 0.96, to: 1.04 },
    scaleY: { from: 0.96, to: 1.04 },
    duration: 520,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });

  const halfWidth = (POPUP_WIDTH * scale) / 2;
  const halfHeight = (POPUP_HEIGHT * scale) / 2;

  return {
    container,
    bounds: {
      left: x - halfWidth,
      right: x + halfWidth,
      top: y - halfHeight,
      bottom: y + halfHeight,
      centerX: x,
      centerY: y,
    },
    destroy: () => container.destroy(),
  };
}

export function getPointAroundWinningPopup(
  bounds: WinningPopupBounds,
  limits: { minX: number; maxX: number; minY: number; maxY: number },
  padding = 52,
) {
  const side = Phaser.Math.Between(0, 3);
  let x = bounds.centerX;
  let y = bounds.centerY;

  if (side === 0) {
    x = Phaser.Math.Between(bounds.left - padding, bounds.right + padding);
    y = Phaser.Math.Between(bounds.top - padding * 2, bounds.top - padding);
  } else if (side === 1) {
    x = Phaser.Math.Between(bounds.right + padding, bounds.right + padding * 3);
    y = Phaser.Math.Between(bounds.top - padding, bounds.bottom + padding);
  } else if (side === 2) {
    x = Phaser.Math.Between(bounds.left - padding, bounds.right + padding);
    y = Phaser.Math.Between(bounds.bottom + padding, bounds.bottom + padding * 2);
  } else {
    x = Phaser.Math.Between(bounds.left - padding * 3, bounds.left - padding);
    y = Phaser.Math.Between(bounds.top - padding, bounds.bottom + padding);
  }

  return {
    x: Phaser.Math.Clamp(x, limits.minX, limits.maxX),
    y: Phaser.Math.Clamp(y, limits.minY, limits.maxY),
  };
}
