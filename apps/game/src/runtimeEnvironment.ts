export type GameLayout = "mobile" | "desktop";

const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i;

export function isMobileBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  const url = new URL(window.location.href);
  const override = url.searchParams.get("layout");
  if (override === "mobile") {
    return true;
  }
  if (override === "desktop") {
    return false;
  }

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const viewportWidth = window.screen?.width ?? window.innerWidth;
  const viewportHeight = window.screen?.height ?? window.innerHeight;
  const compactScreen = Math.min(viewportWidth, viewportHeight) <= 1366;

  return MOBILE_USER_AGENT.test(window.navigator.userAgent) || (coarsePointer && compactScreen);
}

export function detectGameLayout(): GameLayout {
  return isMobileBrowser() ? "mobile" : "desktop";
}

export function applyGameLayout(layout: GameLayout) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("desktop-framed", layout === "desktop");
  document.documentElement.classList.toggle("mobile-immersive", layout === "mobile");

  document.querySelector<HTMLElement>("#app-shell")?.setAttribute("data-layout", layout);
}
