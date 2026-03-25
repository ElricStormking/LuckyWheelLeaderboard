
// You can write more code here

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
/* END-USER-IMPORTS */

export default class UIScene extends Phaser.Scene {

	constructor() {
		super("UIScene");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {

		// iBET_375_Wheel
		const iBET_375_Wheel = this.add.image(375, 3235, "iBET_375_Wheel");
		iBET_375_Wheel.alpha = 0.2;
		iBET_375_Wheel.alphaTopLeft = 0.2;
		iBET_375_Wheel.alphaTopRight = 0.2;
		iBET_375_Wheel.alphaBottomLeft = 0.2;
		iBET_375_Wheel.alphaBottomRight = 0.2;

		// button_iBET
		const button_iBET = this.add.image(83, 84, "Button_iBET");
		button_iBET.scaleX = 0.67;
		button_iBET.scaleY = 0.67;

		// button_Language
		const button_Language = this.add.image(547, 85, "Button_Language");
		button_Language.scaleX = 0.67;
		button_Language.scaleY = 0.67;

		// gameTutorial
		const gameTutorial = this.add.image(377, 394, "GameTutorial");
		gameTutorial.scaleX = 0.7;
		gameTutorial.scaleY = 0.7;

		// button_Support
		const button_Support = this.add.image(666, 84, "Button_Support");
		button_Support.scaleX = 0.67;
		button_Support.scaleY = 0.67;

		// frame_time_01
		const frame_time_01 = this.add.image(333, 85, "Frame_time_01");
		frame_time_01.scaleX = 0.25;
		frame_time_01.scaleY = 0.25;

		// frame_MyTotalPoint
		const frame_MyTotalPoint = this.add.image(375, 1565, "Frame_MyTotalPoint");
		frame_MyTotalPoint.scaleX = 0.67;
		frame_MyTotalPoint.scaleY = 0.67;

		// roulette
		const roulette = this.add.image(376, 1128, "Roulette");
		roulette.scaleX = 0.67;
		roulette.scaleY = 0.67;

		// spin_Red
		const spin_Red = this.add.image(372, 1127, "Spin_Red");
		spin_Red.scaleX = 0.67;
		spin_Red.scaleY = 0.67;

		// rouletteArrow
		const rouletteArrow = this.add.image(377, 810, "RouletteArrow");
		rouletteArrow.scaleX = 0.5;
		rouletteArrow.scaleY = 0.5;

		// arrow_Page_Right
		const arrow_Page_Right = this.add.image(472, 1687, "Arrow_Page_Right");
		arrow_Page_Right.scaleX = 0.67;
		arrow_Page_Right.scaleY = 0.67;

		// title_01
		const title_01 = this.add.image(375, 237, "Title_01");
		title_01.scaleX = 0.7;
		title_01.scaleY = 0.7;

		// title_Ranking
		const title_Ranking = this.add.image(379, 1901, "Title_Ranking");
		title_Ranking.scaleX = 0.7;
		title_Ranking.scaleY = 0.7;

		// button_Page
		const button_Page = this.add.image(260, 3540, "Button_Page");
		button_Page.scaleX = 0.7;
		button_Page.scaleY = 0.7;

		// button_Page_1
		const button_Page_1 = this.add.image(340, 3540, "Button_Page_1");
		button_Page_1.scaleX = 0.7;
		button_Page_1.scaleY = 0.7;

		// button_Page_2
		const button_Page_2 = this.add.image(420, 3540, "Button_Page_2");
		button_Page_2.scaleX = 0.7;
		button_Page_2.scaleY = 0.7;

		// button_Page_3
		const button_Page_3 = this.add.image(500, 3540, "Button_Page_3");
		button_Page_3.scaleX = 0.7;
		button_Page_3.scaleY = 0.7;

		// rankingPlate_01
		const rankingPlate_01 = this.add.image(370, 2240, "RankingPlate_01");
		rankingPlate_01.scaleX = 0.25;
		rankingPlate_01.scaleY = 0.25;

		// rankingPlate_02
		const rankingPlate_02 = this.add.image(370, 2370, "RankingPlate_02");
		rankingPlate_02.scaleX = 0.25;
		rankingPlate_02.scaleY = 0.25;

		// rankingPlate_03
		const rankingPlate_03 = this.add.image(370, 2490, "RankingPlate_03");
		rankingPlate_03.scaleX = 0.25;
		rankingPlate_03.scaleY = 0.25;

		// rankingPlate_04
		const rankingPlate_04 = this.add.image(370, 2610, "RankingPlate_04");
		rankingPlate_04.scaleX = 0.25;
		rankingPlate_04.scaleY = 0.25;

		// rankingPlate_05
		const rankingPlate_05 = this.add.image(370, 2735, "RankingPlate_05");
		rankingPlate_05.scaleX = 0.25;
		rankingPlate_05.scaleY = 0.25;

		// rankingPlate_06
		const rankingPlate_06 = this.add.image(370, 2860, "RankingPlate_06");
		rankingPlate_06.scaleX = 0.25;
		rankingPlate_06.scaleY = 0.25;

		// rankingPlate_07
		const rankingPlate_07 = this.add.image(370, 2983, "RankingPlate_07");
		rankingPlate_07.scaleX = 0.25;
		rankingPlate_07.scaleY = 0.25;

		// rankingPlate_08
		const rankingPlate_08 = this.add.image(370, 3109, "RankingPlate_08");
		rankingPlate_08.scaleX = 0.25;
		rankingPlate_08.scaleY = 0.25;

		// rankingPlate_09
		const rankingPlate_09 = this.add.image(370, 3231, "RankingPlate_09");
		rankingPlate_09.scaleX = 0.25;
		rankingPlate_09.scaleY = 0.25;

		// rankingPlate_10
		const rankingPlate_10 = this.add.image(370, 3358, "RankingPlate_10");
		rankingPlate_10.scaleX = 0.25;
		rankingPlate_10.scaleY = 0.25;

		// divider
		const divider = this.add.image(378, 2144, "Divider");
		divider.scaleX = 0.7;
		divider.scaleY = 0.7;

		// divider_1
		const divider_1 = this.add.image(374, 3598, "Divider");
		divider_1.scaleX = 0.7;
		divider_1.scaleY = 0.7;

		// title_PrizeArea
		const title_PrizeArea = this.add.image(378, 3976, "Title_PrizeArea");
		title_PrizeArea.scaleX = 0.7;
		title_PrizeArea.scaleY = 0.7;

		// prize_Ranking_01
		const prize_Ranking_01 = this.add.image(160, 4221, "Prize_Ranking_01");
		prize_Ranking_01.scaleX = 0.7;
		prize_Ranking_01.scaleY = 0.7;

		// prize_Ranking_02
		const prize_Ranking_02 = this.add.image(590, 4437, "Prize_Ranking_02");
		prize_Ranking_02.scaleX = 0.7;
		prize_Ranking_02.scaleY = 0.7;

		// prize_Ranking_03
		const prize_Ranking_03 = this.add.image(160, 4650, "Prize_Ranking_03");
		prize_Ranking_03.scaleX = 0.7;
		prize_Ranking_03.scaleY = 0.7;

		// prize_Ranking_04
		const prize_Ranking_04 = this.add.image(590, 4861, "Prize_Ranking_04");
		prize_Ranking_04.scaleX = 0.7;
		prize_Ranking_04.scaleY = 0.7;

		// prize_Ranking_05
		const prize_Ranking_05 = this.add.image(160, 5075, "Prize_Ranking_05");
		prize_Ranking_05.scaleX = 0.7;
		prize_Ranking_05.scaleY = 0.7;

		// prize_RewardZone
		const prize_RewardZone = this.add.image(480, 4220, "Prize_RewardZone");
		prize_RewardZone.scaleX = 0.7;
		prize_RewardZone.scaleY = 0.7;

		// prize_RewardZone_1
		const prize_RewardZone_1 = this.add.image(270, 4435, "Prize_RewardZone");
		prize_RewardZone_1.scaleX = 0.7;
		prize_RewardZone_1.scaleY = 0.7;

		// prize_RewardZone_2
		const prize_RewardZone_2 = this.add.image(480, 4650, "Prize_RewardZone");
		prize_RewardZone_2.scaleX = 0.7;
		prize_RewardZone_2.scaleY = 0.7;

		// prize_RewardZone_3
		const prize_RewardZone_3 = this.add.image(270, 4860, "Prize_RewardZone");
		prize_RewardZone_3.scaleX = 0.7;
		prize_RewardZone_3.scaleY = 0.7;

		// prize_RewardZone_4
		const prize_RewardZone_4 = this.add.image(480, 5075, "Prize_RewardZone");
		prize_RewardZone_4.scaleX = 0.7;
		prize_RewardZone_4.scaleY = 0.7;

		// reminder
		const reminder = this.add.image(380, 6325, "Reminder");
		reminder.scaleX = 0.7;
		reminder.scaleY = 0.7;

		// spinArrow
		const spinArrow = this.add.image(374, 1127, "SpinArrow");
		spinArrow.scaleX = 0.7;
		spinArrow.scaleY = 0.7;

		this.events.emit("scene-awake");
	}

	/* START-USER-CODE */

	// Write your code here

	create() {

		this.editorCreate();
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
