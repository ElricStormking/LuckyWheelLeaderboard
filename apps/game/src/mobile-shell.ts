type OverlayMode = "hidden" | "android" | "ios-intro" | "ios-steps" | "rotate";

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type FullscreenCapableElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type MobileLaunchElements = {
  overlay: HTMLDivElement;
  title: HTMLHeadingElement;
  orientation: HTMLDivElement;
  orientationLabel: HTMLParagraphElement;
  steps: HTMLOListElement;
  note: HTMLParagraphElement;
  primary: HTMLButtonElement;
  secondary: HTMLButtonElement;
};

const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i;
const IOS_USER_AGENT = /iPhone|iPad|iPod/i;

export function mountMobileShellController() {
  const elements = resolveElements();
  if (!elements) {
    return {
      destroy() {
        // Missing launch shell nodes; no-op cleanup keeps main boot path simple.
      },
    };
  }

  let dismissed = false;
  let overlayMode: OverlayMode = "hidden";

  const showOverlay = (mode: Exclude<OverlayMode, "hidden">) => {
    overlayMode = mode;
    renderOverlay(elements, mode);
  };

  const handleResize = () => {
    applyShellState();
  };

  const handlePrimaryButtonClick = () => {
    void handlePrimaryClick();
  };

  const handlePrimaryClick = async () => {
    if (overlayMode === "android") {
      try {
        await requestAppFullscreen();
      } catch (error) {
        console.warn("Lucky Wheel fullscreen request failed.", error);
      } finally {
        dismissed = true;
        applyShellState();
      }
      return;
    }

    if (overlayMode === "ios-intro") {
      showOverlay("ios-steps");
    }
  };

  const handleSecondaryClick = () => {
    dismissed = true;
    hideOverlay(elements);
  };

  const applyShellState = () => {
    const mobile = isMobileDevice();
    const rotateRequired = mobile && isLandscapeOrientation();
    const fullscreenActive = isFullscreenActive();
    const standaloneActive = isStandaloneMode();

    document.documentElement.classList.toggle("desktop-framed", !mobile);
    document.documentElement.classList.toggle("mobile-immersive", mobile);
    document.documentElement.classList.toggle("fullscreen-active", fullscreenActive);
    document.documentElement.classList.toggle("standalone-active", standaloneActive);

    if (!mobile) {
      hideOverlay(elements);
      return;
    }

    if (rotateRequired) {
      showOverlay("rotate");
      return;
    }

    if (fullscreenActive || standaloneActive || dismissed) {
      hideOverlay(elements);
      return;
    }

    if (isIosBrowser()) {
      showOverlay(overlayMode === "ios-steps" ? "ios-steps" : "ios-intro");
      return;
    }

    if (canRequestFullscreen()) {
      showOverlay("android");
      return;
    }

    dismissed = true;
    hideOverlay(elements);
  };

  elements.primary.addEventListener("click", handlePrimaryButtonClick);
  elements.secondary.addEventListener("click", handleSecondaryClick);
  window.addEventListener("resize", handleResize, { passive: true });
  window.addEventListener("orientationchange", handleResize, { passive: true });
  document.addEventListener("fullscreenchange", applyShellState);

  applyShellState();

  return {
    destroy() {
      hideOverlay(elements);
      elements.primary.removeEventListener("click", handlePrimaryButtonClick);
      elements.secondary.removeEventListener("click", handleSecondaryClick);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      document.removeEventListener("fullscreenchange", applyShellState);
    },
  };
}

