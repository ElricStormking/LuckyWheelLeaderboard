import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

export class RulesOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.RulesOverlay);
  }

  create() {
    const event = prototypeState.getSnapshot().currentEvent;
    const frame = this.createFrame("", undefined, 1340);
    this.add.image(540, frame.top - 82, "Reminder").setScale(1.02);
    this.add
      .text(250, frame.top - 82, prototypeState.t("rules.title"), {
        fontFamily: FONTS.display,
        fontSize: "38px",
        fontStyle: "700",
        color: "#ffffff",
      })
      .setOrigin(0, 0.5);
    this.add
      .text(
        540,
        frame.top - 18,
        event
          ? prototypeState.t("rules.subtitle", { title: event.title })
          : prototypeState.t("rules.loading"),
        {
          fontFamily: FONTS.body,
          fontSize: "22px",
          color: "#62839b",
          align: "center",
          wordWrap: { width: 760, useAdvancedWrap: true },
        },
      )
      .setOrigin(0.5);

    const TERMS_INNER_PAD = 18;
    addRoundedPanel(this, 540, frame.top + 468, 860, 1030, {
      fillColor: COLORS.white,
      radius: 34,
      innerFillColor: 0xf7f7f7, // rgb(247,247,247)
      innerPadding: TERMS_INNER_PAD,
      innerRadius: 0,
      skipHighlight: true,
      skipStroke: true,
    });

    const rules = prototypeState.getSnapshot().currentEvent?.rulesContent ?? "";

    this.add
      .text(frame.left + 26 + TERMS_INNER_PAD, frame.top + 104 + TERMS_INNER_PAD, rules, {
        fontFamily: FONTS.body,
        fontSize: "28px",
        color: "#000000",
        lineSpacing: 12,
        wordWrap: { width: 808 - TERMS_INNER_PAD * 2, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
  }
}
