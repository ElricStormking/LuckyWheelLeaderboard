import Phaser from "phaser";
import { COLORS, FONTS, STAGE_HEIGHT, STAGE_WIDTH } from "../constants";
import { addRoundedPanel, addTextButton } from "../helpers";

export class BaseOverlayScene extends Phaser.Scene {
  protected createFrame(title: string, subtitle?: string, height = 1250) {
    const backdrop = this.add
      .rectangle(
        STAGE_WIDTH / 2,
        STAGE_HEIGHT / 2,
        STAGE_WIDTH,
        STAGE_HEIGHT,
        COLORS.overlay,
        0.72,
      )
      .setInteractive();

    backdrop.on("pointerup", () => this.closeOverlay());

    const panel = addRoundedPanel(this, STAGE_WIDTH / 2, STAGE_HEIGHT / 2 + 30, 970, height, {
      fillColor: COLORS.panel,
      radius: 46,
    });
    panel.setSize(970, height);
    panel.setInteractive(
      new Phaser.Geom.Rectangle(-485, -height / 2, 970, height),
      Phaser.Geom.Rectangle.Contains,
    );

    const swallowPanelTap = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    };

    panel.on("pointerdown", swallowPanelTap);
    panel.on("pointerup", swallowPanelTap);

    this.add
      .text(STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - height / 2 + 90, title, {
        fontFamily: FONTS.display,
        fontSize: "56px",
        fontStyle: "700",
        color: "#10a7eb",
      })
      .setOrigin(0.5);

    if (subtitle) {
      this.add
        .text(STAGE_WIDTH / 2, STAGE_HEIGHT / 2 - height / 2 + 148, subtitle, {
          fontFamily: FONTS.body,
          fontSize: "24px",
          color: "#60809a",
        })
        .setOrigin(0.5);
    }

    const closeButton = addTextButton(
      this,
      STAGE_WIDTH / 2 + 970 / 2 - 80,
      STAGE_HEIGHT / 2 - height / 2 + 88,
      96,
      96,
      "X",
      () => this.closeOverlay(),
      {
        backgroundColor: COLORS.panelSoft,
        labelColor: "#0a2942",
        radius: 48,
      },
    );

    closeButton.label.setFontSize("30px");

    return {
      centerX: STAGE_WIDTH / 2,
      centerY: STAGE_HEIGHT / 2 + 30,
      left: STAGE_WIDTH / 2 - 430,
      right: STAGE_WIDTH / 2 + 430,
      top: STAGE_HEIGHT / 2 - height / 2 + 200,
      bottom: STAGE_HEIGHT / 2 + height / 2 - 60,
    };
  }

  protected closeOverlay() {
    this.scene.stop();
  }
}
