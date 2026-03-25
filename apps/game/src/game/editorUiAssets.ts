import Phaser from "phaser";

const editorUiModules = import.meta.glob("../UI/**/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const EDITOR_UI_TEXTURES = {
  Arrow_Page_Right: "Arrow_Page_Right.png",
  Button_iBET: "Button_iBET.png",
  Button_Language: "Button_Language.png",
  Button_Page: "Button_Page_01.png",
  Button_Page_1: "Button_Page_02.png",
  Button_Page_2: "Button_Page_03.png",
  Button_Page_3: "Button_Page_04.png",
  Button_Support: "Button_Support.png",
  Divider: "Divider.png",
  Frame_MyTotalPoint: "Frame_MyTotalPoint.png",
  Frame_time_01: "Frame_time_01.png",
  GameTutorial: "GameTutorial.png",
  Prize_Ranking_01: "Prize_Ranking_01.png",
  Prize_Ranking_02: "Prize_Ranking_02.png",
  Prize_Ranking_03: "Prize_Ranking_03.png",
  Prize_Ranking_04: "Prize_Ranking_04.png",
  Prize_Ranking_05: "Prize_Ranking_05.png",
  Prize_RewardZone: "Prize_RewardZone.png",
  RankingPlate_01: "RankingPlate_01.png",
  RankingPlate_02: "RankingPlate_02.png",
  RankingPlate_03: "RankingPlate_03.png",
  RankingPlate_04: "RankingPlate_04.png",
  RankingPlate_05: "RankingPlate_05.png",
  RankingPlate_06: "RankingPlate_06.png",
  RankingPlate_07: "RankingPlate_07.png",
  RankingPlate_08: "RankingPlate_08.png",
  RankingPlate_09: "RankingPlate_09.png",
  RankingPlate_10: "RankingPlate_10.png",
  RankingPlate_11: "RankingPlate_11.png",
  RankingPlate_12: "RankingPlate_12.png",
  RankingPlate_13: "RankingPlate_13.png",
  RankingPlate_14: "RankingPlate_14.png",
  RankingPlate_15: "RankingPlate_15.png",
  RankingPlate_16: "RankingPlate_16.png",
  RankingPlate_17: "RankingPlate_17.png",
  RankingPlate_18: "RankingPlate_18.png",
  RankingPlate_19: "RankingPlate_19.png",
  RankingPlate_20: "RankingPlate_20.png",
  RankingPlate_21: "RankingPlate_21.png",
  RankingPlate_22: "RankingPlate_22.png",
  RankingPlate_23: "RankingPlate_23.png",
  RankingPlate_24: "RankingPlate_24.png",
  RankingPlate_25: "RankingPlate_25.png",
  RankingPlate_26: "RankingPlate_26.png",
  RankingPlate_27: "RankingPlate_27.png",
  RankingPlate_28: "RankingPlate_28.png",
  RankingPlate_29: "RankingPlate_29.png",
  RankingPlate_30: "RankingPlate_30.png",
  RankingPlate_Notl: "RankingPlate_Notl.png",
  Reminder: "Reminder.png",
  Roulette: "Roulette.png",
  RouletteArrow: "RouletteArrow.png",
  Spin_Red: "Spin_Red.png",
  SpinArrow: "SpinArrow.png",
  Title_01: "Title_01.png",
  Title_PrizeArea: "Title_PrizeArea.png",
  Title_Ranking: "Title_Ranking.png",
} as const;

function resolveEditorUiUrl(fileName: string) {
  const match = Object.entries(editorUiModules).find(([path]) => path.endsWith(`/${fileName}`));

  if (!match) {
    throw new Error(`Missing Phaser Editor UI asset: ${fileName}`);
  }

  return match[1];
}

export function preloadEditorUiAssets(scene: Phaser.Scene) {
  Object.entries(EDITOR_UI_TEXTURES).forEach(([key, fileName]) => {
    if (!scene.textures.exists(key)) {
      scene.load.image(key, resolveEditorUiUrl(fileName));
    }
  });
}
