import "./styles/global.css";
import { createLuckyWheelGame } from "./game/config";
import { mountMobileShellController } from "./mobile-shell";
import { applyGameLayout, detectGameLayout } from "./runtimeEnvironment";

const layout = detectGameLayout();

applyGameLayout(layout);
mountMobileShellController();
createLuckyWheelGame("game-root", layout);
