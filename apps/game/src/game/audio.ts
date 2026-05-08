import Phaser from "phaser";

export const AUDIO_KEYS = {
  spinningEffect: "sfx-lucky-spin",
  winningEffect: "sfx-lucky-win",
} as const;

const SPINNING_EFFECT_URL = new URL("../audio/lucky_spin.aac", import.meta.url).href;
const WINNING_EFFECT_URL = new URL("../audio/lucky_win.aac", import.meta.url).href;
const SPINNING_EFFECT_VOLUME = 0.5;
const WINNING_EFFECT_VOLUME = 0.62;

export function preloadGameAudio(scene: Phaser.Scene) {
  if (!scene.cache.audio.exists(AUDIO_KEYS.spinningEffect)) {
    scene.load.audio(AUDIO_KEYS.spinningEffect, SPINNING_EFFECT_URL);
  }

  if (!scene.cache.audio.exists(AUDIO_KEYS.winningEffect)) {
    scene.load.audio(AUDIO_KEYS.winningEffect, WINNING_EFFECT_URL);
  }
}

export function playSpinningEffect(scene: Phaser.Scene) {
  scene.sound.stopByKey(AUDIO_KEYS.spinningEffect);
  scene.sound.play(AUDIO_KEYS.spinningEffect, {
    loop: true,
    volume: SPINNING_EFFECT_VOLUME,
  });
}

export function stopSpinningEffect(scene: Phaser.Scene) {
  scene.sound.stopByKey(AUDIO_KEYS.spinningEffect);
}

export function playWinningEffect(scene: Phaser.Scene) {
  scene.sound.stopByKey(AUDIO_KEYS.winningEffect);
  scene.sound.play(AUDIO_KEYS.winningEffect, {
    volume: WINNING_EFFECT_VOLUME,
  });
}
