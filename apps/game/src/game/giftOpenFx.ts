import Phaser from "phaser";

const openGiftFrameModules = import.meta.glob("../FX/open_gift/open-gift_*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const OPEN_GIFT_TEXTURE_PREFIX = "fx-open-gift";
const OPEN_GIFT_ANIMATION_KEY = "fx-open-gift-once";
const OPEN_GIFT_FRAME_RATE = 24;
const OPEN_GIFT_FRAME_SOURCE_WIDTH = 1087;
const OPEN_GIFT_FRAME_SOURCE_HEIGHT = 1145;
const OPEN_GIFT_BOX_FLOAT_DISTANCE = 12;
const OPEN_GIFT_LID_FLOAT_DISTANCE = 17;
const OPEN_GIFT_BOX_FLOAT_DURATION_MS = 1350;
const OPEN_GIFT_LID_FLOAT_DURATION_MS = 1750;
const OPEN_GIFT_LID_FLOAT_DELAY_MS = 720;
const OPEN_GIFT_LID_FRAME_NAME = "lid-final";
const OPEN_GIFT_BOX_FRAME_NAME = "box-final";
const OPEN_GIFT_LID_CROP = { x: 611, y: 100, width: 355, height: 283 };
const OPEN_GIFT_BOX_CROP = { x: 198, y: 702, width: 656, height: 359 };
const OPEN_GIFT_FRAME_KEYS = Object.keys(openGiftFrameModules)
  .map((path) => {
    const match = /open-gift_(\d+)\.png$/.exec(path);
    return match ? { frameKey: `open-gift_${match[1]}`, frameIndex: Number(match[1]) } : undefined;
  })
  .filter((frame): frame is { frameKey: string; frameIndex: number } => Boolean(frame))
  .sort((a, b) => a.frameIndex - b.frameIndex)
  .map((frame) => frame.frameKey);

export const GIFT_OPEN_DISPLAY_HEIGHT = 845;
export const GIFT_OPEN_DISPLAY_WIDTH = Math.round(
  (GIFT_OPEN_DISPLAY_HEIGHT * OPEN_GIFT_FRAME_SOURCE_WIDTH) / OPEN_GIFT_FRAME_SOURCE_HEIGHT,
);
export const GIFT_OPEN_POINTS_REVEAL_MS = 1050;

const OPEN_GIFT_SOURCE_TO_DISPLAY_SCALE = GIFT_OPEN_DISPLAY_HEIGHT / OPEN_GIFT_FRAME_SOURCE_HEIGHT;

function getGiftOpenTextureKey(frameKey: string) {
  return `${OPEN_GIFT_TEXTURE_PREFIX}-${frameKey}`;
}

function resolveGiftOpenFrameUrl(frameKey: string) {
  const assetPath = `../FX/open_gift/${frameKey}.png`;
  const match = openGiftFrameModules[assetPath];

  if (!match) {
    throw new Error(`Missing gift open popup frame: ${assetPath}`);
  }

  return match;
}

function ensureGiftOpenFinalFrames(scene: Phaser.Scene, textureKey: string) {
  const texture = scene.textures.get(textureKey);

  if (!texture.has(OPEN_GIFT_LID_FRAME_NAME)) {
    texture.add(
      OPEN_GIFT_LID_FRAME_NAME,
      0,
      OPEN_GIFT_LID_CROP.x,
      OPEN_GIFT_LID_CROP.y,
      OPEN_GIFT_LID_CROP.width,
      OPEN_GIFT_LID_CROP.height,
    );
  }

  if (!texture.has(OPEN_GIFT_BOX_FRAME_NAME)) {
    texture.add(
      OPEN_GIFT_BOX_FRAME_NAME,
      0,
      OPEN_GIFT_BOX_CROP.x,
      OPEN_GIFT_BOX_CROP.y,
      OPEN_GIFT_BOX_CROP.width,
      OPEN_GIFT_BOX_CROP.height,
    );
  }
}

function getCropDisplayX(crop: { x: number; width: number }) {
  return Math.round((crop.x + crop.width / 2 - OPEN_GIFT_FRAME_SOURCE_WIDTH / 2) * OPEN_GIFT_SOURCE_TO_DISPLAY_SCALE);
}

function getCropDisplayY(crop: { y: number; height: number }) {
  return Math.round((crop.y + crop.height / 2 - OPEN_GIFT_FRAME_SOURCE_HEIGHT / 2) * OPEN_GIFT_SOURCE_TO_DISPLAY_SCALE);
}

export function preloadGiftOpenFx(scene: Phaser.Scene) {
  if (OPEN_GIFT_FRAME_KEYS.length === 0) {
    return;
  }

  if (scene.textures.exists(getGiftOpenTextureKey(OPEN_GIFT_FRAME_KEYS[0]))) {
    return;
  }

  for (const frameKey of OPEN_GIFT_FRAME_KEYS) {
    scene.load.image(getGiftOpenTextureKey(frameKey), resolveGiftOpenFrameUrl(frameKey));
  }
}

export function ensureGiftOpenAnimation(scene: Phaser.Scene) {
  if (scene.anims.exists(OPEN_GIFT_ANIMATION_KEY)) {
    return OPEN_GIFT_ANIMATION_KEY;
  }

  scene.anims.create({
    key: OPEN_GIFT_ANIMATION_KEY,
    frames: OPEN_GIFT_FRAME_KEYS.map((frameKey) => ({
      key: getGiftOpenTextureKey(frameKey),
    })),
    frameRate: OPEN_GIFT_FRAME_RATE,
    repeat: 0,
  });

  return OPEN_GIFT_ANIMATION_KEY;
}

export function createGiftOpenBackground(scene: Phaser.Scene, x = 0, y = 0) {
  if (OPEN_GIFT_FRAME_KEYS.length === 0 || !scene.textures.exists(getGiftOpenTextureKey(OPEN_GIFT_FRAME_KEYS[0]))) {
    return undefined;
  }

  const firstFrameKey = OPEN_GIFT_FRAME_KEYS[0];
  const finalFrameKey = OPEN_GIFT_FRAME_KEYS[OPEN_GIFT_FRAME_KEYS.length - 1];
  const finalTextureKey = getGiftOpenTextureKey(finalFrameKey);
  const background = scene.add.container(x, y);
  const openingSprite = scene.add
    .sprite(0, 0, getGiftOpenTextureKey(firstFrameKey))
    .setDisplaySize(GIFT_OPEN_DISPLAY_WIDTH, GIFT_OPEN_DISPLAY_HEIGHT);
  const floatTweens: Phaser.Tweens.Tween[] = [];

  background.add(openingSprite);
  openingSprite.play(ensureGiftOpenAnimation(scene));
  openingSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
    if (!background.active) {
      return;
    }

    ensureGiftOpenFinalFrames(scene, finalTextureKey);

    const boxY = getCropDisplayY(OPEN_GIFT_BOX_CROP);
    const lidY = getCropDisplayY(OPEN_GIFT_LID_CROP);
    const box = scene.add
      .image(getCropDisplayX(OPEN_GIFT_BOX_CROP), boxY, finalTextureKey, OPEN_GIFT_BOX_FRAME_NAME)
      .setDisplaySize(
        OPEN_GIFT_BOX_CROP.width * OPEN_GIFT_SOURCE_TO_DISPLAY_SCALE,
        OPEN_GIFT_BOX_CROP.height * OPEN_GIFT_SOURCE_TO_DISPLAY_SCALE,
      );
    const lid = scene.add
      .image(getCropDisplayX(OPEN_GIFT_LID_CROP), lidY, finalTextureKey, OPEN_GIFT_LID_FRAME_NAME)
      .setDisplaySize(
        OPEN_GIFT_LID_CROP.width * OPEN_GIFT_SOURCE_TO_DISPLAY_SCALE,
        OPEN_GIFT_LID_CROP.height * OPEN_GIFT_SOURCE_TO_DISPLAY_SCALE,
      );

    openingSprite.setVisible(false);
    background.add([box, lid]);
    floatTweens.push(
      scene.tweens.add({
        targets: box,
        y: boxY - OPEN_GIFT_BOX_FLOAT_DISTANCE,
        duration: OPEN_GIFT_BOX_FLOAT_DURATION_MS,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      }),
      scene.tweens.add({
        targets: lid,
        y: lidY - OPEN_GIFT_LID_FLOAT_DISTANCE,
        duration: OPEN_GIFT_LID_FLOAT_DURATION_MS,
        delay: OPEN_GIFT_LID_FLOAT_DELAY_MS,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      }),
    );
  });
  background.once(Phaser.GameObjects.Events.DESTROY, () => {
    for (const tween of floatTweens) {
      tween.remove();
    }
  });

  return background;
}
