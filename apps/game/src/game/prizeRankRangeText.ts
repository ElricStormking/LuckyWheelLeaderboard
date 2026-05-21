import Phaser from "phaser";
import { FONTS } from "./constants";

export type PrizeRankRangeText = {
  container: Phaser.GameObjects.Container;
  setRange: (rankFrom: number, rankTo: number) => void;
  setVisible: (visible: boolean) => void;
};

const RANK_TEXT_BLUE = "#08a8df";
const RANK_TEXT_BLUE_VALUE = 0x08a8df;
const RANK_TEXT_BLACK = "#05070a";
const RANK_NUMBER_ITALIC_RIGHT_PADDING = 24;

function getOrdinalSuffix(rank: number) {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return "th";
  }

  switch (rank % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function getRankNumberFontSize(rank: number) {
  return Math.abs(rank) >= 10 ? "86px" : "96px";
}

function getRankLineLayout(rank: number) {
  return Math.abs(rank) >= 10
    ? { rankRightX: 14, suffixX: 24 }
    : { rankRightX: -12, suffixX: -3 };
}

export function createPrizeRankRangeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  scale = 1,
): PrizeRankRangeText {
  const container = scene.add.container(x, y).setScale(scale);

  const cover = scene.add.rectangle(0, 2, 238, 226, 0xffffff, 1);
  const topRank = scene.add
    .text(-8, -62, "", {
      fontFamily: FONTS.display,
      fontSize: "96px",
      fontStyle: "900 italic",
      color: RANK_TEXT_BLUE,
      align: "right",
    })
    .setPadding(0, 0, RANK_NUMBER_ITALIC_RIGHT_PADDING, 0)
    .setOrigin(1, 0.5);
  const topSuffix = scene.add
    .text(-1, -43, "", {
      fontFamily: FONTS.body,
      fontSize: "42px",
      fontStyle: "900",
      color: RANK_TEXT_BLACK,
    })
    .setOrigin(0, 0.5);
  const dash = scene.add.rectangle(0, -3, 10, 34, RANK_TEXT_BLUE_VALUE, 1).setAngle(8);
  const bottomRank = scene.add
    .text(-8, 58, "", {
      fontFamily: FONTS.display,
      fontSize: "86px",
      fontStyle: "900 italic",
      color: RANK_TEXT_BLUE,
      align: "right",
    })
    .setPadding(0, 0, RANK_NUMBER_ITALIC_RIGHT_PADDING, 0)
    .setOrigin(1, 0.5);
  const bottomSuffix = scene.add
    .text(-1, 76, "", {
      fontFamily: FONTS.body,
      fontSize: "42px",
      fontStyle: "900",
      color: RANK_TEXT_BLACK,
    })
    .setOrigin(0, 0.5);

  container.add([cover, topRank, topSuffix, dash, bottomRank, bottomSuffix]);

  return {
    container,
    setRange(rankFrom, rankTo) {
      const topLayout = getRankLineLayout(rankFrom);
      const bottomLayout = getRankLineLayout(rankTo);
      topRank
        .setX(topLayout.rankRightX + RANK_NUMBER_ITALIC_RIGHT_PADDING)
        .setText(String(rankFrom))
        .setFontSize(getRankNumberFontSize(rankFrom));
      topSuffix.setX(topLayout.suffixX).setText(getOrdinalSuffix(rankFrom));
      bottomRank
        .setX(bottomLayout.rankRightX + RANK_NUMBER_ITALIC_RIGHT_PADDING)
        .setText(String(rankTo))
        .setFontSize(getRankNumberFontSize(rankTo));
      bottomSuffix.setX(bottomLayout.suffixX).setText(getOrdinalSuffix(rankTo));
    },
    setVisible(visible) {
      container.setVisible(visible);
    },
  };
}
