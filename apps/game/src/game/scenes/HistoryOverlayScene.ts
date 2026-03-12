import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel, addTextButton, formatDate, formatNumber } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

type HistoryTab = "spins" | "events";

export class HistoryOverlayScene extends BaseOverlayScene {
  private activeTab: HistoryTab = "spins";

  constructor() {
    super(SCENE_KEYS.HistoryOverlay);
  }

  create() {
    const snapshot = prototypeState.getSnapshot();
    const frame = this.createFrame(
      prototypeState.t("history.title"),
      this.activeTab === "spins"
        ? prototypeState.t("history.spinsSubtitle", {
            title: snapshot.currentEvent?.title ?? prototypeState.t("rules.loading"),
          })
        : prototypeState.t("history.eventsSubtitle"),
      1380,
    );

    addTextButton(
      this,
      374,
      frame.top + 48,
      240,
      74,
      prototypeState.t("history.spinTab"),
      () => {
        this.activeTab = "spins";
        this.scene.restart();
      },
      {
        backgroundColor: this.activeTab === "spins" ? COLORS.primary : COLORS.panelSoft,
        labelColor: this.activeTab === "spins" ? "#ffffff" : "#0a2942",
        radius: 28,
      },
    );

    addTextButton(
      this,
      704,
      frame.top + 48,
      240,
      74,
      prototypeState.t("history.eventTab"),
      () => {
        this.activeTab = "events";
        this.scene.restart();
      },
      {
        backgroundColor: this.activeTab === "events" ? COLORS.primary : COLORS.panelSoft,
        labelColor: this.activeTab === "events" ? "#ffffff" : "#0a2942",
        radius: 28,
      },
    );

    if (this.activeTab === "spins") {
      const spinHistory = snapshot.spinHistory;
      spinHistory?.items.forEach((entry, index) => {
        const y = frame.top + 170 + index * 112;
        addRoundedPanel(this, 540, y, 860, 84, {
          fillColor: index % 2 === 0 ? COLORS.white : 0xeef9ff,
          radius: 24,
        });

        this.add
          .text(frame.left + 18, y, formatDate(entry.createdAt, snapshot.locale, { dateStyle: "short" }), {
            fontFamily: FONTS.body,
            fontSize: "24px",
            color: "#526f88",
          })
          .setOrigin(0, 0.5);

        this.add
          .text(540, y, `${entry.segmentLabel}  (${entry.scoreDelta >= 0 ? "+" : ""}${entry.scoreDelta})`, {
            fontFamily: FONTS.display,
            fontSize: "28px",
            fontStyle: "700",
            color: "#10a7eb",
          })
          .setOrigin(0.5);

        this.add
          .text(frame.right, y, formatNumber(entry.runningEventTotal, snapshot.locale), {
            fontFamily: FONTS.display,
            fontSize: "28px",
            fontStyle: "700",
            color: "#0a2942",
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
      return;
    }

    const eventHistory = snapshot.eventHistory;
    eventHistory?.items.forEach((entry, index) => {
      const y = frame.top + 170 + index * 198;
      addRoundedPanel(this, 540, y, 860, 150, {
        fillColor: index % 2 === 0 ? COLORS.white : 0xeef9ff,
        radius: 32,
      });

      this.add
        .text(frame.left + 22, y - 24, entry.eventName, {
          fontFamily: FONTS.display,
          fontSize: "36px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(
          frame.left + 22,
          y + 20,
          prototypeState.t("history.finalRank", { rank: entry.finalRank ?? "-" }),
          {
            fontFamily: FONTS.body,
            fontSize: "24px",
            color: "#5d7d97",
          },
        )
        .setOrigin(0, 0.5);

      this.add
        .text(frame.right, y - 8, formatNumber(entry.finalScore, snapshot.locale), {
          fontFamily: FONTS.display,
          fontSize: "34px",
          fontStyle: "700",
          color: "#10a7eb",
        })
        .setOrigin(1, 0.5);

      this.add
        .text(frame.right, y + 26, entry.prizeName ?? prototypeState.t("history.noPrize"), {
          fontFamily: FONTS.body,
          fontSize: "24px",
          color: "#5d7d97",
        })
        .setOrigin(1, 0.5);
    });

    if (!eventHistory?.items.length) {
      this.drawEmptyState(frame, prototypeState.t("history.noEvents"));
    }

    this.drawPager(
      frame,
      eventHistory?.page ?? 1,
      eventHistory?.pageSize ?? 1,
      eventHistory?.total ?? 0,
      (nextPage) => {
        void prototypeState.setEventHistoryPage(nextPage).then(() => this.scene.restart());
      },
    );
  }

  private drawPager(
    frame: { left: number; right: number; bottom: number },
    page: number,
    pageSize: number,
    total: number,
    onChange: (page: number) => void,
  ) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    addTextButton(
      this,
      frame.left + 92,
      frame.bottom - 6,
      140,
      72,
      prototypeState.t("history.prev"),
      () => onChange(Math.max(1, page - 1)),
      {
        backgroundColor: page > 1 ? COLORS.primaryDark : COLORS.disabled,
        radius: 28,
      },
    );

    addTextButton(
      this,
      frame.right - 92,
      frame.bottom - 6,
      140,
      72,
      prototypeState.t("history.next"),
      () => onChange(Math.min(totalPages, page + 1)),
      {
        backgroundColor: page < totalPages ? COLORS.primary : COLORS.disabled,
        radius: 28,
      },
    );

    this.add
      .text(
        540,
        frame.bottom - 6,
        prototypeState.t("history.page", { page, totalPages }),
        {
          fontFamily: FONTS.body,
          fontSize: "24px",
          fontStyle: "700",
          color: "#56768f",
        },
      )
      .setOrigin(0.5);
  }

  private drawEmptyState(frame: { left: number; right: number; top: number; bottom: number }, copy: string) {
    addRoundedPanel(this, 540, (frame.top + frame.bottom) / 2, 760, 180, {
      fillColor: COLORS.white,
      radius: 36,
    });

    this.add
      .text(540, (frame.top + frame.bottom) / 2, copy, {
        fontFamily: FONTS.body,
        fontSize: "28px",
        color: "#5d7d97",
        align: "center",
        wordWrap: { width: 620, useAdvancedWrap: true },
      })
      .setOrigin(0.5);
  }
}
