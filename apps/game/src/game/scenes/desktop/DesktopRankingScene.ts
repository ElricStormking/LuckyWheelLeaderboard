import Phaser from "phaser";
import {
  formatCountdownDuration,
  formatDate,
  formatNumber,
  getNextLeaderboardRefreshRemainingMs,
  maskLeaderboardPlayerName,
} from "../../helpers";
import { FONTS, SCENE_KEYS } from "../../constants";
import { prototypeState } from "../../state/prototype-state";
import { DesktopPageScene } from "./DesktopPageScene";
import {
  DESKTOP_RANKING_BUTTON_KEYS,
  DESKTOP_RANKING_PLATE_KEYS,
  getDesktopRankingPrizeTextPosition,
  wireImageButton,
} from "./desktopSceneShared";

type RankingRow = {
  selfArrow: Phaser.GameObjects.Image;
  plate: Phaser.GameObjects.Image;
  playerText: Phaser.GameObjects.Text;
  scoreText: Phaser.GameObjects.Text;
  prizeText: Phaser.GameObjects.Text;
};

const PAGE_SIZE = 10;
const ROW_PRIZE_TEXT_FONT_SIZE = "12px";
const ROW_LAYOUTS = [
  { x: 597, y: 262 },
  { x: 597, y: 410 },
  { x: 597, y: 565 },
  { x: 597, y: 717 },
  { x: 597, y: 874 },
  { x: 1329, y: 262 },
  { x: 1329, y: 410 },
  { x: 1329, y: 565 },
  { x: 1329, y: 717 },
  { x: 1329, y: 874 },
] as const;

