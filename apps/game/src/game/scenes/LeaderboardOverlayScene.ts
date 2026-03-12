import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel, formatDate, formatNumber } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

export class LeaderboardOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.LeaderboardOverlay);
  }

  create() {
    const snapshot = prototypeState.getSnapshot();
    const isPending =
      snapshot.currentEvent?.status === "ended" &&
      snapshot.leaderboard?.resultsVisible === false;
    const frame = this.createFrame(
      isPending
        ? prototypeState.t("leaderboard.pendingTitle")
        : snapshot.currentEvent?.status === "live"
        ? prototypeState.t("leaderboard.liveTitle")
        : prototypeState.t("leaderboard.archiveTitle"),
      isPending
        ? prototypeState.t("leaderboard.pendingSubtitle")
        : snapshot.currentEvent?.status === "live"
        ? prototypeState.t("leaderboard.liveSubtitle")
        : prototypeState.t("leaderboard.archiveSubtitle"),
      1360,
    );

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

    const rows = snapshot.leaderboard?.leaderboard.slice(0, 10) ?? [];

    rows.forEach((entry, index) => {
      const y = frame.top + 78 + index * 100;
      addRoundedPanel(this, 540, y, 860, 76, {
        fillColor: entry.isSelf ? 0xe7f8ff : COLORS.white,
        radius: 26,
      });

      const rankBubble = this.add.circle(
        frame.left + 20,
        y,
        32,
        entry.rank <= 3 ? COLORS.primary : COLORS.panelSoft,
        1,
      );
      rankBubble.setStrokeStyle(2, COLORS.line, 0.95);

      this.add
        .text(frame.left + 20, y - 2, String(entry.rank), {
          fontFamily: FONTS.display,
          fontSize: "28px",
          fontStyle: "700",
          color: entry.rank <= 3 ? "#ffffff" : "#0a2942",
        })
        .setOrigin(0.5);

      this.add
        .text(frame.left + 86, y, entry.playerName, {
          fontFamily: FONTS.body,
          fontSize: "30px",
          fontStyle: entry.isSelf ? "700" : "600",
          color: "#0a2942",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(frame.right - 168, y, entry.prizeName ?? "-", {
          fontFamily: FONTS.body,
          fontSize: "22px",
          color: "#63839b",
        })
        .setOrigin(0.5);

      this.add
        .text(frame.right - 20, y, formatNumber(entry.score, snapshot.locale), {
          fontFamily: FONTS.display,
          fontSize: "28px",
          fontStyle: "700",
          color: "#10a7eb",
        })
        .setOrigin(1, 0.5);
    });

    if (snapshot.leaderboard?.myRank) {
      this.add
        .text(frame.left, frame.bottom - 120, prototypeState.t("leaderboard.myRank"), {
          fontFamily: FONTS.display,
          fontSize: "30px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0, 0.5);

      addRoundedPanel(this, 540, frame.bottom - 48, 860, 94, {
        fillColor: 0xe7f8ff,
        radius: 30,
      });

      this.add
        .text(frame.left + 18, frame.bottom - 48, `#${snapshot.leaderboard.myRank.rank}`, {
          fontFamily: FONTS.display,
          fontSize: "34px",
          fontStyle: "700",
          color: "#10a7eb",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(540, frame.bottom - 48, snapshot.leaderboard.myRank.playerName, {
          fontFamily: FONTS.body,
          fontSize: "28px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0.5);

      this.add
        .text(
          frame.right,
          frame.bottom - 48,
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

    this.add
      .text(
        540,
        frame.bottom - 190,
        prototypeState.t("leaderboard.lastSynced", {
          value: snapshot.leaderboard?.lastSyncedAt
            ? formatDate(snapshot.leaderboard.lastSyncedAt, snapshot.locale, {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "-",
        }),
        {
          fontFamily: FONTS.body,
          fontSize: "22px",
          color: "#62839b",
        },
      )
      .setOrigin(0.5);
  }
}
