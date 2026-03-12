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

  graphics.fillStyle(backgroundColor, 1);
  graphics.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  graphics.fillStyle(COLORS.white, 0.18);
  graphics.fillRoundedRect(
    -width * 0.38,
    -height * 0.34,
    width * 0.76,
    height * 0.24,
    radius,
  );

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
  container.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );
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
      graphics.clear();
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
    },
    setEnabled(enabled: boolean) {
      container.disableInteractive();
      if (enabled) {
        container.setInteractive(
          new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
          Phaser.Geom.Rectangle.Contains,
        );
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
  const bg = scene.add.circle(0, 0, 42, backgroundColor, 1);
  bg.setStrokeStyle(2, COLORS.line, 0.85);
  const icon = scene.add.image(0, 0, iconKey).setScale(0.7);
  bubble.add([bg, icon]);
  return bubble;
}
