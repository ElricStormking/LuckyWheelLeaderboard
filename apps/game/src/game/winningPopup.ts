import Phaser from "phaser";
import type { AppLocale } from "@lucky-wheel/contracts";
import { FONTS, STAGE_HEIGHT, STAGE_WIDTH } from "./constants";
import {
  createGiftOpenBackground,
  GIFT_OPEN_DISPLAY_HEIGHT,
  GIFT_OPEN_DISPLAY_WIDTH,
  GIFT_OPEN_POINTS_REVEAL_MS,
} from "./giftOpenFx";
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
  spinPoints: number;
  locale: AppLocale;
  depth?: number;
  scale?: number;
  onClaim?: () => void;
};

export type WinningPopupHandle = {
  container: Phaser.GameObjects.Container;
  bounds: WinningPopupBounds;
  destroy: () => void;
};

const POPUP_WIDTH = GIFT_OPEN_DISPLAY_WIDTH;
const POPUP_HEIGHT = GIFT_OPEN_DISPLAY_HEIGHT;
const POINTS_PANEL_CENTER_Y = -46;
const POINTS_PANEL_MAX_TEXT_WIDTH = 510;
const POINTS_LABEL_GAP = 2;
const MAX_POINTS_FONT_SIZE = 84;
const MIN_POINTS_FONT_SIZE = 42;
const CONGRATS_TITLE_Y = -456;
const CONGRATS_BODY_Y = -396;
const CONGRATS_MAX_TEXT_WIDTH = 580;
const CLAIM_BUTTON_Y = 384;
const CLAIM_BUTTON_WIDTH = 560;
const CLAIM_BUTTON_HEIGHT = 86;
const CLAIM_BUTTON_RADIUS = 43;
const OVERLAY_ALPHA = 0.62;
const SPARKLE_DEPTH_OFFSET = 1.4;
const SPARKLE_INTERVAL_MS = 145;
const SPARKLE_COLORS = [0x24dfff, 0xffffff, 0x78efff] as const;

const POPUP_COPY: Record<
  AppLocale,
  {
    title: string;
    body: string;
    pointsAdded: string;
    claim: string;
  }
> = {
  en: {
    title: "Congratulations!",
    body: "You have received points.",
    pointsAdded: "Points added !",
    claim: "CLAIM",
  },
  ms: {
    title: "Tahniah!",
    body: "Anda telah menerima mata.",
    pointsAdded: "Mata ditambah !",
    claim: "TUNTUT",
  },
  "zh-CN": {
    title: "恭喜！",
    body: "您已获得积分。",
    pointsAdded: "积分已增加！",
    claim: "领取",
  },
};

function createSparkle(scene: Phaser.Scene, depth: number) {
  const x = Phaser.Math.Between(56, STAGE_WIDTH - 56);
  const y = Phaser.Math.Between(96, STAGE_HEIGHT - 128);
  const size = Phaser.Math.Between(8, 18);
  const diagonalSize = Math.round(size * 0.52);
  const color = Phaser.Utils.Array.GetRandom([...SPARKLE_COLORS]);
  const sparkle = scene.add.graphics({ x, y }).setDepth(depth).setAlpha(0).setScale(0.25).setScrollFactor(0);

  sparkle.lineStyle(Math.max(2, Math.round(size / 5)), color, 1);
  sparkle.lineBetween(-size, 0, size, 0);
  sparkle.lineBetween(0, -size, 0, size);
  sparkle.lineStyle(1.5, 0xffffff, 0.9);
  sparkle.lineBetween(-diagonalSize, -diagonalSize, diagonalSize, diagonalSize);
  sparkle.lineBetween(-diagonalSize, diagonalSize, diagonalSize, -diagonalSize);

  scene.tweens.add({
    targets: sparkle,
    alpha: { from: 0, to: Phaser.Math.FloatBetween(0.78, 1) },
    scaleX: Phaser.Math.FloatBetween(0.75, 1.18),
    scaleY: Phaser.Math.FloatBetween(0.75, 1.18),
    rotation: Phaser.Math.FloatBetween(-0.75, 0.75),
    duration: Phaser.Math.Between(220, 340),
    ease: "Sine.easeOut",
    yoyo: true,
    hold: Phaser.Math.Between(90, 190),
    onComplete: () => sparkle.destroy(),
  });

  return sparkle;
}

function startGiftSparkles(scene: Phaser.Scene, depth: number) {
  const sparkles = new Set<Phaser.GameObjects.Graphics>();
  const spawnSparkles = () => {
    const burstCount = Phaser.Math.Between(1, 3);

    for (let index = 0; index < burstCount; index += 1) {
      const sparkle = createSparkle(scene, depth);
      sparkles.add(sparkle);
      sparkle.once(Phaser.GameObjects.Events.DESTROY, () => {
        sparkles.delete(sparkle);
      });
    }
  };

  spawnSparkles();
  const timer = scene.time.addEvent({
    delay: SPARKLE_INTERVAL_MS,
    loop: true,
    callback: spawnSparkles,
  });

  return () => {
    timer.remove(false);
    for (const sparkle of sparkles) {
      sparkle.destroy();
    }
    sparkles.clear();
  };
}

