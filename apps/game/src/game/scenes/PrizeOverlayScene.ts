import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { FONTS, SCENE_KEYS } from "../constants";

const PRIZE_BADGE_KEYS = [
  "Prize_Ranking_01",
  "Prize_Ranking_02",
  "Prize_Ranking_03",
  "Prize_Ranking_04",
  "Prize_Ranking_05",
] as const;

export class PrizeOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.PrizeOverlay);
  }

  create() {
    const frame = this.createFrame("", undefined, 1260);
    this.add.image(540, frame.top - 88, "Title_PrizeArea").setScale(1);

    const prizes = prototypeState.getSnapshot().prizes;
    const rewardXs = [700, 380, 700, 380, 700];
    const badgeXs = [250, 830, 250, 830, 250];

    prizes.forEach((prize, index) => {
      const y = frame.top + 74 + index * 184;
      this.add.image(badgeXs[index], y, PRIZE_BADGE_KEYS[index]).setScale(0.92);
      this.add.image(rewardXs[index], y, "Prize_RewardZone").setScale(0.88);
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
    });
  }
}
