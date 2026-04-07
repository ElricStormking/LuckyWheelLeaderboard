import Phaser from "phaser";
import { EventStatus } from "@lucky-wheel/contracts";
import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { COLORS, FONTS, SCENE_KEYS } from "../constants";

type PeriodEntry = {
  id: string;
  code: string;
  title: string;
  shortDescription: string;
  promotionPeriodLabel: string;
  status: EventStatus;
};

type StatusTone = {
  accent: number;
  deep: number;
  soft: number;
  wash: number;
  edge: number;
  chipText: string;
  dateText: string;
};

const CARD_WIDTH = 860;
const CARD_HEIGHT = 184;
const CARD_RADIUS = 18;
const CARD_STEP_Y = 214;
const STATUS_BAY_WIDTH = 116;
const CURRENT_EVENT_POINTER_ACCENT = 0x1db9ff;
const CURRENT_EVENT_POINTER_DEEP = 0x0c7bbd;

export class PeriodOverlayScene extends BaseOverlayScene {
  private isSelectingEvent = false;

  constructor() {
    super(SCENE_KEYS.PeriodOverlay);
  }

  create() {
    this.isSelectingEvent = false;

    const frame = this.createFrame(
      prototypeState.t("period.title"),
      prototypeState.t("period.subtitle"),
      1460,
    );
    const snapshot = prototypeState.getSnapshot();

    snapshot.events.forEach((entry, index) => {
      const y = frame.top + 124 + index * CARD_STEP_Y;
      this.drawEventPlate(entry as PeriodEntry, y, entry.id === snapshot.currentEvent?.id);
    });
  }

  private drawEventPlate(entry: PeriodEntry, y: number, isSelected: boolean) {
    const tone = this.getStatusTone(entry.status);
    const card = this.add.container(540, y);
    card.setDepth(isSelected ? 2 : 1);

    const shadow = this.add.graphics();
    shadow.fillStyle(isSelected ? tone.accent : tone.deep, isSelected ? 0.16 : 0.08);
    shadow.fillRoundedRect(
      -CARD_WIDTH / 2 + 10,
      -CARD_HEIGHT / 2 + 10,
      CARD_WIDTH,
      CARD_HEIGHT,
      CARD_RADIUS,
    );

    const plate = this.add.graphics();
    plate.fillStyle(isSelected ? 0xf7fcff : COLORS.white, 1);
    plate.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
    plate.lineStyle(2, isSelected ? tone.accent : tone.edge, 0.92);
    plate.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);

    plate.fillStyle(tone.wash, isSelected ? 0.96 : 0.82);
    plate.fillRoundedRect(-CARD_WIDTH / 2 + 14, -CARD_HEIGHT / 2 + 14, CARD_WIDTH - 28, 48, 10);

    plate.fillStyle(tone.soft, isSelected ? 0.9 : 0.62);
    plate.fillRoundedRect(
      -CARD_WIDTH / 2 + 14,
      -CARD_HEIGHT / 2 + 14,
      STATUS_BAY_WIDTH,
      CARD_HEIGHT - 28,
      14,
    );

    plate.fillStyle(tone.accent, isSelected ? 0.2 : 0.1);
    plate.fillRoundedRect(-CARD_WIDTH / 2 + STATUS_BAY_WIDTH + 26, -CARD_HEIGHT / 2 + 24, 286, 18, 9);

    plate.lineStyle(2, tone.accent, 0.22);
    plate.beginPath();
    plate.moveTo(-CARD_WIDTH / 2 + STATUS_BAY_WIDTH + 18, -CARD_HEIGHT / 2 + 22);
    plate.lineTo(-CARD_WIDTH / 2 + STATUS_BAY_WIDTH + 18, CARD_HEIGHT / 2 - 22);
    plate.strokePath();

    card.add([shadow, plate]);
    if (isSelected) {
      card.add(this.createSelectionPointer());
    }
    card.add(this.createStatusTower(tone, entry.status));

    const title = this.add
      .text(-CARD_WIDTH / 2 + 138, -38, entry.title, {
        fontFamily: FONTS.display,
        fontSize: "36px",
        fontStyle: "700",
        color: "#0a2942",
      })
      .setOrigin(0, 0.5);

    const description = this.add
      .text(-CARD_WIDTH / 2 + 138, 18, entry.code || entry.id, {
        fontFamily: FONTS.body,
        fontSize: "21px",
        color: "#597a95",
        wordWrap: { width: 500, useAdvancedWrap: true },
      })
      .setOrigin(0, 0.5);

    const dateText = this.add
      .text(CARD_WIDTH / 2 - 18, -40, entry.promotionPeriodLabel, {
        fontFamily: FONTS.body,
        fontSize: "22px",
        fontStyle: "700",
        color: tone.dateText,
        align: "right",
      })
      .setOrigin(1, 0.5);

    const chip = this.createStatusChip(
      CARD_WIDTH / 2 - 110,
      46,
      isSelected ? prototypeState.t("period.selected") : this.getStatusLabel(entry.status),
      tone,
      isSelected,
    );