export function createWinningPopup(
  scene: Phaser.Scene,
  { x, y, spinPoints, locale, depth = 12, scale = 1, onClaim }: WinningPopupOptions,
): WinningPopupHandle {
  const overlay = scene.add
    .rectangle(STAGE_WIDTH / 2, STAGE_HEIGHT / 2, STAGE_WIDTH, STAGE_HEIGHT, 0x000000, 1)
    .setAlpha(0)
    .setDepth(depth - 0.1)
    .setScrollFactor(0)
    .setInteractive();
  const container = scene.add.container(x, y).setDepth(depth).setScale(scale);
  const sign = spinPoints >= 0 ? "+" : "-";
  const formattedTotal = formatNumber(Math.abs(spinPoints), locale);
  const numberLine = `${sign} ${formattedTotal}`;
  const copy = POPUP_COPY[locale] ?? POPUP_COPY.en;
  const labelLine = copy.pointsAdded;
  let numberSizePx = Math.min(
    MAX_POINTS_FONT_SIZE,
    Math.max(MIN_POINTS_FONT_SIZE, Math.floor(POINTS_PANEL_MAX_TEXT_WIDTH / (numberLine.length * 0.58))),
  );
  const background = createGiftOpenBackground(scene);
  const stopSparkles = startGiftSparkles(scene, depth + SPARKLE_DEPTH_OFFSET);
  const congratsTitle = scene.add
    .text(0, CONGRATS_TITLE_Y, copy.title, {
      fontFamily: FONTS.displayName,
      fontSize: "54px",
      fontStyle: "900",
      color: "#15c9ff",
      align: "center",
      wordWrap: { width: CONGRATS_MAX_TEXT_WIDTH, useAdvancedWrap: true },
    })
    .setOrigin(0.5)
    .setStroke("#0877a6", 2);
  const congratsBody = scene.add
    .text(0, CONGRATS_BODY_Y, copy.body, {
      fontFamily: FONTS.bodyName,
      fontSize: "38px",
      fontStyle: "900",
      color: "#12bdf8",
      align: "center",
      wordWrap: { width: CONGRATS_MAX_TEXT_WIDTH, useAdvancedWrap: true },
    })
    .setOrigin(0.5)
    .setStroke("#0877a6", 1);

  const numberText = scene.add
    .text(0, 0, numberLine, {
      fontFamily: FONTS.displayName,
      fontSize: `${numberSizePx}px`,
      fontStyle: "900",
      color: "#0799dc",
      align: "center",
    })
    .setOrigin(0.5, 0)
    .setAlpha(0)
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
    .setAlpha(0)
    .setStroke("#ffffff", 5)
    .setShadow(0, 4, "#9fe6fb", 5, false, true);

  const textStackHeight = numberText.height + POINTS_LABEL_GAP + labelText.height;
  numberText.setY(Math.round(POINTS_PANEL_CENTER_Y - textStackHeight / 2));
  labelText.setY(Math.round(numberText.y + numberText.height + POINTS_LABEL_GAP));

  const claimButton = createClaimButton(scene, copy.claim, onClaim);
  claimButton.setY(CLAIM_BUTTON_Y);

  container.add(
    background
      ? [background, congratsTitle, congratsBody, numberText, labelText, claimButton]
      : [congratsTitle, congratsBody, numberText, labelText, claimButton],
  );
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
    targets: overlay,
    alpha: OVERLAY_ALPHA,
    duration: 220,
    ease: "Sine.easeOut",
  });

  const revealTimer = scene.time.delayedCall(GIFT_OPEN_POINTS_REVEAL_MS, () => {
    if (!numberText.active || !labelText.active) {
      return;
    }

    scene.tweens.add({
      targets: [numberText, labelText],
      alpha: 1,
      duration: 260,
      ease: "Sine.easeOut",
    });
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
    destroy: () => {
      revealTimer.remove(false);
      stopSparkles();
      overlay.destroy();
      container.destroy();
    },
  };
}

function createClaimButton(scene: Phaser.Scene, label: string, onClaim?: () => void) {
  const button = scene.add.container(0, 0);
  const shadow = scene.add
    .graphics()
    .fillStyle(0x001b2f, 0.16)
    .fillRoundedRect(
      -CLAIM_BUTTON_WIDTH / 2,
      -CLAIM_BUTTON_HEIGHT / 2 + 8,
      CLAIM_BUTTON_WIDTH,
      CLAIM_BUTTON_HEIGHT,
      CLAIM_BUTTON_RADIUS,
    );
  const background = scene.add
    .graphics()
    .fillStyle(0xffffff, 1)
    .fillRoundedRect(
      -CLAIM_BUTTON_WIDTH / 2,
      -CLAIM_BUTTON_HEIGHT / 2,
      CLAIM_BUTTON_WIDTH,
      CLAIM_BUTTON_HEIGHT,
      CLAIM_BUTTON_RADIUS,
    );
  const buttonLabel = scene.add
    .text(0, 1, label, {
      fontFamily: FONTS.displayName,
      fontSize: "26px",
      fontStyle: "900",
      color: "#24bdf3",
      align: "center",
    })
    .setOrigin(0.5)
    .setStroke("#c9f7ff", 2);
  const hitArea = scene.add
    .zone(0, 0, CLAIM_BUTTON_WIDTH, CLAIM_BUTTON_HEIGHT)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  hitArea.on("pointerover", () => {
    button.setScale(1.02);
  });
  hitArea.on("pointerout", () => {
    button.setScale(1);
  });
  hitArea.on(
    "pointerup",
    (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event?: Phaser.Types.Input.EventData,
    ) => {
      event?.stopPropagation();
      onClaim?.();
    },
  );

  button.add([shadow, background, buttonLabel, hitArea]);
  return button;
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
