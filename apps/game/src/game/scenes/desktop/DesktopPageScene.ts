import Phaser from "phaser";
import { prototypeState } from "../../state/prototype-state";
import { COLORS, SCENE_KEYS, STAGE_HEIGHT, STAGE_WIDTH } from "../../constants";
import {
  navigateToDesktopPage,
  wireImageButton,
} from "./desktopSceneShared";

export abstract class DesktopPageScene extends Phaser.Scene {
  protected cleanup: Array<() => void> = [];

  protected drawDesktopPageBackground() {
    this.cameras.main.setBackgroundColor(COLORS.pageTop);
    const background = this.add.graphics();
    background.fillGradientStyle(
      COLORS.pageTop,
      COLORS.pageTop,
      COLORS.pageBottom,
      COLORS.pageBottom,
      1,
    );
    background.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  }

  protected bindPrototypeLifecycle(onChange: () => void) {
    this.cleanup.push(
      prototypeState.subscribe("change", onChange),
      prototypeState.subscribe("locale-change", () => this.scene.restart()),
      prototypeState.subscribe("error", () => {
        if (!this.scene.isActive(SCENE_KEYS.ErrorOverlay)) {
          this.scene.launch(SCENE_KEYS.ErrorOverlay);
        }
      }),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanup.forEach((cleanup) => cleanup());
      this.cleanup = [];
    });

    if (!prototypeState.getSnapshot().currentEvent && !prototypeState.getSnapshot().isBootstrapping) {
      void prototypeState.bootstrap();
    }
  }

  protected addDesktopPageArrows(leftTarget: string, rightTarget: string) {
    const leftArrow = this.add.image(90, 520, "Desktop_ArrowPageLeft");
    wireImageButton(leftArrow, 1, () => this.navigateToPage(leftTarget));

    const rightArrow = this.add.image(1840, 520, "Desktop_ArrowPageRight");
    wireImageButton(rightArrow, 1, () => this.navigateToPage(rightTarget));
  }

  protected navigateToPage(targetKey: string) {
    navigateToDesktopPage(this, targetKey);
  }
}
