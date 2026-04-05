import Phaser from "phaser";
import { isDesktopLayout } from "./constants";

const editorUiModules = import.meta.glob("../UI/**/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const MOBILE_EDITOR_UI_TEXTURES: Record<string, string> = {
  Arrow_Page_Left: "../UI/Arrow_Page_Left.png.png",
  Arrow_Page_Right: "../UI/Arrow_Page_Right.png",
  Button_iBET: "../UI/Button_iBET.png",
  Button_Language: "../UI/Button_Language.png",
  Button_Page: "../UI/Ranking/Button_Page_01.png",
  Button_Page_1: "../UI/Ranking/Button_Page_02.png",
  Button_Page_2: "../UI/Ranking/Button_Page_03.png",
  Button_Support: "../UI/Button_Support.png",
  Divider: "../UI/Ranking/Divider.png",
  Frame_MyTotalPoint: "../UI/Frame_MyTotalPoint.png",
  Frame_time_01: "../UI/Frame_time_01.png",
  GameTutorial: "../UI/GameTutorial.png",
  Prize_Ranking_01: "../UI/PrizeArea/Prize_Ranking_01.png",
  Prize_Ranking_02: "../UI/PrizeArea/Prize_Ranking_02.png",
  Prize_Ranking_03: "../UI/PrizeArea/Prize_Ranking_03.png",
  Prize_Ranking_04: "../UI/PrizeArea/Prize_Ranking_04.png",
  Prize_Ranking_05: "../UI/PrizeArea/Prize_Ranking_05.png",
  Prize_RewardZone: "../UI/PrizeArea/Prize_RewardZone.png",
  RankingArrow: "../UI/Ranking/RankingArrow.png",
  RankingPlate_01: "../UI/Ranking/RankingPlate_01.png",
  RankingPlate_02: "../UI/Ranking/RankingPlate_02.png",
  RankingPlate_03: "../UI/Ranking/RankingPlate_03.png",
  RankingPlate_04: "../UI/Ranking/RankingPlate_04.png",
  RankingPlate_05: "../UI/Ranking/RankingPlate_05.png",
  RankingPlate_06: "../UI/Ranking/RankingPlate_06.png",
  RankingPlate_07: "../UI/Ranking/RankingPlate_07.png",
  RankingPlate_08: "../UI/Ranking/RankingPlate_08.png",
  RankingPlate_09: "../UI/Ranking/RankingPlate_09.png",
  RankingPlate_10: "../UI/Ranking/RankingPlate_10.png",
  RankingPlate_11: "../UI/Ranking/RankingPlate_11.png",
  RankingPlate_12: "../UI/Ranking/RankingPlate_12.png",
  RankingPlate_13: "../UI/Ranking/RankingPlate_13.png",
  RankingPlate_14: "../UI/Ranking/RankingPlate_14.png",
  RankingPlate_15: "../UI/Ranking/RankingPlate_15.png",
  RankingPlate_16: "../UI/Ranking/RankingPlate_16.png",
  RankingPlate_17: "../UI/Ranking/RankingPlate_17.png",
  RankingPlate_18: "../UI/Ranking/RankingPlate_18.png",
  RankingPlate_19: "../UI/Ranking/RankingPlate_19.png",
  RankingPlate_20: "../UI/Ranking/RankingPlate_20.png",
  RankingPlate_21: "../UI/Ranking/RankingPlate_21.png",
  RankingPlate_22: "../UI/Ranking/RankingPlate_22.png",
  RankingPlate_23: "../UI/Ranking/RankingPlate_23.png",
  RankingPlate_24: "../UI/Ranking/RankingPlate_24.png",
  RankingPlate_25: "../UI/Ranking/RankingPlate_25.png",
  RankingPlate_26: "../UI/Ranking/RankingPlate_26.png",
  RankingPlate_27: "../UI/Ranking/RankingPlate_27.png",
  RankingPlate_28: "../UI/Ranking/RankingPlate_28.png",
  RankingPlate_29: "../UI/Ranking/RankingPlate_29.png",
  RankingPlate_30: "../UI/Ranking/RankingPlate_30.png",
  RankingPlate_Notl: "../UI/Ranking/RankingPlate_Notl.png",
  Reminder: "../UI/PrizeArea/Reminder.png",
  Roulette: "../UI/Roulette.png",
  RouletteArrow: "../UI/RouletteArrow.png",
  Spin_Red: "../UI/Spin_Red.png",
  SpinArrow: "../UI/SpinArrow.png",
  Title_01: "../UI/Title_01.png",
  Title_PrizeArea: "../UI/PrizeArea/Title_PrizeArea.png",
  Title_Ranking: "../UI/Title_Ranking.png",
};

