import "./styles/global.css";
import { createLuckyWheelGame } from "./game/config";
import { mountMobileShellController } from "./mobile-shell";

mountMobileShellController();
createLuckyWheelGame("game-root");
