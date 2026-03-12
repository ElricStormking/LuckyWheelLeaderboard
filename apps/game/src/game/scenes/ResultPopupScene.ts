import type { SpinSuccessResponse } from "@lucky-wheel/contracts";
import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { addRoundedPanel, addTextButton, formatNumber } from "../helpers";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

export class ResultPopupScene extends BaseOverlayScene {
  constructor() {
    super(SCENE_KEYS.ResultPopup);
  }

  create(data: SpinSuccessResponse) {
    const locale = prototypeState.getSnapshot().locale;
    this.createFrame(
      prototypeState.t("result.title"),
      prototypeState.t("result.subtitle"),
      720,
    );
    addRoundedPanel(this, 540, 1080, 760, 280, {
      fillColor: COLORS.white,
      radius: 40,
    });

    this.add
      .text(540, 980, prototypeState.t("result.segment", { index: data.segmentIndex + 1 }), {
        fontFamily: FONTS.body,
        fontSize: "26px",
        fontStyle: "700",
        color: "#63839b",
      })
      .setOrigin(0.5);

    this.add
      .text(
        540,
        1060,
        data.scoreDelta >= 0
          ? `+${formatNumber(data.scoreDelta, locale)}`
          : formatNumber(data.scoreDelta, locale),
        {
          fontFamily: FONTS.display,
          fontSize: "84px",
          fontStyle: "700",
          color: data.scoreDelta >= 0 ? "#10a7eb" : "#ff7c7c",
        },
      )
      .setOrigin(0.5);

    this.add
      .text(
        540,
        1140,
        prototypeState.t("result.newTotal", {
          total: formatNumber(data.runningEventTotal, locale),
        }),
        {
          fontFamily: FONTS.body,
          fontSize: "30px",
          color: "#0a2942",
        },
      )
      .setOrigin(0.5);

    this.add
      .text(540, 1186, prototypeState.t("result.rank", { rank: data.rank ?? "-" }), {
        fontFamily: FONTS.body,
        fontSize: "24px",
        color: "#65829a",
      })
      .setOrigin(0.5);

    addTextButton(this, 540, 1280, 280, 84, prototypeState.t("result.continue"), () => {
      prototypeState.acknowledgeSpinResult();
      this.scene.stop();
    });
  }
}
