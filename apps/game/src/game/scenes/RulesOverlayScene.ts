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
    const frame = this.createFrame(
      prototypeState.t("rules.title"),
      event
        ? prototypeState.t("rules.subtitle", { title: event.title })
        : prototypeState.t("rules.loading"),
      1340,
    );

    addRoundedPanel(this, 540, frame.top + 436, 860, 1030, {
      fillColor: COLORS.white,
      radius: 34,
    });

    const rules = prototypeState.getSnapshot().currentEvent?.rulesContent ?? "";

    this.add
      .text(frame.left + 26, frame.top + 56, rules, {
        fontFamily: FONTS.body,
        fontSize: "28px",
        color: "#253a4e",
        lineSpacing: 12,
        wordWrap: { width: 808, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
  }
}
