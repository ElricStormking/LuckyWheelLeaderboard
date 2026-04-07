import Phaser from "phaser";
import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import {
  addRoundedPanel,
  formatCountdownDuration,
  formatDate,
  formatNumber,
  getNextLeaderboardRefreshRemainingMs,
  maskLeaderboardPlayerName,
} from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

type RankPalette = {
  fill: number;
  shadow: number;
  stripe: number;
  pillFill: number;
  rankColor: string;
  suffixColor: string;
  amountColor: string;
};

export class LeaderboardOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.LeaderboardOverlay);
  }

  create() {
    const snapshot = prototypeState.getSnapshot();
    const isPending =
      snapshot.currentEvent?.status === "ended" &&
      snapshot.leaderboard?.resultsVisible === false;
    const subtitle = isPending
      ? prototypeState.t("leaderboard.pendingSubtitle")
      : snapshot.currentEvent?.status === "live"
        ? prototypeState.t("leaderboard.liveSubtitle")
        : prototypeState.t("leaderboard.archiveSubtitle");
    const frame = this.createFrame(
      "",
      undefined,
      1360,
    );

    this.add.image(540, frame.top - 92, "Title_Ranking").setScale(0.78);
    this.add
      .text(540, frame.top - 18, subtitle, {
        fontFamily: FONTS.body,
        fontSize: "22px",
        color: "#62839b",
        align: "center",
        wordWrap: { width: 760, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
    this.add.image(540, frame.top + 58, "Divider").setScale(0.84);

    if (isPending) {
      addRoundedPanel(this, 540, (frame.top + frame.bottom) / 2, 820, 220, {
        fillColor: COLORS.white,
        radius: 36,
      });

      this.add
        .text(540, (frame.top + frame.bottom) / 2, snapshot.leaderboard?.pendingMessage ?? "-", {
          fontFamily: FONTS.body,
          fontSize: "30px",
          color: "#5d7d97",
          align: "center",
          wordWrap: { width: 660, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
      return;
    }

    const rows = snapshot.leaderboard?.leaderboard.slice(0, 30) ?? [];
    const headerY = frame.top + 92;
    const scrollViewportTop = frame.top + 164;
    const scrollViewportHeight = 736;
    const rowSpacing = 92;
    const rowHeight = 76;
    const contentHeight = Math.max(rowHeight, (rows.length - 1) * rowSpacing + rowHeight);
    const maxScroll = Math.max(0, contentHeight - scrollViewportHeight);
    const scrollBounds = new Phaser.Geom.Rectangle(
      frame.left,
      scrollViewportTop,
      860,
      scrollViewportHeight,
    );
    let scrollOffset = 0;

    this.add
      .text(frame.left + 78, headerY, "Rank", {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "700",
        color: "#12a2ea",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(frame.left + 300, headerY, "Username", {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "700",
        color: "#12a2ea",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(frame.right - 8, headerY, "Total Points", {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "700",
        color: "#12a2ea",
      })
      .setOrigin(1, 0.5);

    const divider = this.add.graphics();
    divider.lineStyle(2, COLORS.line, 0.95);
    divider.lineBetween(frame.left, frame.top + 92, frame.right, frame.top + 92);

    const rowsContainer = this.add.container(0, scrollViewportTop);
    const maskGraphics = this.add.graphics();
    maskGraphics.fillStyle(COLORS.white, 1);
    maskGraphics.fillRect(
      scrollBounds.x,
      scrollBounds.y,
      scrollBounds.width,
      scrollBounds.height,
    );
    maskGraphics.setVisible(false);
    rowsContainer.setMask(maskGraphics.createGeometryMask());

    rows.forEach((entry, index) => {
      const y = rowHeight / 2 + index * rowSpacing;
      const rowPanel = addRoundedPanel(this, 540, y, 860, rowHeight, {
        fillColor: entry.isSelf ? 0xe7f8ff : COLORS.white,
        radius: 26,
      });
      rowsContainer.add(rowPanel);

      const rankRibbon = this.addRankRibbon(
        frame.left + 116,
        y,
        entry.rank,
        entry.prizeName ?? "RM 88",
      );
      rowsContainer.add(rankRibbon);

      const playerText = this.add
        .text(frame.left + 300, y, maskLeaderboardPlayerName(entry.playerName, entry.isSelf), {
          fontFamily: FONTS.body,
          fontSize: "30px",
          fontStyle: entry.isSelf ? "700" : "600",
          color: "#0a2942",
        })
        .setOrigin(0, 0.5);
      rowsContainer.add(playerText);

      const scoreText = this.add
        .text(frame.right - 20, y, formatNumber(entry.score, snapshot.locale), {
          fontFamily: FONTS.display,
          fontSize: "30px",
          fontStyle: "700",
          color: "#10a7eb",
        })
        .setOrigin(1, 0.5);
      rowsContainer.add(scoreText);
    });

    const scrollbarTrack = this.add.graphics();
    const scrollbarThumb = this.add.graphics();
    const updateScrollbar = () => {
      scrollbarTrack.clear();
      scrollbarThumb.clear();

      if (maxScroll <= 0) {
        return;
      }

      const trackX = frame.right - 8;
      scrollbarTrack.fillStyle(0xdff1fb, 0.96);
      scrollbarTrack.fillRoundedRect(trackX, scrollViewportTop, 10, scrollViewportHeight, 5);

      const thumbHeight = Math.max(
        84,
        (scrollViewportHeight * scrollViewportHeight) / contentHeight,
      );
      const progress = scrollOffset / maxScroll;
      const thumbY = scrollViewportTop + (scrollViewportHeight - thumbHeight) * progress;
      scrollbarThumb.fillStyle(0x18a9ef, 0.98);
      scrollbarThumb.fillRoundedRect(trackX - 1, thumbY, 12, thumbHeight, 6);
    };

    const setScrollOffset = (nextOffset: number) => {
      scrollOffset = Phaser.Math.Clamp(nextOffset, 0, maxScroll);
      rowsContainer.y = scrollViewportTop - scrollOffset;
      updateScrollbar();
    };

    const scrollZone = this.add
      .zone(scrollBounds.centerX, scrollBounds.centerY, scrollBounds.width, scrollBounds.height)
      .setRectangleDropZone(scrollBounds.width, scrollBounds.height)
      .setInteractive({ useHandCursor: maxScroll > 0 });

    let isDragging = false;
    let dragStartY = 0;
    let dragStartOffset = 0;

    scrollZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (maxScroll <= 0) {
        return;
      }

      isDragging = true;
      dragStartY = pointer.y;
      dragStartOffset = scrollOffset;
    });

    const handlePointerMove = (pointer: Phaser.Input.Pointer) => {
      if (!isDragging) {
        return;
      }

      const delta = pointer.y - dragStartY;
      setScrollOffset(dragStartOffset - delta);
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    const handleWheel = (
      pointer: Phaser.Input.Pointer,
      _gameObjects: Phaser.GameObjects.GameObject[],
      _deltaX: number,
      deltaY: number,
    ) => {
      if (maxScroll <= 0 || !scrollBounds.contains(pointer.x, pointer.y)) {
        return;
      }

      setScrollOffset(scrollOffset + deltaY * 0.9);
    };

    this.input.on("pointermove", handlePointerMove);
    this.input.on("pointerup", handlePointerUp);
    this.input.on("wheel", handleWheel);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointermove", handlePointerMove);
      this.input.off("pointerup", handlePointerUp);
      this.input.off("wheel", handleWheel);
    });

    setScrollOffset(0);

    const bottomFade = this.add.graphics();
    bottomFade.fillStyle(COLORS.panel, 0.94);
    bottomFade.fillRect(frame.left, scrollViewportTop + scrollViewportHeight - 24, 860, 32);

    if (snapshot.leaderboard?.myRank) {
      this.add
        .text(frame.left, frame.bottom - 142, prototypeState.t("leaderboard.myRank"), {
          fontFamily: FONTS.display,
          fontSize: "30px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0, 0.5);

      addRoundedPanel(this, 540, frame.bottom - 62, 860, 94, {
        fillColor: 0xe7f8ff,
        radius: 30,
      });

      this.add
        .text(frame.left + 18, frame.bottom - 62, `#${snapshot.leaderboard.myRank.rank}`, {
          fontFamily: FONTS.display,
          fontSize: "34px",
          fontStyle: "700",
          color: "#10a7eb",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(540, frame.bottom - 62, snapshot.leaderboard.myRank.playerName, {
          fontFamily: FONTS.body,
          fontSize: "28px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0.5);

      this.add
        .text(
          frame.right,
          frame.bottom - 62,
          formatNumber(snapshot.leaderboard.myRank.score, snapshot.locale),
          {
            fontFamily: FONTS.display,
            fontSize: "30px",
            fontStyle: "700",
            color: "#10a7eb",
          },
        )
        .setOrigin(1, 0.5);
    }

    const footerText = this.add
      .text(
        540,
        frame.bottom - 214,
        "",
        {
          fontFamily: FONTS.body,
          fontSize: "22px",
          color: "#62839b",
        },
      )
      .setOrigin(0.5)
      .setLineSpacing(8);

    const refreshFooterText = () => {
      const currentSnapshot = prototypeState.getSnapshot();
      const lastSyncedValue = currentSnapshot.leaderboard?.lastSyncedAt
        ? formatDate(currentSnapshot.leaderboard.lastSyncedAt, currentSnapshot.locale, {
            dateStyle: "short",
            timeStyle: "short",
          })
        : "-";

      const footerLines = [
        prototypeState.t("leaderboard.lastSynced", {
          value: lastSyncedValue,
        }),
      ];

      if (currentSnapshot.currentEvent?.status === "live") {
        const remainingMs = getNextLeaderboardRefreshRemainingMs(currentSnapshot.leaderboard?.lastSyncedAt);
        if (remainingMs !== null) {
          footerLines.push(
            prototypeState.t("leaderboard.nextRefreshIn", {
              value: formatCountdownDuration(remainingMs),
            }),
          );
        }
      }

      footerText.setText(footerLines.join("\n"));
    };

    refreshFooterText();
    const footerTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: refreshFooterText,
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      footerTimer.destroy();
    });
  }

  private addRankRibbon(x: number, y: number, rank: number, prizeLabel: string) {
    const container = this.add.container(x, y);
    const graphics = this.add.graphics();
    const width = 198;
    const height = 74;
    const notchWidth = 36;
    const palette = this.getRankPalette(rank);

    graphics.fillStyle(palette.shadow, 0.28);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(-width / 2 + 8, -height / 2 + 8),
        new Phaser.Geom.Point(width / 2 - notchWidth + 8, -height / 2 + 8),
        new Phaser.Geom.Point(width / 2 + 8, 8),
        new Phaser.Geom.Point(width / 2 - notchWidth + 8, height / 2 + 8),
        new Phaser.Geom.Point(-width / 2 + 8, height / 2 + 8),
      ],
      true,
    );

    graphics.fillStyle(palette.fill, 1);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(-width / 2, -height / 2),
        new Phaser.Geom.Point(width / 2 - notchWidth, -height / 2),
        new Phaser.Geom.Point(width / 2, 0),
        new Phaser.Geom.Point(width / 2 - notchWidth, height / 2),
        new Phaser.Geom.Point(-width / 2, height / 2),
      ],
      true,
    );

    graphics.fillStyle(palette.stripe, 0.88);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(width / 2 - 54, -height / 2),
        new Phaser.Geom.Point(width / 2 - 24, -height / 2),
        new Phaser.Geom.Point(width / 2 - notchWidth + 4, -4),
        new Phaser.Geom.Point(width / 2 - 24, height / 2),
        new Phaser.Geom.Point(width / 2 - 54, height / 2),
        new Phaser.Geom.Point(width / 2 - notchWidth - 26, 2),
      ],
      true,
    );

    const prizePill = this.add.graphics();
    prizePill.fillStyle(palette.pillFill, 0.98);
    prizePill.fillRoundedRect(-84, 8, 106, 26, 8);

    const rankSuffix = this.getOrdinalSuffix(rank);

    const rankText = this.add
      .text(-70, -10, String(rank), {
        fontFamily: FONTS.display,
        fontSize: rank < 10 ? "48px" : "40px",
        fontStyle: "700",
        color: palette.rankColor,
      })
      .setOrigin(0, 0.5);

    const suffixText = this.add
      .text(rank < 10 ? -26 : -16, -8, rankSuffix, {
        fontFamily: FONTS.body,
        fontSize: "22px",
        fontStyle: "700",
        color: palette.suffixColor,
      })
      .setOrigin(0, 0.5);

    const prizeText = this.add
      .text(-72, 22, prizeLabel, {
        fontFamily: FONTS.body,
        fontSize: "18px",
        fontStyle: "700",
        color: palette.amountColor,
      })
      .setOrigin(0, 0.5);

    container.add([graphics, prizePill, rankText, suffixText, prizeText]);
    return container;
  }

  private getRankPalette(rank: number): RankPalette {
    if (rank <= 3) {
      return {
        fill: 0x14a8ee,
        shadow: 0x0f86c5,
        stripe: 0x9ae4ff,
        pillFill: 0xfafcff,
        rankColor: "#ffffff",
        suffixColor: "#ffffff",
        amountColor: "#0fa0e7",
      };
    }

    return {
      fill: 0xcfcfcf,
      shadow: 0x9ea5ad,
      stripe: 0xf4f4f4,
      pillFill: 0xffffff,
      rankColor: "#ffffff",
      suffixColor: "#ffffff",
      amountColor: "#9ca3ab",
    };
  }

  private getOrdinalSuffix(rank: number) {
    const remainder = rank % 100;
    if (remainder >= 11 && remainder <= 13) {
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
}
