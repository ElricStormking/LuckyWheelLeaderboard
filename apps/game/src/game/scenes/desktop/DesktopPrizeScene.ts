import Phaser from "phaser";
import { FONTS, SCENE_KEYS } from "../../constants";
import { syncPrizeArtImage } from "../../prizeImageLoader";
import { prototypeState } from "../../state/prototype-state";
import { DesktopPageScene } from "./DesktopPageScene";
import { DESKTOP_PRIZE_BADGE_KEYS } from "./desktopSceneShared";

const PRIZE_ROWS = [
  { badgeX: 672, rewardX: 1100, y: 296, badgeScale: 0.92, rewardScale: 0.92, align: "left" as const },
  { badgeX: 1248, rewardX: 820, y: 522, badgeScale: 0.92, rewardScale: 0.92, align: "right" as const },
  { badgeX: 672, rewardX: 1100, y: 748, badgeScale: 0.92, rewardScale: 0.92, align: "left" as const },
  { badgeX: 1248, rewardX: 820, y: 974, badgeScale: 0.92, rewardScale: 0.92, align: "right" as const },
  { badgeX: 672, rewardX: 1100, y: 1200, badgeScale: 0.92, rewardScale: 0.92, align: "left" as const },
] as const;

export class DesktopPrizeScene extends DesktopPageScene {
  private prizeContent?: Phaser.GameObjects.Container;

  constructor() {
    super(SCENE_KEYS.DesktopPrize);
  }

  create() {
    this.drawDesktopPageBackground();
    this.add.image(993, 71, "Desktop_PrizeTitle");
    this.addDesktopPageArrows(SCENE_KEYS.DesktopRanking, SCENE_KEYS.DesktopMain);
    this.prizeContent = this.add.container(0, 0);
    this.bindPrototypeLifecycle(() => this.refreshPrizeRows());
    this.refreshPrizeRows();
  }

  private refreshPrizeRows() {
    this.prizeContent?.removeAll(true);

    const prizes = prototypeState.getSnapshot().prizes;

    PRIZE_ROWS.forEach((row, index) => {
      const prize = prizes[index];
      if (!prize) {
        return;
      }

      const badge = this.add
        .image(row.badgeX, row.y, DESKTOP_PRIZE_BADGE_KEYS[index])
        .setScale(row.badgeScale);
      const reward = this.add
        .image(row.rewardX, row.y, "Desktop_PrizeRewardZone")
        .setScale(row.rewardScale);
      const prizeArt = this.add
        .image(row.rewardX, row.y, "Desktop_PrizeRewardZone")
        .setVisible(false);
      this.prizeContent?.add([badge, reward, prizeArt]);

      const isRightAligned = row.align === "right";
      const textX = row.rewardX + (isRightAligned ? 156 : -156);
      const origin = isRightAligned ? 1 : 0;

      const label = this.add
        .text(textX, row.y - 22, prize.prizeLabel, {
          fontFamily: FONTS.display,
          fontSize: index === 0 ? "32px" : "28px",
          fontStyle: "700",
          color: "#ffffff",
          align: isRightAligned ? "right" : "left",
        })
        .setOrigin(origin, 0.5);
      this.prizeContent?.add(label);

      const description = this.add
        .text(
          textX,
          row.y + 18,
          prize.prizeDescription || prize.accentLabel || prototypeState.t("prize.defaultAccent"),
          {
            fontFamily: FONTS.body,
            fontSize: "18px",
            fontStyle: "700",
            color: "#0a2942",
            align: isRightAligned ? "right" : "left",
            wordWrap: { width: index === 0 ? 290 : 250, useAdvancedWrap: true },
          },
        )
        .setOrigin(origin, 0.5);
      this.prizeContent?.add(description);

      reward.setAlpha(prize.imageUrl ? 0.28 : 1);
      syncPrizeArtImage(this, prizeArt, prize.imageUrl, 220, 138);
    });
  }
}
