import Phaser from "phaser";
import type { AppLocale } from "@lucky-wheel/contracts";
import { FONTS } from "./constants";
import { formatNumber } from "./helpers";
import { createWinUiBackground, WIN_UI_DISPLAY_SIZE } from "./winUiFx";

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

const POPUP_WIDTH = WIN_UI_DISPLAY_SIZE;
const POPUP_HEIGHT = WIN_UI_DISPLAY_SIZE;
const POINTS_PANEL_CENTER_Y = 176;
const POINTS_PANEL_MAX_TEXT_WIDTH = 376;
const POINTS_LABEL_GAP = 2;
const MAX_POINTS_FONT_SIZE = 56;
const MIN_POINTS_FONT_SIZE = 28;

export function createWinningPopup(
  scene: Phaser.Scene,
  { x, y, totalPoints, locale, depth = 12, scale = 1 }: WinningPopupOptions,
): WinningPopupHandle {
  const container = scene.add.container(x, y).setDepth(depth).setScale(scale);
  const sign = totalPoints >= 0 ? "+" : "-";
  const formattedTotal = formatNumber(Math.abs(totalPoints), locale);
  const numberLine = `${sign} ${formattedTotal}`;
  const labelLine = "total points!";
  let numberSizePx = Math.min(
    MAX_POINTS_FONT_SIZE,
    Math.max(MIN_POINTS_FONT_SIZE, Math.floor(POINTS_PANEL_MAX_TEXT_WIDTH / (numberLine.length * 0.58))),
  );
  const background = createWinUiBackground(scene);

  const numberText = scene.add
    .text(0, 0, numberLine, {
      fontFamily: FONTS.displayName,
      fontSize: `${numberSizePx}px`,
      fontStyle: "900",
      color: "#0799dc",
      align: "center",
    })
    .setOrigin(0.5, 0)
    .setStroke("#ffffff", 7)
    .setShadow(0, 5, "#8bdcf7", 6, false, true);

  while (numberText.width > POINTS_PANEL_MAX_TEXT_WIDTH && numberSizePx > MIN_POINTS_FONT_SIZE) {
    numberSizePx -= 2;
    numberText.setFontSize(numberSizePx);
  }

  if (numberText.width > POINTS_PANEL_MAX_TEXT_WIDTH) {
    numberText.setScale(POINTS_PANEL_MAX_TEXT_WIDTH / numberText.width, 1);
  }

  const labelSizePx = Math.max(22, Math.round(numberSizePx * 0.54));
  const labelText = scene.add
    .text(0, 0, labelLine, {
      fontFamily: FONTS.displayName,
      fontSize: `${labelSizePx}px`,
      fontStyle: "900",
      color: "#087db7",
      align: "center",
    })
    .setOrigin(0.5, 0)
    .setStroke("#ffffff", 5)
    .setShadow(0, 4, "#9fe6fb", 5, false, true);

  const textStackHeight = numberText.height + POINTS_LABEL_GAP + labelText.height;
  numberText.setY(Math.round(POINTS_PANEL_CENTER_Y - textStackHeight / 2));
  labelText.setY(Math.round(numberText.y + numberText.height + POINTS_LABEL_GAP));

  container.add(background ? [background, numberText, labelText] : [numberText, labelText]);
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
