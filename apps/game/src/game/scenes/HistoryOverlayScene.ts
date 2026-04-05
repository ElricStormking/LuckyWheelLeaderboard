import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel, formatDate, formatNumber } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

export class HistoryOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.HistoryOverlay);
  }

  create() {
    const snapshot = prototypeState.getSnapshot();
    const frame = this.createFrame("", undefined, 1500);
    const titleY = frame.top - 88;
    const titleCenterX = frame.centerX;
    const titleShadow = this.add.ellipse(titleCenterX, titleY + 8, 350, 86, 0x72cfff, 0.14);

    const titleFrame = this.add.graphics();
    titleFrame.fillStyle(COLORS.white, 0.98);
    titleFrame.fillRoundedRect(titleCenterX - 168, titleY - 34, 336, 68, 34);
    titleFrame.lineStyle(3, 0x18aef5, 0.95);
    titleFrame.strokeRoundedRect(titleCenterX - 168, titleY - 34, 336, 68, 34);
    titleFrame.lineStyle(1.5, 0xbdeeff, 0.95);
    titleFrame.strokeRoundedRect(titleCenterX - 158, titleY - 24, 316, 48, 24);

    const titleDecor = this.add.graphics();
    titleDecor.fillStyle(0x18aef5, 1);
    titleDecor.fillCircle(titleCenterX - 122, titleY, 4);
    titleDecor.fillCircle(titleCenterX + 122, titleY, 4);
    titleDecor.lineStyle(2, 0x9fe2ff, 0.95);
    titleDecor.lineBetween(titleCenterX - 112, titleY, titleCenterX - 84, titleY);
    titleDecor.lineBetween(titleCenterX + 84, titleY, titleCenterX + 112, titleY);

    this.add
      .text(titleCenterX, titleY, prototypeState.t("history.title"), {
        fontFamily: FONTS.display,
        fontSize: "30px",
        fontStyle: "700",
        color: "#18aef5",
      })
      .setOrigin(0.5);
    const spinHistory = snapshot.spinHistory;

    const headerY = frame.top + 78;
    const firstRowY = frame.top + 156;
    this.add
      .text(frame.left + 72, headerY, prototypeState.t("history.date"), {
        fontFamily: FONTS.body,
        fontSize: "28px",
        fontStyle: "700",
        color: "#11a0e7",
      })
      .setOrigin(0, 0.5);

    this.add
      .text(frame.centerX, headerY, prototypeState.t("history.points"), {
        fontFamily: FONTS.body,
        fontSize: "28px",
        fontStyle: "700",
        color: "#11a0e7",
      })
      .setOrigin(0.5);

    this.add
      .text(frame.right - 10, headerY, prototypeState.t("history.totalPoints"), {
        fontFamily: FONTS.body,
        fontSize: "28px",
        fontStyle: "700",
        color: "#11a0e7",
      })
      .setOrigin(1, 0.5);

    spinHistory?.items.forEach((entry, index) => {
      const y = firstRowY + index * 118;
      addRoundedPanel(this, frame.centerX, y, 860, 88, {
        fillColor: COLORS.white,
        fillAlpha: 0.98,
        strokeColor: 0xd9edf9,
        strokeAlpha: 1,
        radius: 18,
      });

      const separatorLeftX = frame.centerX - 150;
      const separatorRightX = frame.centerX + 140;
      const separatorTop = y - 28;
      const separatorBottom = y + 28;

      const separatorGraphics = this.add.graphics();
      separatorGraphics.lineStyle(2, 0xd4eefb, 1);
      separatorGraphics.lineBetween(separatorLeftX, separatorTop, separatorLeftX, separatorBottom);
      separatorGraphics.lineBetween(separatorRightX, separatorTop, separatorRightX, separatorBottom);

      this.add
        .text(
          frame.left + 18,
          y,
          formatDate(entry.createdAt, snapshot.locale, {
            day: "numeric",
            month: "numeric",
            year: "numeric",
          }),
          {
            fontFamily: FONTS.body,
            fontSize: "32px",
            color: "#4f5965",
            fontStyle: "600",
          },
        )
        .setOrigin(0, 0.5);

      this.add
        .text(frame.centerX, y, `${entry.scoreDelta >= 0 ? "+" : ""}${formatNumber(entry.scoreDelta, snapshot.locale)}`, {
          fontFamily: FONTS.body,
          fontSize: "34px",
          fontStyle: "700",
          color: "#11a0e7",
        })
        .setOrigin(0.5);

      this.add
        .text(frame.right, y, formatNumber(entry.runningEventTotal, snapshot.locale), {
          fontFamily: FONTS.body,
          fontSize: "34px",
          fontStyle: "700",
          color: "#11a0e7",
        })
        .setOrigin(1, 0.5);
    });

    if (!spinHistory?.items.length) {
      this.drawEmptyState(frame, prototypeState.t("history.noSpins"));
    }

    this.drawPager(
      frame,
      spinHistory?.page ?? 1,
      spinHistory?.pageSize ?? 1,
      spinHistory?.total ?? 0,
      (nextPage) => {
        void prototypeState.setSpinHistoryPage(nextPage).then(() => this.scene.restart());
      },
    );
  }

  private drawPager(
    frame: { left: number; right: number; bottom: number; centerX: number },
    page: number,
    pageSize: number,
    total: number,
    onChange: (page: number) => void,
  ) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pagerY = frame.bottom - 12;
    const activeFill = 0x11a0e7;
    const inactiveColor = "#11a0e7";
    const pageNumbers = Array.from(
      { length: Math.min(3, totalPages) },
      (_, index) => Math.min(Math.max(1, page - 1) + index, totalPages),
    ).filter((value, index, list) => list.indexOf(value) === index);

    this.add
      .text(frame.centerX - 204, pagerY, "\u2039", {
        fontFamily: FONTS.body,
        fontSize: "40px",
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
      const x = frame.centerX - 90 + index * 82;
      if (pageNumber === page) {
        const activeCircle = this.add.circle(x, pagerY, 24, activeFill, 1);
        activeCircle.setStrokeStyle(0);
        this.add
          .text(x, pagerY, String(pageNumber), {
            fontFamily: FONTS.body,
            fontSize: "26px",
            fontStyle: "700",
            color: "#ffffff",
          })
          .setOrigin(0.5);
        return;
      }

      this.add
        .text(x, pagerY, String(pageNumber), {
          fontFamily: FONTS.body,
          fontSize: "28px",
          fontStyle: "700",
          color: inactiveColor,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => onChange(pageNumber));
    });

    this.add
      .text(frame.centerX + 204, pagerY, "\u203A", {
        fontFamily: FONTS.body,
        fontSize: "40px",
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
