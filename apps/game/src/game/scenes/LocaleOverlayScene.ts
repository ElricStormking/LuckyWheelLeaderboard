import Phaser from "phaser";
import type { AppLocale } from "@lucky-wheel/contracts";
import { prototypeState } from "../state/prototype-state";
import { BaseOverlayScene } from "./BaseOverlayScene";
import { FONTS, SCENE_KEYS, STAGE_HEIGHT, STAGE_WIDTH } from "../constants";

type LocaleMenuOption = {
  code: AppLocale;
  label: string;
};

const HEADER_HEIGHT = 126;
const HEADER_COLOR = 0x08aee4;
const ACTIVE_TEXT_COLOR = "#08aee4";
const BODY_TEXT_COLOR = "#202020";
const FLAG_TEXTURE_KEYS: Record<AppLocale, string> = {
  en: "Mobile_LocaleFlagUnitedStates",
  "zh-CN": "Mobile_LocaleFlagChina",
  ms: "Mobile_LocaleFlagMalaysia",
};
const LANGUAGE_ORDER: AppLocale[] = ["en", "zh-CN", "ms"];

export class LocaleOverlayScene extends BaseOverlayScene {
  private isChangingLocale = false;

  constructor() {
    super(SCENE_KEYS.LocaleOverlay);
  }

  create() {
    this.isChangingLocale = false;

    const snapshot = prototypeState.getSnapshot();
    const menuOptions = this.getMenuOptions(snapshot.supportedLocales);
    const swallowMenuTap = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    };

    this.add
      .rectangle(STAGE_WIDTH / 2, STAGE_HEIGHT / 2, STAGE_WIDTH, STAGE_HEIGHT, 0xffffff, 1)
      .setInteractive()
      .on("pointerdown", swallowMenuTap)
      .on("pointerup", swallowMenuTap);

    this.add
      .rectangle(STAGE_WIDTH / 2, HEADER_HEIGHT / 2, STAGE_WIDTH, HEADER_HEIGHT, HEADER_COLOR, 1)
      .setInteractive()
      .on("pointerdown", swallowMenuTap)
      .on("pointerup", swallowMenuTap);