const DESKTOP_EDITOR_UI_TEXTURES: Record<string, string> = {
  Desktop_ArrowPageLeft: "../UI/PC_UI/Main/Arrow_Page_Left.png.png",
  Desktop_ArrowPageRight: "../UI/PC_UI/Main/Arrow_Page_Right.png",
  Desktop_ButtonIBET: "../UI/PC_UI/Main/Button_iBET.png",
  Desktop_ButtonLanguage: "../UI/PC_UI/Main/Button_Language.png",
  Desktop_ButtonSupport: "../UI/PC_UI/Main/Button_Support.png",
  Desktop_FrameTime: "../UI/PC_UI/Main/Frame_time_01.png",
  Desktop_FrameTotalPoint: "../UI/PC_UI/Main/Frame_MyTotalPoint.png",
  Desktop_GameTutorial: "../UI/PC_UI/Main/GameTutorial.png",
  Desktop_HudFrame: "../UI/PC_UI/Main/HUD_Frame.png",
  Desktop_IconDiamond: "../UI/PC_UI/Main/Icon_Diamond.png",
  Desktop_IconMyPoint: "../UI/PC_UI/Main/Icon_MyPoint.png",
  Desktop_LogoIBET: "../UI/PC_UI/Main/LOGO_iBET.png",
  Desktop_MainBackgroundAccent: "../UI/PC_UI/Main/Background_01.png",
  Desktop_MainTitle: "../UI/PC_UI/Main/Title_01.png",
  Desktop_PageBackground: "../UI/PC_UI/Main/bg.png",
  Desktop_Roulette: "../UI/PC_UI/Main/Roulette.png",
  Desktop_RouletteArrow: "../UI/PC_UI/Main/RouletteArrow.png",
  Desktop_RouletteExpired: "../UI/PC_UI/Main/Roulette_expired.png",
  Desktop_SpinArrow: "../UI/PC_UI/Main/SpinArrow.png",
  Desktop_SpinBlue: "../UI/PC_UI/Main/Spin_Blue.png",
  Desktop_SpinExpired: "../UI/PC_UI/Main/Spin_expired.png",
  Desktop_SpinRed: "../UI/PC_UI/Main/Spin_Red.png",
  Desktop_PrizeTitle: "../UI/PC_UI/PrizeArea/Title_PrizeArea.png",
  Desktop_PrizeBadge_01: "../UI/PC_UI/PrizeArea/Prize_Ranking_01.png",
  Desktop_PrizeBadge_02: "../UI/PC_UI/PrizeArea/Prize_Ranking_02.png",
  Desktop_PrizeBadge_03: "../UI/PC_UI/PrizeArea/Prize_Ranking_03.png",
  Desktop_PrizeBadge_04: "../UI/PC_UI/PrizeArea/Prize_Ranking_04.png",
  Desktop_PrizeBadge_05: "../UI/PC_UI/PrizeArea/Prize_Ranking_05.png",
  Desktop_PrizeRewardZone: "../UI/PC_UI/PrizeArea/Prize_RewardZone.png",
  Desktop_RankingArrow: "../UI/PC_UI/RankingPage/RankingArrow.png",
  Desktop_RankingButton_01: "../UI/PC_UI/RankingPage/Button_Page_01.png",
  Desktop_RankingButton_02: "../UI/PC_UI/RankingPage/Button_Page_02.png",
  Desktop_RankingButton_03: "../UI/PC_UI/RankingPage/Button_Page_03.png",
  Desktop_RankingButton_04: "../UI/PC_UI/RankingPage/Button_Page_04.png",
  Desktop_RankingDivider: "../UI/PC_UI/RankingPage/Divider.png",
  Desktop_RankingTitle: "../UI/PC_UI/RankingPage/Title_01.png",
  Desktop_RankingPlate_01: "../UI/PC_UI/RankingPage/RankingPlate_01.png",
  Desktop_RankingPlate_02: "../UI/PC_UI/RankingPage/RankingPlate_02.png",
  Desktop_RankingPlate_03: "../UI/PC_UI/RankingPage/RankingPlate_03.png",
  Desktop_RankingPlate_04: "../UI/PC_UI/RankingPage/RankingPlate_04.png",
  Desktop_RankingPlate_05: "../UI/PC_UI/RankingPage/RankingPlate_05.png",
  Desktop_RankingPlate_06: "../UI/PC_UI/RankingPage/RankingPlate_06.png",
  Desktop_RankingPlate_07: "../UI/PC_UI/RankingPage/RankingPlate_07.png",
  Desktop_RankingPlate_08: "../UI/PC_UI/RankingPage/RankingPlate_08.png",
  Desktop_RankingPlate_09: "../UI/PC_UI/RankingPage/RankingPlate_09.png",
  Desktop_RankingPlate_10: "../UI/PC_UI/RankingPage/RankingPlate_10.png",
  Desktop_RankingPlate_11: "../UI/PC_UI/RankingPage/RankingPlate_11.png",
  Desktop_RankingPlate_12: "../UI/PC_UI/RankingPage/RankingPlate_12.png",
  Desktop_RankingPlate_13: "../UI/PC_UI/RankingPage/RankingPlate_13.png",
  Desktop_RankingPlate_14: "../UI/PC_UI/RankingPage/RankingPlate_14.png",
  Desktop_RankingPlate_15: "../UI/PC_UI/RankingPage/RankingPlate_15.png",
  Desktop_RankingPlate_16: "../UI/PC_UI/RankingPage/RankingPlate_16.png",
  Desktop_RankingPlate_17: "../UI/PC_UI/RankingPage/RankingPlate_17.png",
  Desktop_RankingPlate_18: "../UI/PC_UI/RankingPage/RankingPlate_18.png",
  Desktop_RankingPlate_19: "../UI/PC_UI/RankingPage/RankingPlate_19.png",
  Desktop_RankingPlate_20: "../UI/PC_UI/RankingPage/RankingPlate_20.png",
  Desktop_RankingPlate_21: "../UI/PC_UI/RankingPage/RankingPlate_21.png",
  Desktop_RankingPlate_22: "../UI/PC_UI/RankingPage/RankingPlate_22.png",
  Desktop_RankingPlate_23: "../UI/PC_UI/RankingPage/RankingPlate_23.png",
  Desktop_RankingPlate_24: "../UI/PC_UI/RankingPage/RankingPlate_24.png",
  Desktop_RankingPlate_25: "../UI/PC_UI/RankingPage/RankingPlate_25.png",
  Desktop_RankingPlate_26: "../UI/PC_UI/RankingPage/RankingPlate_26.png",
  Desktop_RankingPlate_27: "../UI/PC_UI/RankingPage/RankingPlate_27.png",
  Desktop_RankingPlate_28: "../UI/PC_UI/RankingPage/RankingPlate_28.png",
  Desktop_RankingPlate_29: "../UI/PC_UI/RankingPage/RankingPlate_29.png",
  Desktop_RankingPlate_30: "../UI/PC_UI/RankingPage/RankingPlate_30.png",
  Desktop_RankingPlate_NotListed: "../UI/PC_UI/RankingPage/RankingPlate_Notl.png",
};

function resolveEditorUiUrl(assetPath: string) {
  const match = editorUiModules[assetPath];

  if (!match) {
    throw new Error(`Missing Phaser Editor UI asset: ${assetPath}`);
  }

  return match;
}

export function preloadEditorUiAssets(scene: Phaser.Scene) {
  const textureMap = isDesktopLayout() ? DESKTOP_EDITOR_UI_TEXTURES : MOBILE_EDITOR_UI_TEXTURES;

  Object.entries(textureMap).forEach(([key, assetPath]) => {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, resolveEditorUiUrl(assetPath));
    }
  });
}
