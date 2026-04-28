import Phaser from "phaser";
import { PlatformLinkType } from "@lucky-wheel/contracts";
import { prototypeState } from "../../state/prototype-state";
import { SCENE_KEYS } from "../../constants";

export const DESKTOP_PAGE_CENTER_X = 960;
export const DESKTOP_PAGE_CENTER_Y = 540;

export const DESKTOP_RANKING_PLATE_KEYS = [
  "Desktop_RankingPlate_01",
  "Desktop_RankingPlate_02",
  "Desktop_RankingPlate_03",
  "Desktop_RankingPlate_04",
  "Desktop_RankingPlate_05",
  "Desktop_RankingPlate_06",
  "Desktop_RankingPlate_07",
  "Desktop_RankingPlate_08",
  "Desktop_RankingPlate_09",
  "Desktop_RankingPlate_10",
  "Desktop_RankingPlate_11",
  "Desktop_RankingPlate_12",
  "Desktop_RankingPlate_13",
  "Desktop_RankingPlate_14",
  "Desktop_RankingPlate_15",
  "Desktop_RankingPlate_16",
  "Desktop_RankingPlate_17",
  "Desktop_RankingPlate_18",
  "Desktop_RankingPlate_19",
  "Desktop_RankingPlate_20",
  "Desktop_RankingPlate_21",
  "Desktop_RankingPlate_22",
  "Desktop_RankingPlate_23",
  "Desktop_RankingPlate_24",
  "Desktop_RankingPlate_25",
  "Desktop_RankingPlate_26",
  "Desktop_RankingPlate_27",
  "Desktop_RankingPlate_28",
  "Desktop_RankingPlate_29",
  "Desktop_RankingPlate_30",
] as const;

const DESKTOP_RANKING_PRIZE_BADGE_SOURCE_OFFSETS = [
  { x: -890, y: 104 },
  { x: -890, y: 99.5 },
  { x: -890, y: 99.5 },
  { x: -890, y: 104 },
  { x: -890, y: 107.5 },
  { x: -890, y: 107.5 },
  { x: -890, y: 118 },
  { x: -882, y: 113.5 },
  { x: -890, y: 112 },
  { x: -890, y: 102 },
  { x: -857, y: 135 },
  { x: -884.5, y: 105.5 },
  { x: -890, y: 102 },
  { x: -856, y: 120.5 },
  { x: -865, y: 113 },
  { x: -890, y: 70.5 },
  { x: -890, y: 104.5 },
  { x: -874.5, y: 112.5 },
  { x: -871, y: 104.5 },
  { x: -865.5, y: 150.5 },
  { x: -865.5, y: 150.5 },
  { x: -865.5, y: 150.5 },
  { x: -865.5, y: 150.5 },
  { x: -865.5, y: 150.5 },
  { x: -865.5, y: 150.5 },
  { x: -865.5, y: 150.5 },
  { x: -865.5, y: 150.5 },
  { x: -865.5, y: 150.5 },
  { x: -865.5, y: 150.5 },
  { x: -865.5, y: 150.5 },
] as const;

const DESKTOP_RANKING_NOT_LISTED_PRIZE_BADGE_SOURCE_OFFSET = { x: -591, y: 109.5 } as const;

export const DESKTOP_RANKING_BUTTON_KEYS = [
  "Desktop_RankingButton_01",
  "Desktop_RankingButton_02",
  "Desktop_RankingButton_03",
  "Desktop_RankingButton_04",
] as const;

export const DESKTOP_PRIZE_BADGE_KEYS = [
  "Desktop_PrizeBadge_01",
  "Desktop_PrizeBadge_02",
  "Desktop_PrizeBadge_03",
  "Desktop_PrizeBadge_04",
  "Desktop_PrizeBadge_05",
] as const;

export function getDesktopPlatformLinkUrl(type: PlatformLinkType) {
  if (type === PlatformLinkType.Deposit) {
    return prototypeState.getDepositUrl();
  }

  return prototypeState
    .getSnapshot()
    .currentEvent?.platformLinks.find((link) => link.type === type)?.url;
}

export function wireImageButton(
  image: Phaser.GameObjects.Image,
  baseScale: number | { x: number; y: number },
  onClick: () => void,
  hoverScaleMultiplier = 1.04,
) {
  const baseScaleX = typeof baseScale === "number" ? baseScale : baseScale.x;
  const baseScaleY = typeof baseScale === "number" ? baseScale : baseScale.y;

  image.setInteractive({ useHandCursor: true });
  image.on("pointerover", () => {
    image.setScale(baseScaleX * hoverScaleMultiplier, baseScaleY * hoverScaleMultiplier);
  });
  image.on("pointerout", () => {
    image.setScale(baseScaleX, baseScaleY);
  });
  image.on("pointerup", onClick);
}

export function getDesktopRankingPrizeTextPosition(
  plate: Phaser.GameObjects.Image,
  rank: number,
) {
  const sourceOffset =
    DESKTOP_RANKING_PRIZE_BADGE_SOURCE_OFFSETS[rank - 1] ??
    DESKTOP_RANKING_NOT_LISTED_PRIZE_BADGE_SOURCE_OFFSET;

  return {
    x: plate.x + sourceOffset.x * plate.scaleX,
    y: plate.y + sourceOffset.y * plate.scaleY,
  };
}

export function navigateToDesktopPage(scene: Phaser.Scene, targetKey: string) {
  if (targetKey !== SCENE_KEYS.DesktopMain && scene.scene.isActive(SCENE_KEYS.DesktopWheel)) {
    scene.scene.stop(SCENE_KEYS.DesktopWheel);
  }

  scene.scene.start(targetKey);
}
