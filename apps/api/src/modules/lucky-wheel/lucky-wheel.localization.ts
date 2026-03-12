import { AppLocale, EligibilityStatus } from "@lucky-wheel/contracts";

export const SUPPORTED_LOCALES: AppLocale[] = ["en", "ms", "zh-CN"];

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  ms: "Bahasa Melayu",
  "zh-CN": "简体中文",
};

const ELIGIBILITY_BUTTON_LABELS: Record<
  AppLocale,
  Record<EligibilityStatus, string>
> = {
  en: {
    [EligibilityStatus.PlayableNow]: "SPIN NOW",
    [EligibilityStatus.AlreadySpin]: "ALREADY SPIN",
    [EligibilityStatus.GoToDeposit]: "GO TO DEPOSIT",
    [EligibilityStatus.EventEnded]: "ENDED",
  },
  ms: {
    [EligibilityStatus.PlayableNow]: "PUSAR SEKARANG",
    [EligibilityStatus.AlreadySpin]: "SUDAH PUSAR",
    [EligibilityStatus.GoToDeposit]: "PERGI DEPOSIT",
    [EligibilityStatus.EventEnded]: "TAMAT",
  },
  "zh-CN": {
    [EligibilityStatus.PlayableNow]: "立即旋转",
    [EligibilityStatus.AlreadySpin]: "已旋转",
    [EligibilityStatus.GoToDeposit]: "前往充值",
    [EligibilityStatus.EventEnded]: "已结束",
  },
};

const HERO_STEPS_BY_LOCALE: Record<
  AppLocale,
  Array<{ title: string; subtitle: string; iconKey: string }>
> = {
  en: [
    {
      title: "Deposit Daily",
      subtitle: "RM50 unlocks today's shot.",
      iconKey: "deposit",
    },
    {
      title: "Spin & Score",
      subtitle: "Merchant API returns spin quota, the server resolves results.",
      iconKey: "spin",
    },
    {
      title: "Rank Up",
      subtitle: "Finish Top 30 for cash rewards.",
      iconKey: "rank",
    },
  ],
  ms: [
    {
      title: "Deposit Harian",
      subtitle: "RM50 membuka peluang hari ini.",
      iconKey: "deposit",
    },
    {
      title: "Putar & Skor",
      subtitle: "Merchant API memulangkan kuota, pelayan menentukan hasil.",
      iconKey: "spin",
    },
    {
      title: "Naik Rank",
      subtitle: "Tamatkan dalam Top 30 untuk hadiah tunai.",
      iconKey: "rank",
    },
  ],
  "zh-CN": [
    {
      title: "每日充值",
      subtitle: "单日 RM50 即可解锁当天机会。",
      iconKey: "deposit",
    },
    {
      title: "转动得分",
      subtitle: "Merchant API 返回额度，服务器判定结果。",
      iconKey: "spin",
    },
    {
      title: "冲击排名",
      subtitle: "进入前 30 可赢取现金奖励。",
      iconKey: "rank",
    },
  ],
};

export function resolveRequestedLocale(
  requestedLocale?: string,
  localeHeader?: string,
  acceptLanguage?: string,
): AppLocale {
  return (
    normalizeLocale(requestedLocale) ??
    normalizeLocale(localeHeader) ??
    normalizeLocale(acceptLanguage) ??
    "en"
  );
}

export function getSupportedLocaleOptions() {
  return SUPPORTED_LOCALES.map((code) => ({
    code,
    label: LOCALE_LABELS[code],
  }));
}

export function getEligibilityButtonLabel(
  status: EligibilityStatus,
  locale: AppLocale,
) {
  return ELIGIBILITY_BUTTON_LABELS[locale][status];
}

export function getHeroSteps(locale: AppLocale) {
  return HERO_STEPS_BY_LOCALE[locale];
}

function normalizeLocale(value?: string): AppLocale | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith("zh")) {
    return "zh-CN";
  }

  if (normalized.startsWith("ms")) {
    return "ms";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return undefined;
}
