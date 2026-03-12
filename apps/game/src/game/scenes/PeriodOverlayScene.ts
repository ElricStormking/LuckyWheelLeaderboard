import Phaser from "phaser";
import { EventStatus } from "@lucky-wheel/contracts";
import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

export class PeriodOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.PeriodOverlay);
  }

  create() {
    const frame = this.createFrame(
      prototypeState.t("period.title"),
      prototypeState.t("period.subtitle"),
      1460,
    );
    const snapshot = prototypeState.getSnapshot();

    snapshot.events.forEach((entry, index) => {
      const y = frame.top + 110 + index * 220;
      const accentColor = this.getAccentColor(entry.status);
      const isSelected = entry.id === snapshot.currentEvent?.id;
      const card = addRoundedPanel(this, 540, y, 860, 172, {
        fillColor: isSelected ? 0xe9f8ff : COLORS.white,
        radius: 34,
      });
      const stripe = this.add.graphics();
      stripe.fillStyle(accentColor, 1);
      stripe.fillRoundedRect(-430, -86, 24, 172, 18);
      stripe.fillStyle(0xffffff, 0.2);
      stripe.fillRoundedRect(-394, -62, 160, 26, 13);
      card.add(stripe);

      card.setSize(860, 172);
      card.setInteractive(
        new Phaser.Geom.Rectangle(-430, -86, 860, 172),
        Phaser.Geom.Rectangle.Contains,
      );
      card.on("pointerover", () => card.setScale(1.01));
      card.on("pointerout", () => card.setScale(1));
      card.on("pointerup", () => {
        void prototypeState.selectEvent(entry.id);
        this.closeOverlay();
      });

      this.add
        .text(frame.left + 36, y - 34, entry.title, {
          fontFamily: FONTS.display,
          fontSize: "38px",
          fontStyle: "700",
          color: "#0a2942",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(frame.left + 36, y + 14, entry.shortDescription, {
          fontFamily: FONTS.body,
          fontSize: "22px",
          color: "#5d7d97",
          wordWrap: { width: 470, useAdvancedWrap: true },
        })
        .setOrigin(0, 0.5);

      this.add
        .text(frame.right - 10, y - 34, entry.promotionPeriodLabel, {
          fontFamily: FONTS.body,
          fontSize: "22px",
          fontStyle: "700",
          color: "#4c6a82",
          align: "right",
        })
        .setOrigin(1, 0.5);

      const chip = addRoundedPanel(this, frame.right - 88, y + 28, 176, 48, {
        fillColor: accentColor,
        strokeColor: accentColor,
        radius: 24,
      });
      chip.add(
        this.add
          .text(0, 0, isSelected ? prototypeState.t("period.selected") : this.getStatusLabel(entry.status), {
            fontFamily: FONTS.body,
            fontSize: "18px",
            fontStyle: "700",
            color: entry.status === EventStatus.Ended ? "#0a2942" : "#ffffff",
          })
          .setOrigin(0.5),
      );
    });
  }

  private getAccentColor(status: EventStatus) {
    switch (status) {
      case EventStatus.Live:
        return COLORS.primary;
      case EventStatus.Ended:
        return COLORS.accent;
      case EventStatus.Finalized:
      default:
        return 0x5b7690;
    }
  }

  private getStatusLabel(status: EventStatus) {
    switch (status) {
      case EventStatus.Live:
        return prototypeState.t("period.live");
      case EventStatus.Ended:
        return prototypeState.t("period.ended");
      case EventStatus.Finalized:
        return prototypeState.t("period.finalized");
      default:
        return status.toUpperCase();
    }
  }
}
