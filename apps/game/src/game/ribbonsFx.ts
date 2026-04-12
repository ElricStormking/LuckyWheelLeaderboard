import Phaser from "phaser";
import ribbonsSpriteSheetUrl from "../FX/ribbons/ribbons.png";

const RIBBONS_TEXTURE_KEY = "fx-ribbons";
const RIBBONS_ANIMATION_KEY = "fx-ribbons-burst";
const RIBBONS_FRAME_WIDTH = 455;
const RIBBONS_FRAME_HEIGHT = 356;
const RIBBONS_LAST_FRAME = 26;
const RIBBONS_FRAME_RATE = 24;
const BASE_RIBBONS_DISPLAY_WIDTH = 1058 * 0.52;
const BASE_RIBBONS_DISPLAY_HEIGHT = 829 * 0.52;

export function preloadRibbonsFx(scene: Phaser.Scene) {
  if (scene.textures.exists(RIBBONS_TEXTURE_KEY)) {
    return;
  }

  scene.load.spritesheet(RIBBONS_TEXTURE_KEY, ribbonsSpriteSheetUrl, {
    frameWidth: RIBBONS_FRAME_WIDTH,
    frameHeight: RIBBONS_FRAME_HEIGHT,
    startFrame: 0,
    endFrame: RIBBONS_LAST_FRAME,
  });
}

function ensureRibbonsAnimation(scene: Phaser.Scene) {
  if (scene.anims.exists(RIBBONS_ANIMATION_KEY)) {
    return;
  }

  scene.anims.create({
    key: RIBBONS_ANIMATION_KEY,
    frames: scene.anims.generateFrameNumbers(RIBBONS_TEXTURE_KEY, {
      start: 0,
      end: RIBBONS_LAST_FRAME,
    }),
    frameRate: RIBBONS_FRAME_RATE,
    repeat: 0,
    hideOnComplete: true,
  });
}

type RibbonsBurstOptions = {
  depth?: number;
  scale?: number;
  alpha?: number;
};

export function createRibbonsBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: RibbonsBurstOptions = {},
) {
  if (!scene.textures.exists(RIBBONS_TEXTURE_KEY)) {
    return undefined;
  }

  ensureRibbonsAnimation(scene);

  const ribbon = scene.add
    .sprite(x, y, RIBBONS_TEXTURE_KEY, 0)
    .setDisplaySize(
      BASE_RIBBONS_DISPLAY_WIDTH * (options.scale ?? 1),
      BASE_RIBBONS_DISPLAY_HEIGHT * (options.scale ?? 1),
    )
    .setAlpha(options.alpha ?? 1)
    .setRotation(Phaser.Math.FloatBetween(-Math.PI, Math.PI))
    .setFlipX(Phaser.Math.Between(0, 1) === 1)
    .setFlipY(Phaser.Math.Between(0, 4) === 0);

  if (options.depth !== undefined) {
    ribbon.setDepth(options.depth);
  }

  ribbon.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
    ribbon.destroy();
  });

  ribbon.play(RIBBONS_ANIMATION_KEY);
  return ribbon;
}
