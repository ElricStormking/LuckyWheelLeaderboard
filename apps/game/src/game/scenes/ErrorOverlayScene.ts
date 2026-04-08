import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel, addTextButton } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

export class ErrorOverlayScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.ErrorOverlay);
  }

  create() {
    const snapshot = prototypeState.getSnapshot();
    const sessionExpired = snapshot.errorKind === "sessionExpired";
    const message = sessionExpired
      ? prototypeState.t("sessionExpired.body")
      : (snapshot.errorMessage ?? prototypeState.t("error.unknown"));
    const shouldRetryBootstrap = !sessionExpired && !snapshot.currentEvent;
    const frame = this.createFrame(
      sessionExpired ? prototypeState.t("sessionExpired.title") : prototypeState.t("error.title"),
      sessionExpired
        ? prototypeState.t("sessionExpired.subtitle")
        : prototypeState.t("error.subtitle"),
      640,
    );

    addRoundedPanel(this, frame.centerX, frame.centerY + 160, 760, 220, {
      fillColor: COLORS.white,
      radius: 38,
    });

    this.add
      .text(frame.centerX, frame.centerY + 140, message, {
        fontFamily: FONTS.body,
        fontSize: "28px",
        color: "#0a2942",
        align: "center",
        wordWrap: { width: 660, useAdvancedWrap: true },
      })
      .setOrigin(0.5);

    addTextButton(
      this,
      frame.centerX,
      frame.centerY + 280,
      280,
      84,
      sessionExpired
        ? prototypeState.t("sessionExpired.ok")
        : shouldRetryBootstrap
          ? "Retry"
          : prototypeState.t("error.dismiss"),
      () => {
        prototypeState.clearError();
        this.scene.stop();

        if (shouldRetryBootstrap) {
          void prototypeState.bootstrap();
        }
      },
    );
  }
}
