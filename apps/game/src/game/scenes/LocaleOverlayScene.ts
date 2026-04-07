import Phaser from "phaser";
import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

const LOCALE_CARD_WIDTH = 860;
const LOCALE_CARD_HEIGHT = 146;

export class LocaleOverlayScene extends BaseOverlayScene {
  private isChangingLocale = false;

  constructor() {
    super(SCENE_KEYS.LocaleOverlay);
  }

  create() {
    this.isChangingLocale = false;

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

      const hitArea = this.add
        .rectangle(540, y, LOCALE_CARD_WIDTH, LOCALE_CARD_HEIGHT, 0xffffff, 0);
      hitArea.setInteractive({ useHandCursor: true });

      const beginSelection = () => {
        if (this.isChangingLocale) {
          return;
        }

        this.isChangingLocale = true;
        hitArea.disableInteractive();

        void prototypeState.setLocale(option.code)
          .then(() => this.closeOverlay())
          .catch(() => {
            this.isChangingLocale = false;
            hitArea.setInteractive({ useHandCursor: true });
          });
      };

      hitArea.on("pointerdown", (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        beginSelection();
      });
      hitArea.on("pointerup", (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
      });
      hitArea.on("pointerover", () => {
        card.setScale(1.01);
      });
      hitArea.on("pointerout", () => {
        card.setScale(1);
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
