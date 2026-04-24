import Phaser from "phaser";
import type { GameLayout } from "../runtimeEnvironment";
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
import { DesktopMainScene } from "./scenes/desktop/DesktopMainScene";
import { DesktopWheelScene } from "./scenes/desktop/DesktopWheelScene";
import {
  COLORS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  configureStageLayout,
} from "./constants";

export function createLuckyWheelGame(parent: string, layout: GameLayout = "mobile") {
  configureStageLayout(layout);

  const scenes =
    layout === "desktop"
      ? [
          BootScene,
          PreloadScene,
          DesktopMainScene,
          DesktopWheelScene,
          HistoryOverlayScene,
          ErrorOverlayScene,
        ]
      : [
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
        ];

  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    backgroundColor: `#${COLORS.pageTop.toString(16).padStart(6, "0")}`,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter:
        layout === "desktop" ? Phaser.Scale.CENTER_BOTH : Phaser.Scale.NO_CENTER,
    },
    scene: scenes,
    render: {
      antialias: true,
      pixelArt: false,
    },
  });
}
