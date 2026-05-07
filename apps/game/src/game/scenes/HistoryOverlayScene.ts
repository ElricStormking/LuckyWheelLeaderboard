import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel, formatDate, formatNumber } from "../helpers";
import { COLORS, FONTS, isDesktopLayout, SCENE_KEYS, STAGE_HEIGHT, STAGE_WIDTH } from "../constants";

type HistoryFrame = {
  centerX: number;
  centerY: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
};

export class HistoryOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.HistoryOverlay);
  }

  create() {
    const snapshot = prototypeState.getSnapshot();
    const isDesktop = isDesktopLayout();
    const frame = this.createHistoryFrame(isDesktop);
    const titleY = frame.top + (isDesktop ? 70 : 92);
    const titleCenterX = frame.centerX;
    const tableWidth = isDesktop ? 460 : 860;
    const rowWidth = tableWidth;
    const rowLeft = frame.centerX - rowWidth / 2;
    const rowRight = frame.centerX + rowWidth / 2;
    const headerY = frame.top + (isDesktop ? 148 : 204);
    const firstRowY = frame.top + (isDesktop ? 205 : 292);
    const rowStepY = isDesktop ? 65 : 118;
    const rowHeight = isDesktop ? 54 : 88;
    const rowRadius = isDesktop ? 6 : 10;
    const dateHeaderX = rowLeft + (isDesktop ? 82 : 130);
    const pointsColumnX = frame.centerX;
    const totalHeaderX = rowRight - (isDesktop ? 70 : 112);
    const totalColumnX = rowRight - (isDesktop ? 30 : 52);
    const separatorLeftX = frame.centerX - (isDesktop ? 112 : 150);
    const separatorRightX = frame.centerX + (isDesktop ? 92 : 140);
    const separatorHalfHeight = isDesktop ? 21 : 28;
    const rowTextSize = isDesktop ? "20px" : "32px";
    const pointsTextSize = isDesktop ? "21px" : "34px";

    this.add
      .text(titleCenterX, titleY, prototypeState.t("history.title"), {
        fontFamily: FONTS.display,
        fontSize: isDesktop ? "34px" : "46px",
        fontStyle: "700",
        color: "#18aef5",
      })
      .setOrigin(0.5);
    this.drawHistoryCloseButton(
      frame.right - (isDesktop ? 55 : 72),
      titleY,
      isDesktop,
    );
    const spinHistory = snapshot.spinHistory;

    this.add
      .text(dateHeaderX, headerY, prototypeState.t("history.date"), {
        fontFamily: FONTS.body,
        fontSize: isDesktop ? "17px" : "28px",
        fontStyle: "700",
        color: "#11a0e7",
      })
      .setOrigin(0.5);

    this.add
      .text(pointsColumnX, headerY, prototypeState.t("history.points"), {
        fontFamily: FONTS.body,
        fontSize: isDesktop ? "17px" : "28px",
        fontStyle: "700",
        color: "#11a0e7",
      })
      .setOrigin(0.5);

    this.add
      .text(totalHeaderX, headerY, prototypeState.t("history.totalPoints"), {
        fontFamily: FONTS.body,
        fontSize: isDesktop ? "17px" : "28px",
        fontStyle: "700",
        color: "#11a0e7",
      })
      .setOrigin(0.5);

    spinHistory?.items.slice(0, 10).forEach((entry, index) => {
      const y = firstRowY + index * rowStepY;
      addRoundedPanel(this, frame.centerX, y, rowWidth, rowHeight, {
        fillColor: COLORS.white,
        fillAlpha: 0.98,
        strokeColor: 0xd9edf9,
        strokeAlpha: 1,
        radius: rowRadius,
      });

      const separatorTop = y - separatorHalfHeight;
      const separatorBottom = y + separatorHalfHeight;

      const separatorGraphics = this.add.graphics();
      separatorGraphics.lineStyle(isDesktop ? 1 : 2, 0xd4eefb, 1);
      separatorGraphics.lineBetween(separatorLeftX, separatorTop, separatorLeftX, separatorBottom);
      separatorGraphics.lineBetween(separatorRightX, separatorTop, separatorRightX, separatorBottom);

      this.add
        .text(
          rowLeft + (isDesktop ? 30 : 18),
          y,
          formatDate(entry.createdAt, snapshot.locale, {
            day: "numeric",
            month: "numeric",
            year: "numeric",
          }),
          {
            fontFamily: FONTS.body,
            fontSize: rowTextSize,
            color: "#4f5965",
            fontStyle: "600",
          },
        )
        .setOrigin(0, 0.5);

      this.add
        .text(pointsColumnX, y, `${entry.scoreDelta >= 0 ? "+" : ""}${formatNumber(entry.scoreDelta, snapshot.locale)}`, {
          fontFamily: FONTS.body,
          fontSize: pointsTextSize,
          fontStyle: "700",
          color: "#11a0e7",
        })
        .setOrigin(0.5);

      this.add
        .text(totalColumnX, y, formatNumber(entry.runningEventTotal, snapshot.locale), {
          fontFamily: FONTS.body,
          fontSize: pointsTextSize,
          fontStyle: isDesktop ? "400" : "700",
          color: "#11a0e7",
        })
        .setOrigin(1, 0.5);
    });

    if (!spinHistory?.items.length) {
      this.drawEmptyState(frame, prototypeState.t("history.noSpins"));
    }

    this.drawPager(
      frame,
      isDesktop,
      spinHistory?.page ?? 1,
      spinHistory?.pageSize ?? 1,
      spinHistory?.total ?? 0,
      (nextPage) => {
        void prototypeState.setSpinHistoryPage(nextPage).then(() => this.scene.restart());
      },
    );
  }

  private createHistoryFrame(isDesktop: boolean): HistoryFrame {
    const width = isDesktop ? 540 : 970;
    const height = isDesktop ? 980 : 1500;
    const centerX = STAGE_WIDTH / 2;
    const centerY = STAGE_HEIGHT / 2 + (isDesktop ? 0 : 30);
    const left = centerX - width / 2;
    const right = centerX + width / 2;
    const top = centerY - height / 2;
    const bottom = centerY + height / 2;

    const backdrop = this.add
      .rectangle(
        STAGE_WIDTH / 2,
        STAGE_HEIGHT / 2,
        STAGE_WIDTH,
        STAGE_HEIGHT,
        COLORS.overlay,
        0.72,
      )
      .setInteractive();
    const swallowTap = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    };

    backdrop.on("pointerdown", swallowTap);
    backdrop.on("pointerup", swallowTap);

    const panel = this.add.graphics();
    panel.fillStyle(0xf4f8fd, 0.99);
    panel.fillRect(left, top, width, height);
    panel.lineStyle(isDesktop ? 1.5 : 2, 0xbdeeff, 0.95);
    panel.strokeRect(left, top, width, height);

    const panelHitArea = this.add.zone(centerX, centerY, width, height).setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    panelHitArea.on("pointerdown", swallowTap);
    panelHitArea.on("pointerup", swallowTap);

    return { centerX, centerY, left, right, top, bottom, width, height };
  }

  private drawHistoryCloseButton(x: number, y: number, isDesktop: boolean) {
    const radius = isDesktop ? 26 : 38;
    const hitRadius = isDesktop ? 42 : 60;
    const markSize = isDesktop ? 10 : 14;
    const lineWidth = isDesktop ? 3 : 4;
    const button = this.add.container(x, y).setDepth(12);
    const halo = this.add.circle(0, 0, radius + 5, 0xbfefff, 0.2);
    const background = this.add.circle(0, 0, radius, 0xf7fbff, 1);
    const mark = this.add.graphics();

    background.setStrokeStyle(isDesktop ? 3 : 4, 0xaeeaff, 1);
    mark.lineStyle(lineWidth, 0x36bff5, 1);
    mark.lineBetween(-markSize, -markSize, markSize, markSize);
    mark.lineBetween(markSize, -markSize, -markSize, markSize);

    button.add([halo, background, mark]);

    const hitZone = this.add
      .rectangle(x, y, hitRadius * 2, hitRadius * 2, COLORS.white, 0.001)
      .setDepth(13)
      .setInteractive({ useHandCursor: true });

    hitZone.on("pointerdown", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.closeOverlay();
    });
    hitZone.on("pointerover", () => button.setScale(1.04));
    hitZone.on("pointerout", () => button.setScale(1));
  }

  private drawPager(
    frame: { left: number; right: number; bottom: number; centerX: number },
    isDesktop: boolean,
    page: number,
    pageSize: number,
    total: number,
    onChange: (page: number) => void,
  ) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pagerY = frame.bottom - (isDesktop ? 70 : 72);
    const activeFill = 0x11a0e7;
    const inactiveColor = "#11a0e7";
    const pageNumbers = Array.from(
      { length: Math.min(3, totalPages) },
      (_, index) => Math.min(Math.max(1, page - 1) + index, totalPages),
    ).filter((value, index, list) => list.indexOf(value) === index);
    const pagerStep = isDesktop ? 46 : 82;
    const pagerStartX = frame.centerX - pagerStep;
    const prevX = frame.centerX - (isDesktop ? 132 : 204);
    const nextX = frame.centerX + (isDesktop ? 132 : 204);

    this.add
      .text(prevX, pagerY, "\u2039", {
        fontFamily: FONTS.body,
        fontSize: isDesktop ? "28px" : "40px",
        fontStyle: "700",
        color: page > 1 ? "#11a0e7" : "#9fc5dc",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: page > 1 })
      .on("pointerup", () => {
        if (page > 1) {
          onChange(page - 1);
        }
      });

    pageNumbers.forEach((pageNumber, index) => {
      const x = pagerStartX + index * pagerStep;
      if (pageNumber === page) {
        const activeCircle = this.add.circle(x, pagerY, isDesktop ? 18 : 24, activeFill, 1);
        activeCircle.setStrokeStyle(0);
        this.add
          .text(x, pagerY, String(pageNumber), {
            fontFamily: FONTS.body,
            fontSize: isDesktop ? "18px" : "26px",
            fontStyle: "700",
            color: "#ffffff",
          })
          .setOrigin(0.5);
        return;
      }

      this.add
        .text(x, pagerY, String(pageNumber), {
          fontFamily: FONTS.body,
          fontSize: isDesktop ? "18px" : "28px",
          fontStyle: "700",
          color: inactiveColor,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => onChange(pageNumber));
    });

    this.add
      .text(nextX, pagerY, "\u203A", {
        fontFamily: FONTS.body,
        fontSize: isDesktop ? "28px" : "40px",
        fontStyle: "700",
        color: page < totalPages ? "#11a0e7" : "#9fc5dc",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: page < totalPages })
      .on("pointerup", () => {
        if (page < totalPages) {
          onChange(page + 1);
        }
      });
  }

  private drawEmptyState(frame: { left: number; right: number; top: number; bottom: number }, copy: string) {
    addRoundedPanel(this, (frame.left + frame.right) / 2, (frame.top + frame.bottom) / 2, 760, 180, {
      fillColor: COLORS.white,
      radius: 36,
    });

    this.add
      .text((frame.left + frame.right) / 2, (frame.top + frame.bottom) / 2, copy, {
        fontFamily: FONTS.body,
        fontSize: "28px",
        color: "#5d7d97",
        align: "center",
        wordWrap: { width: 620, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
  }
}