export class DesktopRankingScene extends DesktopPageScene {
  private rows: RankingRow[] = [];
  private pageButtons: Phaser.GameObjects.Image[] = [];
  private page = 1;
  private pendingText?: Phaser.GameObjects.Text;
  private myRankText?: Phaser.GameObjects.Text;
  private lastSyncedText?: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.DesktopRanking);
  }

  create() {
    this.rows = [];
    this.pageButtons = [];
    this.page = 1;
    this.pendingText = undefined;
    this.myRankText = undefined;
    this.lastSyncedText = undefined;

    this.drawDesktopPageBackground();
    this.add.image(947, 113, "Desktop_RankingTitle").setScale(0.9);
    this.addDesktopPageArrows(SCENE_KEYS.DesktopMain, SCENE_KEYS.DesktopPrize);

    ROW_LAYOUTS.forEach(({ x, y }, index) => {
      const selfArrow = this.add.image(x - 182, y, "Desktop_RankingArrow").setScale(0.72);
      const plate = this.add.image(x, y, "Desktop_RankingPlate_01").setScale(0.25);
      const playerText = this.add
        .text(x - 44, y - 4, "-", {
          fontFamily: FONTS.body,
          fontSize: "22px",
          fontStyle: "700",
          color: "#0a2942",
          align: "left",
          wordWrap: { width: 170, useAdvancedWrap: true },
        })
        .setOrigin(0, 0.5);
      const scoreText = this.add
        .text(x + 284, y - 4, "-", {
          fontFamily: FONTS.display,
          fontSize: "22px",
          fontStyle: "700",
          color: "#10a7eb",
        })
        .setOrigin(1, 0.5);

      const prizeText = this.add
        .text(0, 0, "", {
          fontFamily: FONTS.body,
          fontSize: ROW_PRIZE_TEXT_FONT_SIZE,
          fontStyle: "700",
          color: "#8d98a1",
        })
        .setOrigin(0.5, 0.5);

      const prizePosition = getDesktopRankingPrizeTextPosition(plate, index + 1);
      prizeText.setPosition(prizePosition.x, prizePosition.y);

      this.rows.push({ selfArrow, plate, playerText, scoreText, prizeText });
    });

    [778, 900, 1024, 1147].forEach((x, index) => {
      const button = this.add.image(x, 1011, DESKTOP_RANKING_BUTTON_KEYS[index]);
      if (index < 3) {
        wireImageButton(button, 1, () => {
          this.page = index + 1;
          this.refreshLeaderboard();
        }, 1.06);
      } else {
        button.setAlpha(0.26);
      }
      this.pageButtons.push(button);
    });

    this.pendingText = this.add
      .text(960, 540, "", {
        fontFamily: FONTS.body,
        fontSize: "32px",
        fontStyle: "700",
        color: "#5d7d97",
        align: "center",
        wordWrap: { width: 720, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.myRankText = this.add
      .text(960, 954, "", {
        fontFamily: FONTS.body,
        fontSize: "24px",
        fontStyle: "700",
        color: "#0a2942",
        align: "center",
        wordWrap: { width: 900, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    this.lastSyncedText = this.add
      .text(960, 1048, "", {
        fontFamily: FONTS.body,
        fontSize: "18px",
        fontStyle: "700",
        color: "#62839b",
      })
      .setOrigin(0.5)
      .setLineSpacing(6);

    const footerTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.refreshLeaderboardFooter(),
    });

    this.bindPrototypeLifecycle(() => this.refreshLeaderboard());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      footerTimer.destroy();
      this.rows = [];
      this.pageButtons = [];
      this.pendingText = undefined;
      this.myRankText = undefined;
      this.lastSyncedText = undefined;
    });
    this.refreshLeaderboard();
  }

  private refreshLeaderboard() {
    const snapshot = prototypeState.getSnapshot();
    const isPending =
      snapshot.currentEvent?.status === "ended" &&
      snapshot.leaderboard?.resultsVisible === false;
    const totalPages = Math.max(
      1,
      Math.min(3, Math.ceil((snapshot.leaderboard?.leaderboard.length ?? 0) / PAGE_SIZE)),
    );

    if (this.page > totalPages) {
      this.page = totalPages;
    }

    const entries =
      snapshot.leaderboard?.leaderboard.slice(
        (this.page - 1) * PAGE_SIZE,
        this.page * PAGE_SIZE,
      ) ?? [];

    this.pendingText?.setVisible(isPending);
    this.pendingText?.setText(
      snapshot.leaderboard?.pendingMessage ??
        (snapshot.isBootstrapping ? "Loading leaderboard..." : "Leaderboard unavailable."),
    );

    this.rows.forEach((row, index) => {
      const entry = entries[index];
      const visible = Boolean(entry) && !isPending;

      row.selfArrow.setVisible(Boolean(entry?.isSelf) && visible);
      row.plate.setVisible(visible);
      row.playerText.setVisible(visible);
      row.scoreText.setVisible(visible);
      row.prizeText.setVisible(visible);

      if (!entry || isPending) {
        row.prizeText.setText("");
        return;
      }

      row.plate.setTexture(
        DESKTOP_RANKING_PLATE_KEYS[entry.rank - 1] ?? "Desktop_RankingPlate_NotListed",
      );
      row.playerText.setText(maskLeaderboardPlayerName(entry.playerName, entry.isSelf));
      row.scoreText.setText(formatNumber(entry.score, snapshot.locale));
      const prizePosition = getDesktopRankingPrizeTextPosition(row.plate, entry.rank);
      row.prizeText
        .setPosition(prizePosition.x, prizePosition.y)
        .setText(this.getLeaderboardPrizeLabel(entry.rank, entry.prizeName))
        .setColor(entry.rank <= 3 ? "#149fe4" : "#8d98a1");
      row.playerText.setColor(entry.isSelf ? "#0c96d7" : "#0a2942");
    });

    this.pageButtons.forEach((button, index) => {
      if (index >= 3) {
        button.setAlpha(0.26);
        button.setScale(1);
        return;
      }

      const enabled = index + 1 <= totalPages;
      button.setAlpha(enabled ? (index + 1 === this.page ? 1 : 0.72) : 0.26);
      button.setScale(index + 1 === this.page ? 1.06 : 1);
    });

    const myRank = snapshot.leaderboard?.myRank;
    this.myRankText?.setText(
      myRank
        ? `My Rank #${myRank.rank} | ${myRank.playerName} | ${formatNumber(myRank.score, snapshot.locale)} pts`
        : snapshot.isBootstrapping
          ? "Loading ranking..."
          : "",
    );

    this.refreshLeaderboardFooter();
  }

  private refreshLeaderboardFooter() {
    const snapshot = prototypeState.getSnapshot();
    const lastSyncedValue = snapshot.leaderboard?.lastSyncedAt
      ? formatDate(snapshot.leaderboard.lastSyncedAt, snapshot.locale, {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "-";

    const footerLines = [
      prototypeState.t("leaderboard.lastSynced", {
        value: lastSyncedValue,
      }),
    ];

    if (snapshot.currentEvent?.status === "live") {
      const remainingMs = getNextLeaderboardRefreshRemainingMs(snapshot.leaderboard?.lastSyncedAt);
      if (remainingMs !== null) {
        footerLines.push(
          prototypeState.t("leaderboard.nextRefreshIn", {
            value: formatCountdownDuration(remainingMs),
          }),
        );
      }
    }

    this.lastSyncedText?.setText(footerLines.join("\n"));
  }

  private getLeaderboardPrizeLabel(rank: number, prizeName: string | null) {
    if (prizeName) {
      return prizeName;
    }

    const configuredPrize = prototypeState
      .getSnapshot()
      .prizes.find((prize) => rank >= prize.rankFrom && rank <= prize.rankTo);

    return configuredPrize?.prizeLabel ?? `Rank #${rank}`;
  }

}
