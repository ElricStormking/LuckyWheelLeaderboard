import Phaser from "phaser";
import type { AppLocale } from "@lucky-wheel/contracts";
import { COLORS, FONTS } from "./constants";
import { toIntlLocale } from "./i18n";

type PanelOptions = {
  fillColor?: number;
  fillAlpha?: number;
  strokeColor?: number;
  strokeAlpha?: number;
  radius?: number;
};

type ButtonOptions = {
  backgroundColor?: number;
  labelColor?: string;
  radius?: number;
  shape?: "rounded-rect" | "circle";
};

export function formatNumber(value: number, locale: AppLocale = "en") {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(value);
}

export function formatDate(
  value: string | number | Date,
  locale: AppLocale = "en",
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(toIntlLocale(locale), options).format(new Date(value));
}

export function formatTime(
  value: string | number | Date,
  locale: AppLocale = "en",
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(new Date(value));
}

export function openExternalLink(url?: string) {
  if (!url) {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export function createClientUuid() {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  const fallback = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(
    32,
    "0",
  );
  return [
    fallback.slice(0, 8),
    fallback.slice(8, 12),
    `4${fallback.slice(13, 16)}`,
    `a${fallback.slice(17, 20)}`,
    fallback.slice(20, 32),
  ].join("-");
}

export function addRoundedPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  options: PanelOptions = {},
) {
  const container = scene.add.container(x, y);
  const graphics = scene.add.graphics();
  const radius = options.radius ?? 32;
  const fillColor = options.fillColor ?? COLORS.panel;
  const fillAlpha = options.fillAlpha ?? 0.96;
  const strokeColor = options.strokeColor ?? COLORS.line;
  const strokeAlpha = options.strokeAlpha ?? 0.9;

  graphics.fillStyle(fillColor, fillAlpha);
  graphics.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  graphics.lineStyle(2, strokeColor, strokeAlpha);
  graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  graphics.fillStyle(COLORS.white, 0.14);
  graphics.fillRoundedRect(
    -width * 0.36,
    -height * 0.37,
    width * 0.72,
    height * 0.28,
    radius,
  );

  container.add(graphics);
  return container;
}

export function addTextButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {},
) {
  const container = scene.add.container(x, y);
  const graphics = scene.add.graphics();
  const radius = options.radius ?? 30;
  const backgroundColor = options.backgroundColor ?? COLORS.primary;
  const labelColor = options.labelColor ?? "#ffffff";
  const shape = options.shape ?? "rounded-rect";
  const circleRadius = Math.min(width, height) / 2;

  const drawBackground = (color: number) => {
    graphics.clear();

    if (shape === "circle") {
      graphics.fillStyle(color, 0.94);
      graphics.fillCircle(0, 0, circleRadius);
      graphics.fillStyle(COLORS.white, 0.14);
      graphics.fillEllipse(0, -height * 0.18, width * 0.76, height * 0.28);
      return;
    }

    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    graphics.fillStyle(COLORS.white, 0.18);
    graphics.fillRoundedRect(
      -width * 0.38,
      -height * 0.34,
      width * 0.76,
      height * 0.24,
      radius,
    );
  };

  drawBackground(backgroundColor);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONTS.display,
      fontSize: "32px",
      color: labelColor,
      fontStyle: "700",
    })
    .setOrigin(0.5);

  container.add([graphics, text]);
  container.setSize(width, height);
  const setInteractiveShape = () => {
    container.disableInteractive();

    if (shape === "circle") {
      container.setInteractive(
        new Phaser.Geom.Circle(0, 0, circleRadius),
        Phaser.Geom.Circle.Contains,
      );
      return;
    }

    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
  };

  setInteractiveShape();
  container.on("pointerup", onClick);
  container.on("pointerover", () => {
    container.setScale(1.02);
  });
  container.on("pointerout", () => {
    container.setScale(1);
  });

  return {
    container,
    label: text,
    setLabel(nextLabel: string) {
      text.setText(nextLabel);
    },
    setBackground(color: number) {
      drawBackground(color);
    },
    setEnabled(enabled: boolean) {
      container.disableInteractive();
      if (enabled) {
        setInteractiveShape();
      }

      container.setAlpha(enabled ? 1 : 0.72);
    },
  };
}

export function addPill(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  fillColor = COLORS.panel,
  textColor = "#0a2942",
) {
  const container = addRoundedPanel(scene, x, y, width, height, {
    fillColor,
    fillAlpha: 0.98,
    radius: height / 2,
  });

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONTS.body,
      fontSize: "26px",
      fontStyle: "700",
      color: textColor,
    })
    .setOrigin(0.5);

  container.add(text);
  return { container, text };
}

export function createSectionTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
) {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONTS.display,
      fontSize: "42px",
      fontStyle: "700",
      color: "#eafaff",
    })
    .setOrigin(0.5);
}

export function drawCircleIcon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  iconKey: string,
  backgroundColor = COLORS.panel,
) {
  const bubble = scene.add.container(x, y);
  const shadow = scene.add.circle(4, 8, 42, 0x5fa8c9, 0.18);
  const bg = scene.add.circle(0, 0, 42, backgroundColor, 0.98);
  bg.setStrokeStyle(2, 0xe6f7ff, 0.95);
  const icon = scene.add.image(0, 0, iconKey).setScale(0.82);
  bubble.add([shadow, bg, icon]);
  return bubble;
}
