import Phaser from "phaser";
import winUiAnimationPack from "../FX/win_ui/win_ui_an.json";

const winUiFrameModules = import.meta.glob("../FX/win_ui/WIN_UI*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const WIN_UI_TEXTURE_PREFIX = "fx-win-ui";
const WIN_UI_ANIMATION_KEY = "fx-win-ui-loop";
const WIN_UI_ANIMATION = winUiAnimationPack.anims[0];
const WIN_UI_FRAME_KEYS = WIN_UI_ANIMATION.frames.map((frame) => frame.key);
const WIN_UI_FRAME_RATE = WIN_UI_ANIMATION.frameRate;

export const WIN_UI_DISPLAY_SIZE = 845;

function getWinUiTextureKey(frameKey: string) {
  return `${WIN_UI_TEXTURE_PREFIX}-${frameKey}`;
}

function resolveWinUiFrameUrl(frameKey: string) {
  const assetPath = `../FX/win_ui/${frameKey}.png`;
  const match = winUiFrameModules[assetPath];

  if (!match) {
    throw new Error(`Missing winning popup frame: ${assetPath}`);
  }

  return match;
}

export function preloadWinUiFx(scene: Phaser.Scene) {
  if (scene.textures.exists(getWinUiTextureKey(WIN_UI_FRAME_KEYS[0]))) {
    return;
  }

  for (const frameKey of WIN_UI_FRAME_KEYS) {
    scene.load.image(getWinUiTextureKey(frameKey), resolveWinUiFrameUrl(frameKey));
  }
}

export function ensureWinUiAnimation(scene: Phaser.Scene) {
  if (scene.anims.exists(WIN_UI_ANIMATION_KEY)) {
    return WIN_UI_ANIMATION_KEY;
  }

  scene.anims.create({
    key: WIN_UI_ANIMATION_KEY,
    frames: WIN_UI_FRAME_KEYS.map((frameKey) => ({
      key: getWinUiTextureKey(frameKey),
    })),
    frameRate: WIN_UI_FRAME_RATE,
    repeat: -1,
  });

  return WIN_UI_ANIMATION_KEY;
}

export function createWinUiBackground(scene: Phaser.Scene, x = 0, y = 0) {
  if (!scene.textures.exists(getWinUiTextureKey(WIN_UI_FRAME_KEYS[0]))) {
    return undefined;
  }

  const background = scene.add
    .sprite(x, y, getWinUiTextureKey(WIN_UI_FRAME_KEYS[0]))
    .setDisplaySize(WIN_UI_DISPLAY_SIZE, WIN_UI_DISPLAY_SIZE);

  background.play(ensureWinUiAnimation(scene));
  return background;
}