    this.add
      .text(STAGE_WIDTH / 2, HEADER_HEIGHT / 2, "Region and Language", {
        fontFamily: FONTS.body,
        fontSize: "40px",
        fontStyle: "700",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.drawCloseButton();
    this.drawRegion(snapshot.locale);
    this.drawLanguageOptions(menuOptions, snapshot.locale);
  }

  private drawCloseButton() {
    const x = STAGE_WIDTH - 86;
    const y = HEADER_HEIGHT / 2;
    const icon = this.add.graphics();
    icon.lineStyle(8, 0xffffff, 1);
    icon.beginPath();
    icon.moveTo(x - 25, y - 25);
    icon.lineTo(x + 25, y + 25);
    icon.moveTo(x + 25, y - 25);
    icon.lineTo(x - 25, y + 25);
    icon.strokePath();

    const hitArea = this.add.rectangle(x, y, 136, HEADER_HEIGHT, 0xffffff, 0.001);
    hitArea.setInteractive({ useHandCursor: true });
    const swallowCloseTap = (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    };

    hitArea.on("pointerdown", swallowCloseTap);
    hitArea.on("pointerup", (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      this.closeOverlay();
    });
  }

  private drawRegion(locale: AppLocale) {
    const regionY = 310;
    const flag = this.createLocaleFlag(443, regionY, locale);
    flag.setDisplaySize(134, 134);

    this.add
      .text(575, regionY, this.getRegionName(locale), {
        fontFamily: FONTS.body,
        fontSize: "36px",
        fontStyle: "400",
        color: "#000000",
      })
      .setOrigin(0, 0.5);
  }

  private drawLanguageOptions(options: LocaleMenuOption[], currentLocale: AppLocale) {
    const languageY = 529;
    const languageXs = [255, 540, 825];
    const dividerXs = [400, 688];

    dividerXs.forEach((x) => {
      const divider = this.add.graphics();
      divider.lineStyle(2, 0x555555, 1);
      divider.beginPath();
      divider.moveTo(x, languageY - 30);
      divider.lineTo(x, languageY + 30);
      divider.strokePath();
    });

    options.forEach((option, index) => {
      const x = languageXs[index] ?? STAGE_WIDTH / 2;
      const isCurrent = option.code === currentLocale;
      const label = this.add
        .text(x, languageY, option.label, {
          fontFamily: FONTS.body,
          fontSize: "36px",
          fontStyle: isCurrent ? "700" : "400",
          color: isCurrent ? ACTIVE_TEXT_COLOR : BODY_TEXT_COLOR,
        })
        .setOrigin(0.5);

      const hitArea = this.add.rectangle(x, languageY, 220, 92, 0xffffff, 0.001);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on("pointerdown", (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.selectLocale(option.code, hitArea);
      });
      hitArea.on("pointerover", () => label.setScale(1.04));
      hitArea.on("pointerout", () => label.setScale(1));
    });
  }

  private selectLocale(locale: AppLocale, hitArea: Phaser.GameObjects.Rectangle) {
    if (this.isChangingLocale) {
      return;
    }

    this.isChangingLocale = true;
    hitArea.disableInteractive();

    void prototypeState.setLocale(locale)
      .then(() => {
        this.isChangingLocale = false;
        this.scene.restart();
      })
      .catch(() => {
        this.isChangingLocale = false;
        hitArea.setInteractive({ useHandCursor: true });
      });
  }

  private getMenuOptions(supportedLocales: Array<{ code: AppLocale; label: string }>) {
    const optionByCode = new Map(supportedLocales.map((option) => [option.code, option]));
    return LANGUAGE_ORDER
      .map((code) => optionByCode.get(code) ?? { code, label: this.getLocaleLabel(code) })
      .map((option) => ({
        code: option.code,
        label: this.getLocaleLabel(option.code),
      }));
  }

  private getLocaleLabel(code: AppLocale) {
    switch (code) {
      case "zh-CN":
        return "简体中文";
      case "ms":
        return "Malay";
      case "en":
      default:
        return "English";
    }
  }

  private getRegionName(code: AppLocale) {
    switch (code) {
      case "zh-CN":
        return "China";
      case "ms":
        return "Malaysia";
      case "en":
      default:
        return "United States";
    }
  }

  private createLocaleFlag(x: number, y: number, locale: AppLocale) {
    switch (locale) {
      case "zh-CN":
        return this.createChinaFlag(x, y);
      case "ms":
        return this.createMalaysiaFlag(x, y);
      case "en":
      default:
        return this.createUnitedStatesFlag(x, y);
    }
  }

  private createUnitedStatesFlag(x: number, y: number) {
    const key = FLAG_TEXTURE_KEYS.en;
    if (!this.textures.exists(key)) {
      this.createUnitedStatesFlagTexture(key);
    }

    return this.add.image(x, y, key);
  }

  private createUnitedStatesFlagTexture(key: string) {
    const size = 192;
    const radius = size / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.save();
    context.beginPath();
    context.arc(radius, radius, radius - 2, 0, Math.PI * 2);
    context.clip();

    const stripeHeight = size / 13;
    for (let index = 0; index < 13; index += 1) {
      context.fillStyle = index % 2 === 0 ? "#b22234" : "#ffffff";
      context.fillRect(0, index * stripeHeight, size, stripeHeight + 0.75);
    }

    const unionWidth = size * 0.47;
    const unionHeight = stripeHeight * 7;
    context.fillStyle = "#3c3b6e";
    context.fillRect(0, 0, unionWidth, unionHeight);

    context.fillStyle = "#ffffff";
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        context.beginPath();
        context.arc(18 + column * 18, 16 + row * 16, 2.9, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.restore();
    this.strokeCircularFlagBorder(context, radius);
    this.textures.addCanvas(key, canvas);
  }

  private createChinaFlag(x: number, y: number) {
    const key = FLAG_TEXTURE_KEYS["zh-CN"];
    if (!this.textures.exists(key)) {
      this.createChinaFlagTexture(key);
    }

    return this.add.image(x, y, key);
  }

  private createChinaFlagTexture(key: string) {
    const size = 192;
    const radius = size / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.save();
    context.beginPath();
    context.arc(radius, radius, radius - 2, 0, Math.PI * 2);
    context.clip();

    context.fillStyle = "#de2910";
    context.fillRect(0, 0, size, size);

    const bigStar = { x: size * 0.27, y: size * 0.31 };
    const smallStars = [
      { x: size * 0.43, y: size * 0.18, outer: size * 0.045 },
      { x: size * 0.5, y: size * 0.3, outer: size * 0.045 },
      { x: size * 0.5, y: size * 0.44, outer: size * 0.045 },
      { x: size * 0.43, y: size * 0.56, outer: size * 0.045 },
    ];

    context.fillStyle = "#ffde00";
    this.drawCanvasStar(context, bigStar.x, bigStar.y, size * 0.105, size * 0.044, 5);
    smallStars.forEach((star) => {
      const rotation = Math.atan2(bigStar.y - star.y, bigStar.x - star.x);
      this.drawCanvasStar(context, star.x, star.y, star.outer, star.outer * 0.42, 5, rotation);
    });

    context.restore();
    this.strokeCircularFlagBorder(context, radius);
    this.textures.addCanvas(key, canvas);
  }

  private createMalaysiaFlag(x: number, y: number) {
    const key = FLAG_TEXTURE_KEYS.ms;
    if (!this.textures.exists(key)) {
      this.createMalaysiaFlagTexture(key);
    }

    return this.add.image(x, y, key);
  }

  private createMalaysiaFlagTexture(key: string) {
    const size = 192;
    const radius = size / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.save();
    context.beginPath();
    context.arc(radius, radius, radius - 2, 0, Math.PI * 2);
    context.clip();

    const stripeHeight = size / 14;
    for (let index = 0; index < 14; index += 1) {
      context.fillStyle = index % 2 === 0 ? "#cc0001" : "#ffffff";
      context.fillRect(0, index * stripeHeight, size, stripeHeight + 0.75);
    }

    context.fillStyle = "#010066";
    context.fillRect(0, 0, size * 0.52, stripeHeight * 8);

    context.fillStyle = "#ffcc00";
    context.beginPath();
    context.arc(size * 0.25, size * 0.28, size * 0.16, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#010066";
    context.beginPath();
    context.arc(size * 0.3, size * 0.28, size * 0.14, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ffcc00";
    this.drawCanvasStar(
      context,
      size * 0.39,
      size * 0.28,
      size * 0.115,
      size * 0.047,
      14,
      -Math.PI / 2,
    );

    context.restore();
    this.strokeCircularFlagBorder(context, radius);
    this.textures.addCanvas(key, canvas);
  }

  private strokeCircularFlagBorder(context: CanvasRenderingContext2D, radius: number) {
    context.strokeStyle = "#e6e6e6";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(radius, radius, radius - 1, 0, Math.PI * 2);
    context.stroke();
  }

  private drawCanvasStar(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    outerRadius: number,
    innerRadius: number,
    points: number,
    rotation = -Math.PI / 2,
  ) {
    context.beginPath();
    for (let index = 0; index < points * 2; index += 1) {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angle = rotation + (Math.PI * index) / points;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;
      if (index === 0) {
        context.moveTo(pointX, pointY);
      } else {
        context.lineTo(pointX, pointY);
      }
    }
    context.closePath();
    context.fill();
  }
}
