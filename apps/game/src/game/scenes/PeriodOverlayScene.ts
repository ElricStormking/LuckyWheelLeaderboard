import Phaser from "phaser";
import { EventStatus } from "@lucky-wheel/contracts";
import { prototypeState } from "../state/prototype-state";
import { FONTS, SCENE_KEYS, STAGE_HEIGHT, STAGE_WIDTH } from "../constants";

type PeriodEntry = {
  id: string;
  title: string;
  promotionPeriodLabel: string;
  status: EventStatus;
};

const PANEL_TOP = 218;
const PANEL_WIDTH = 860;
const PANEL_HEIGHT = 1348;
const PANEL_RADIUS = 38;
const ROW_HEIGHT = 154;
const MODAL_DEPTH = 50;

export class PeriodOverlayScene extends Phaser.Scene {
  private isSelectingEvent = false;

  constructor() {
    super(SCENE_KEYS.PeriodOverlay);
  }

  create() {
    this.isSelectingEvent = false;

    const snapshot = prototypeState.getSnapshot();
    const events = snapshot.events as PeriodEntry[];

    if (events.length === 0) {
      this.scene.stop();
      return;
    }

    const modal = this.add.container(0, 0);
    modal.setDepth(MODAL_DEPTH);

    const swallowTap = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    };

    const backdrop = this.add
      .rectangle(STAGE_WIDTH / 2, STAGE_HEIGHT / 2, STAGE_WIDTH, STAGE_HEIGHT, 0xffffff, 0.001)
      .setInteractive();
    backdrop.on("pointerdown", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.scene.stop();
    });
    backdrop.on("pointerup", swallowTap);
    modal.add(backdrop);

    this.drawDropdownPanel(modal, swallowTap);

    const panelLeft = STAGE_WIDTH / 2 - PANEL_WIDTH / 2;
    const maxRows = Math.min(events.length, Math.floor((PANEL_HEIGHT - 36) / ROW_HEIGHT));
    events.slice(0, maxRows).forEach((entry, index) => {
      this.drawEventRow(
        modal,
        entry,
        panelLeft,
        PANEL_TOP + 52 + index * ROW_HEIGHT,
      );
    });
  }

  private drawDropdownPanel(
    modal: Phaser.GameObjects.Container,
    swallowTap: (
      pointer: Phaser.Input.Pointer,
      localX: number,
      localY: number,
      event: Phaser.Types.Input.EventData,
    ) => void,
  ) {
    const panelX = STAGE_WIDTH / 2;
    const panelLeft = panelX - PANEL_WIDTH / 2;
    const panel = this.add.container(0, 0);
    const shadow = this.add.graphics();

    const shadowLayers = [
      { inset: -28, offsetY: 20, alpha: 0.035, radiusOffset: 28 },
      { inset: -18, offsetY: 14, alpha: 0.055, radiusOffset: 20 },
      { inset: -9, offsetY: 8, alpha: 0.08, radiusOffset: 12 },
      { inset: 0, offsetY: 3, alpha: 0.13, radiusOffset: 0 },
    ] as const;
    shadowLayers.forEach((layer) => {
      shadow.fillStyle(0x000000, layer.alpha);
      shadow.fillRoundedRect(
        panelLeft + layer.inset,
        PANEL_TOP + layer.offsetY + layer.inset,
        PANEL_WIDTH - layer.inset * 2,
        PANEL_HEIGHT - layer.inset * 2,
        PANEL_RADIUS + layer.radiusOffset,
      );
    });

    const background = this.add.graphics();
    background.fillStyle(0xffffff, 0.98);
    background.fillRoundedRect(panelLeft, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS);
    background.lineStyle(1.5, 0xffffff, 0.9);
    background.strokeRoundedRect(panelLeft + 1, PANEL_TOP + 1, PANEL_WIDTH - 2, PANEL_HEIGHT - 2, PANEL_RADIUS - 1);

    const panelHitArea = this.add
      .rectangle(panelX, PANEL_TOP + PANEL_HEIGHT / 2, PANEL_WIDTH, PANEL_HEIGHT, 0xffffff, 0.001)
      .setInteractive();
    panelHitArea.on("pointerdown", swallowTap);
    panelHitArea.on("pointerup", swallowTap);

    panel.add([shadow, background, panelHitArea]);
    modal.add(panel);
  }

  private drawEventRow(
    modal: Phaser.GameObjects.Container,
    entry: PeriodEntry,
    panelLeft: number,
    rowTop: number,
  ) {
    const row = this.add.container(0, 0);
    const title = this.add
      .text(panelLeft + 48, rowTop, entry.title, {
        fontFamily: FONTS.display,
        fontSize: "38px",
        fontStyle: "700",
        color: "#050505",
        wordWrap: { width: PANEL_WIDTH - 300, useAdvancedWrap: false },
      })
      .setOrigin(0, 0);

    const period = this.add
      .text(panelLeft + 48, rowTop + 58, entry.promotionPeriodLabel, {
        fontFamily: FONTS.body,
        fontSize: "36px",
        fontStyle: "400",
        color: "#8c8c8c",
        wordWrap: { width: PANEL_WIDTH - 300, useAdvancedWrap: false },
      })
      .setOrigin(0, 0);

    const chip = this.createStatusChip(panelLeft + PANEL_WIDTH - 138, rowTop + 48, entry.status);

    const hitArea = this.add
      .rectangle(panelLeft + PANEL_WIDTH / 2, rowTop + ROW_HEIGHT / 2 - 2, PANEL_WIDTH, ROW_HEIGHT, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });

    const beginSelection = () => {
      if (this.isSelectingEvent) {
        return;
      }

      this.isSelectingEvent = true;
      hitArea.disableInteractive();

      void prototypeState.selectEvent(entry.id)
        .then(() => this.scene.stop())
        .catch(() => {
          this.isSelectingEvent = false;
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
    hitArea.on("pointerover", () => title.setColor("#0b9fd9"));
    hitArea.on("pointerout", () => title.setColor("#050505"));
    hitArea.on("pointerup", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    });

    row.add([title, period, chip, hitArea]);
    modal.add(row);
  }

  private createStatusChip(x: number, y: number, status: EventStatus) {
    const chip = this.add.container(x, y);
    const bg = this.add.graphics();
    const isLive = status === EventStatus.Live;

    bg.fillStyle(isLive ? 0x06aee4 : 0xc4c4c4, 1);
    bg.fillRoundedRect(-115, -45, 230, 90, 45);

    const text = this.add
      .text(0, 1, isLive ? "Active" : "Expired", {
        fontFamily: FONTS.body,
        fontSize: "36px",
        fontStyle: "700",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    chip.add([bg, text]);
    return chip;
  }
}