    card.add([title, description, dateText, chip]);
    const hitArea = this.add
      .rectangle(540, y, CARD_WIDTH, CARD_HEIGHT, 0xffffff, 0.001)
      .setDepth(card.depth + 1);
    hitArea.setInteractive({ useHandCursor: true });
    const beginSelection = () => {
      if (this.isSelectingEvent) {
        return;
      }

      this.isSelectingEvent = true;
      hitArea.disableInteractive();

      void prototypeState.selectEvent(entry.id)
        .then(() => this.closeOverlay())
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
    hitArea.on("pointerover", () => card.setScale(1.01));
    hitArea.on("pointerout", () => card.setScale(1));
    hitArea.on("pointerup", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    });
  }

  private createStatusTower(tone: StatusTone, status: EventStatus) {
    const tower = this.add.container(-CARD_WIDTH / 2 + 70, 10);

    const shadow = this.add.graphics();
    shadow.fillStyle(tone.deep, 0.14);
    shadow.fillRoundedRect(-20, -44, 40, 106, 16);
    shadow.fillCircle(0, -66, 26);

    const body = this.add.graphics();
    body.fillStyle(tone.deep, 0.98);
    body.fillRoundedRect(-18, -48, 36, 112, 16);
    body.fillStyle(tone.accent, 1);
    body.fillRoundedRect(-7, -28, 14, 76, 7);
    body.fillStyle(0xffffff, 0.2);
    body.fillRoundedRect(-7, -28, 14, 18, 7);

    body.fillStyle(tone.deep, 1);
    body.fillCircle(0, -66, 24);
    body.lineStyle(3, tone.accent, 0.95);
    body.strokeCircle(0, -66, 20);
    body.fillStyle(tone.soft, 0.96);
    body.fillCircle(0, 58, 11);

    tower.add([shadow, body, this.createStatusGlyph(status)]);
    return tower;
  }

  private createSelectionPointer() {
    const pointer = this.add.container(-CARD_WIDTH / 2 - 18, 10);

    const shadow = this.add.graphics();
    shadow.fillStyle(CURRENT_EVENT_POINTER_DEEP, 0.18);
    shadow.fillTriangle(-18, -24, 16, 0, -18, 24);

    const body = this.add.graphics();
    body.fillStyle(CURRENT_EVENT_POINTER_ACCENT, 0.98);
    body.fillTriangle(-22, -26, 14, 0, -22, 26);

    const highlight = this.add.graphics();
    highlight.fillStyle(0xffffff, 0.24);
    highlight.fillTriangle(-18, -13, 1, -2, -18, 9);

    pointer.add([shadow, body, highlight]);
    return pointer;
  }

  private createStatusGlyph(status: EventStatus) {
    const glyph = this.add.graphics();

    switch (status) {
      case EventStatus.Live:
        glyph.fillStyle(0xffffff, 1);
        glyph.fillCircle(0, -66, 4);
        glyph.lineStyle(2.5, 0xffffff, 0.95);
        glyph.strokeCircle(0, -66, 10);
        glyph.strokeCircle(0, -66, 16);
        return glyph;

      case EventStatus.Ended:
        glyph.lineStyle(3, 0xffffff, 1);
        glyph.beginPath();
        glyph.moveTo(-10, -78);
        glyph.lineTo(10, -58);
        glyph.moveTo(-10, -58);
        glyph.lineTo(10, -78);
        glyph.strokePath();
        return glyph;

      case EventStatus.Finalized:
      default:
        glyph.lineStyle(3.5, 0xffffff, 1);
        glyph.beginPath();
        glyph.moveTo(-11, -66);
        glyph.lineTo(-3, -57);
        glyph.lineTo(13, -74);
        glyph.strokePath();
        return glyph;
    }
  }

  private createStatusChip(
    x: number,
    y: number,
    label: string,
    tone: StatusTone,
    isSelected: boolean,
  ) {
    const chip = this.add.container(x, y);
    const bg = this.add.graphics();
    const fill = isSelected ? tone.accent : tone.deep;

    bg.fillStyle(fill, 0.96);
    bg.fillRoundedRect(-92, -28, 184, 56, 14);
    bg.lineStyle(1, 0xffffff, 0.14);
    bg.strokeRoundedRect(-92, -28, 184, 56, 14);
    bg.fillStyle(0xffffff, 0.12);
    bg.fillRoundedRect(-70, -18, 140, 16, 6);

    const text = this.add
      .text(0, 1, label, {
        fontFamily: FONTS.body,
        fontSize: "17px",
        fontStyle: "700",
        color: tone.chipText,
      })
      .setOrigin(0.5);

    chip.add([bg, text]);
    return chip;
  }

  private getStatusTone(status: EventStatus): StatusTone {
    switch (status) {
      case EventStatus.Live:
        return {
          accent: 0x1db9ff,
          deep: 0x0c7bbd,
          soft: 0xd9f4ff,
          wash: 0xebf9ff,
          edge: 0x9bdcff,
          chipText: "#ffffff",
          dateText: "#2f6888",
        };
      case EventStatus.Ended:
        return {
          accent: 0xf1b34a,
          deep: 0x8d6726,
          soft: 0xffefcc,
          wash: 0xfff7e7,
          edge: 0xf7d28c,
          chipText: "#ffffff",
          dateText: "#7d6135",
        };
      case EventStatus.Finalized:
      default:
        return {
          accent: 0x7b95af,
          deep: 0x546d87,
          soft: 0xe7eef5,
          wash: 0xf5f8fb,
          edge: 0xb9cfdf,
          chipText: "#ffffff",
          dateText: "#4d6b82",
        };
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
