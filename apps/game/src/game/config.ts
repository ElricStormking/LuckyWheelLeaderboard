import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { ErrorOverlayScene } from "./scenes/ErrorOverlayScene";
import { HistoryOverlayScene } from "./scenes/HistoryOverlayScene";
import { LeaderboardOverlayScene } from "./scenes/LeaderboardOverlayScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { LocaleOverlayScene } from "./scenes/LocaleOverlayScene";
import { PeriodOverlayScene } from "./scenes/PeriodOverlayScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { PrizeOverlayScene } from "./scenes/PrizeOverlayScene";
import { ResultPopupScene } from "./scenes/ResultPopupScene";
import { RulesOverlayScene } from "./scenes/RulesOverlayScene";
import { WheelScene } from "./scenes/WheelScene";
import { COLORS, STAGE_HEIGHT, STAGE_WIDTH } from "./constants";

export function createLuckyWheelGame(parent: string) {
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    backgroundColor: `#${COLORS.pageTop.toString(16).padStart(6, "0")}`,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [
      BootScene,
      PreloadScene,
      LobbyScene,
      WheelScene,
      LocaleOverlayScene,
      PeriodOverlayScene,
      LeaderboardOverlayScene,
      PrizeOverlayScene,
      RulesOverlayScene,
      HistoryOverlayScene,
      ResultPopupScene,
      ErrorOverlayScene,
    ],
    render: {
      antialias: true,
      pixelArt: false,
    },
  });
}