function resolveElements(): MobileLaunchElements | null {
  const overlay = document.querySelector<HTMLDivElement>("#mobile-launch-overlay");
  const title = document.querySelector<HTMLHeadingElement>("#mobile-launch-title");
  const orientation = document.querySelector<HTMLDivElement>("#mobile-launch-orientation");
  const orientationLabel = document.querySelector<HTMLParagraphElement>(
    "#mobile-launch-orientation-label",
  );
  const steps = document.querySelector<HTMLOListElement>("#mobile-launch-steps");
  const note = document.querySelector<HTMLParagraphElement>("#mobile-launch-note");
  const primary = document.querySelector<HTMLButtonElement>("#mobile-launch-primary");
  const secondary = document.querySelector<HTMLButtonElement>("#mobile-launch-secondary");

  if (
    !overlay ||
    !title ||
    !orientation ||
    !orientationLabel ||
    !steps ||
    !note ||
    !primary ||
    !secondary
  ) {
    return null;
  }

  return {
    overlay,
    title,
    orientation,
    orientationLabel,
    steps,
    note,
    primary,
    secondary,
  };
}

function renderOverlay(elements: MobileLaunchElements, mode: Exclude<OverlayMode, "hidden">) {
  elements.overlay.hidden = false;
  elements.overlay.setAttribute("aria-hidden", "false");
  elements.overlay.dataset.mode = mode;
  elements.orientation.hidden = false;
  elements.note.hidden = false;
  elements.primary.hidden = false;
  elements.secondary.hidden = false;
  elements.steps.hidden = true;

  if (mode === "rotate") {
    elements.title.textContent = "Rotate Vertically";
    elements.orientationLabel.textContent = "Portrait Only";
    elements.note.hidden = true;
    elements.primary.hidden = true;
    elements.secondary.hidden = true;
    return;
  }

  if (mode === "android") {
    elements.title.textContent = "Launch Fullscreen";
    elements.orientationLabel.textContent = "Rotate Vertically";
    elements.note.hidden = true;
    elements.primary.textContent = "Enter Fullscreen";
    elements.secondary.textContent = "Continue in Browser";
    return;
  }

  if (mode === "ios-intro") {
    elements.title.textContent = "Open Fullscreen on iPhone";
    elements.orientationLabel.textContent = "Rotate Vertically";
    elements.note.textContent =
      "Safari does not support direct fullscreen for this game. Add Lucky Wheel to your Home Screen to launch it edge-to-edge without browser chrome.";
    elements.primary.textContent = "Show iPhone Steps";
    elements.secondary.textContent = "Continue in Browser";
    return;
  }

  elements.title.textContent = "Install for Fullscreen";
  elements.orientationLabel.textContent = "Rotate Vertically";
  elements.note.textContent =
    "Use these Safari steps once, then relaunch Lucky Wheel from your Home Screen.";
  elements.steps.hidden = false;
  elements.primary.hidden = true;
  elements.secondary.textContent = "Continue in Browser";
}

function hideOverlay(elements: MobileLaunchElements) {
  elements.overlay.hidden = true;
  elements.overlay.setAttribute("aria-hidden", "true");
  elements.overlay.dataset.mode = "hidden";
}

function isMobileDevice() {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const compactScreen = Math.min(window.screen.width, window.screen.height) <= 1366;
  return MOBILE_USER_AGENT.test(window.navigator.userAgent) || (coarsePointer && compactScreen);
}

function isLandscapeOrientation() {
  return window.matchMedia("(orientation: landscape)").matches || window.innerWidth > window.innerHeight;
}

function isIosDevice() {
  return (
    IOS_USER_AGENT.test(window.navigator.userAgent) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

function isIosBrowser() {
  return isIosDevice() && !isStandaloneMode();
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

function isFullscreenActive() {
  return Boolean(document.fullscreenElement);
}

function canRequestFullscreen() {
  if (isIosDevice()) {
    return false;
  }

  const target = document.documentElement as FullscreenCapableElement;
  return (
    typeof target.requestFullscreen === "function" ||
    typeof target.webkitRequestFullscreen === "function"
  );
}

async function requestAppFullscreen() {
  if (document.fullscreenElement) {
    return;
  }

  const target = document.documentElement as FullscreenCapableElement;

  if (typeof target.requestFullscreen === "function") {
    await target.requestFullscreen();
    return;
  }

  if (typeof target.webkitRequestFullscreen === "function") {
    await Promise.resolve(target.webkitRequestFullscreen());
    return;
  }

  throw new Error("Fullscreen is not supported on this device.");
}
