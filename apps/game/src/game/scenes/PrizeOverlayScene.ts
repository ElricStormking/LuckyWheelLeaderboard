import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { FONTS, SCENE_KEYS } from "../constants";
import { syncPrizeArtImage } from "../prizeImageLoader";

const PRIZE_BADGE_KEYS = [
  "Prize_Ranking_01",
  "Prize_Ranking_02",
  "Prize_Ranking_03",
  "Prize_Ranking_04",
  "Prize_Ranking_05",
] as const;

const PRIZE_ROW_SCALE = 0.88;
const PRIZE_ROW_GAP = 18;
const PRIZE_BADGE_VISUAL_WIDTH = 287 * PRIZE_ROW_SCALE;
const PRIZE_REWARD_VISUAL_WIDTH = 601 * PRIZE_ROW_SCALE;
const PRIZE_ROW_LEFT = 540 - (PRIZE_BADGE_VISUAL_WIDTH + PRIZE_ROW_GAP + PRIZE_REWARD_VISUAL_WIDTH) / 2;
const PRIZE_BADGE_LEFT_OVERHANG = (145 - 2) * PRIZE_ROW_SCALE;
const PRIZE_REWARD_LEFT_OVERHANG = (312 - 14) * PRIZE_ROW_SCALE;

const leftBadgeX = PRIZE_ROW_LEFT + PRIZE_BADGE_LEFT_OVERHANG;
const leftRewardX = PRIZE_ROW_LEFT + PRIZE_BADGE_VISUAL_WIDTH + PRIZE_ROW_GAP + PRIZE_REWARD_LEFT_OVERHANG;
const rightRewardX = PRIZE_ROW_LEFT + PRIZE_REWARD_LEFT_OVERHANG;
const rightBadgeX = PRIZE_ROW_LEFT + PRIZE_REWARD_VISUAL_WIDTH + PRIZE_ROW_GAP + PRIZE_BADGE_LEFT_OVERHANG;

export class PrizeOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.PrizeOverlay);
  }

  create() {
    const frame = this.createFrame("", undefined, 1260);
    this.add.image(540, frame.top - 88, "Title_PrizeArea").setScale(1);

    const prizes = prototypeState.getSnapshot().prizes;
    const rewardXs = [leftRewardX, rightRewardX, leftRewardX, rightRewardX, leftRewardX];
    const badgeXs = [leftBadgeX, rightBadgeX, leftBadgeX, rightBadgeX, leftBadgeX];

    prizes.forEach((prize, index) => {
      const y = frame.top + 74 + index * 184;
      this.add.image(badgeXs[index], y, PRIZE_BADGE_KEYS[index]).setScale(PRIZE_ROW_SCALE);
      const rewardZone = this.add.image(rewardXs[index], y, "Prize_RewardZone").setScale(PRIZE_ROW_SCALE);
      const prizeArt = this.add
        .image(rewardXs[index], y, "Prize_RewardZone")
        .setVisible(false);
      const isRightAligned = index % 2 === 1;
      const textX = rewardXs[index] + (isRightAligned ? 156 : -156);
      const origin = isRightAligned ? 1 : 0;

      this.add
        .text(textX, y - 20, prize.prizeLabel, {
          fontFamily: FONTS.display,
          fontSize: "30px",
          fontStyle: "700",
          color: "#ffffff",
          align: isRightAligned ? "right" : "left",
        })
        .setOrigin(origin, 0.5);

      this.add
        .text(textX, y + 22, prize.prizeDescription || prize.accentLabel || prototypeState.t("prize.defaultAccent"), {
          fontFamily: FONTS.body,
          fontSize: "18px",
          fontStyle: "700",
          color: "#0a2942",
          align: isRightAligned ? "right" : "left",
          wordWrap: { width: 260, useAdvancedWrap: true },
        })
        .setOrigin(origin, 0.5);

      rewardZone.setAlpha(prize.imageUrl ? 0.28 : 1);
      syncPrizeArtImage(this, prizeArt, prize.imageUrl, 180, 118);
    });
  }
}
