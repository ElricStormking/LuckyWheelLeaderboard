import Phaser from "phaser";
import { SCENE_KEYS } from "../constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Boot);
  }

  create() {
    this.scene.start(SCENE_KEYS.Preload);
  }
}
