import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

export class PrizeOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.PrizeOverlay);
  }

  create() {
    const event = prototypeState.getSnapshot().currentEvent;
    const frame = this.createFrame(
      prototypeState.t("prize.title"),
      event?.status === "live"
        ? prototypeState.t("prize.liveSubtitle")
        : prototypeState.t("prize.archiveSubtitle"),
      1260,
    );

    const prizes = prototypeState.getSnapshot().prizes;

    prizes.forEach((prize, index) => {
      const y = frame.top + 94 + index * 184;
      addRoundedPanel(this, 540, y, 860, 144, {
        fillColor: index % 2 === 0 ? COLORS.white : 0xeef9ff,
        radius: 34,
      });

      this.add
        .text(
          frame.left + 18,
          y - 16,
          `${prize.rankFrom}${prize.rankTo > prize.rankFrom ? ` - ${prize.rankTo}` : ""}`,
          {
            fontFamily: FONTS.display,
            fontSize: "58px",
            fontStyle: "700",
            color: "#10a7eb",
          },
        )
        .setOrigin(0, 0.5);

      this.add
        .text(frame.left + 18, y + 30, prize.accentLabel ?? prototypeState.t("prize.defaultAccent"), {
          fontFamily: FONTS.body,
          fontSize: "24px",
          color: "#61819b",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(820, y - 12, prize.prizeLabel, {
          fontFamily: FONTS.display,
          fontSize: "40px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(1, 0.5);

      this.add
        .text(820, y + 26, prize.prizeDescription, {
          fontFamily: FONTS.body,
          fontSize: "21px",
          color: "#63839b",
          align: "right",
          wordWrap: { width: 360, useAdvancedWrap: true },
        })
        .setOrigin(1, 0.5);
    });
  }
}
