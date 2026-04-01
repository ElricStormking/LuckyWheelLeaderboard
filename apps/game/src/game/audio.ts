import Phaser from "phaser";

const audioModules = import.meta.glob("../audio/*.{mp3,ogg,wav,m4a}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export const AUDIO_KEYS = {
  backgroundMusic: "bgm-lucky-wheel",
  winningEffect: "sfx-lucky-win",
} as const;

const BACKGROUND_MUSIC_FILE = "BGM_luckywheel.mp3";
const WINNING_EFFECT_FILE = "lucky_win.mp3";
const BACKGROUND_MUSIC_VOLUME = 0.28;
const WINNING_EFFECT_VOLUME = 0.9;

function resolveAudioUrl(fileName: string) {
  const match = Object.entries(audioModules).find(([path]) =>
    path.endsWith(`/${fileName}`),
  );

  if (!match) {
    throw new Error(`Missing game audio asset: ${fileName}`);
  }

  return match[1];
}

export function preloadGameAudio(scene: Phaser.Scene) {
  if (!scene.cache.audio.exists(AUDIO_KEYS.backgroundMusic)) {
    scene.load.audio(
      AUDIO_KEYS.backgroundMusic,
      resolveAudioUrl(BACKGROUND_MUSIC_FILE),
    );
  }

  if (!scene.cache.audio.exists(AUDIO_KEYS.winningEffect)) {
    scene.load.audio(
      AUDIO_KEYS.winningEffect,
      resolveAudioUrl(WINNING_EFFECT_FILE),
    );
  }
}

export function ensureBackgroundMusic(scene: Phaser.Scene) {
  const tryPlay = () => {
    const existing =
      (scene.sound.get(AUDIO_KEYS.backgroundMusic) as Phaser.Sound.BaseSound | null) ??
      scene.sound.add(AUDIO_KEYS.backgroundMusic, {
        loop: true,
        volume: BACKGROUND_MUSIC_VOLUME,
      });

    if (!existing.isPlaying) {
      existing.play({
        loop: true,
        volume: BACKGROUND_MUSIC_VOLUME,
      });
    }
  };

  try {
    tryPlay();
  } catch {
    // Mobile browsers may require a user gesture before audio can start.
  }

  const unlockMusic = () => {
    try {
      tryPlay();
    } catch {
      // Ignore autoplay rejections; another interaction can retry later.
    }
  };

  scene.input.once(Phaser.Input.Events.POINTER_DOWN, unlockMusic);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.off(Phaser.Input.Events.POINTER_DOWN, unlockMusic);
  });
}

export function playWinningEffect(scene: Phaser.Scene) {
  scene.sound.stopByKey(AUDIO_KEYS.winningEffect);
  scene.sound.play(AUDIO_KEYS.winningEffect, {
    volume: WINNING_EFFECT_VOLUME,
  });
}
