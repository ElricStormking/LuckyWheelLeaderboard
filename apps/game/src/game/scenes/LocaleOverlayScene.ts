import Phaser from "phaser";
import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

export class LocaleOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.LocaleOverlay);
  }

  create() {
    const snapshot = prototypeState.getSnapshot();
    const frame = this.createFrame(
      prototypeState.t("locale.title"),
      prototypeState.t("locale.subtitle"),
      980,
    );

    snapshot.supportedLocales.forEach((option, index) => {
      const y = frame.top + 110 + index * 190;
      const isCurrent = option.code === snapshot.locale;
      const card = addRoundedPanel(this, 540, y, 860, 146, {
        fillColor: isCurrent ? 0xe7f8ff : COLORS.white,
        radius: 34,
      });

      card.setSize(860, 146);
      card.setInteractive(
        new Phaser.Geom.Rectangle(-430, -73, 860, 146),
        Phaser.Geom.Rectangle.Contains,
      );
      card.on("pointerup", () => {
        void prototypeState.setLocale(option.code).then(() => this.closeOverlay());
      });

      this.add
        .text(frame.left + 24, y - 14, option.label, {
          fontFamily: FONTS.display,
          fontSize: "42px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(frame.left + 24, y + 28, option.code, {
          fontFamily: FONTS.body,
          fontSize: "22px",
          color: "#5c7f9a",
        })
        .setOrigin(0, 0.5);

      if (isCurrent) {
        const chip = addRoundedPanel(this, frame.right - 96, y, 170, 52, {
          fillColor: COLORS.accent,
          strokeColor: COLORS.accent,
          radius: 26,
        });
        chip.add(
          this.add
            .text(0, 0, prototypeState.t("locale.current"), {
              fontFamily: FONTS.body,
              fontSize: "18px",
              fontStyle: "700",
              color: "#0a2942",
            })
            .setOrigin(0.5),
        );
      }
    });
  }
}
