
// You can write more code here

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
/* END-USER-IMPORTS */

export default class PrizeArea_scene extends Phaser.Scene {

	constructor() {
		super("PrizeArea_scene");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {

		// bg
		this.add.image(960, 540, "bg");

		// prize_Ranking_01
		this.add.image(655, 296, "Prize_Ranking_01");

		// prize_RewardZone
		this.add.image(1143, 296, "Prize_RewardZone");

		// prize_Ranking_02
		const prize_Ranking_02 = this.add.image(291, 607, "Prize_Ranking_02");
		prize_Ranking_02.scaleX = 0.8;
		prize_Ranking_02.scaleY = 0.8;

		// prize_RewardZone_1
		const prize_RewardZone_1 = this.add.image(680, 607, "Prize_RewardZone");
		prize_RewardZone_1.scaleX = 0.8;
		prize_RewardZone_1.scaleY = 0.8;

		// prize_Ranking_03
		const prize_Ranking_03 = this.add.image(291, 903, "Prize_Ranking_03");
		prize_Ranking_03.scaleX = 0.8;
		prize_Ranking_03.scaleY = 0.8;

		// prize_RewardZone_2
		const prize_RewardZone_2 = this.add.image(679, 904, "Prize_RewardZone");
		prize_RewardZone_2.scaleX = 0.8;
		prize_RewardZone_2.scaleY = 0.8;

		// prize_RewardZone_3
		const prize_RewardZone_3 = this.add.image(1500, 610, "Prize_RewardZone");
		prize_RewardZone_3.scaleX = 0.8;
		prize_RewardZone_3.scaleY = 0.8;

		// prize_Ranking_05
		const prize_Ranking_05 = this.add.image(1111, 903, "Prize_Ranking_05");
		prize_Ranking_05.scaleX = 0.8;
		prize_Ranking_05.scaleY = 0.8;

		// prize_RewardZone_4
		const prize_RewardZone_4 = this.add.image(1499, 907, "Prize_RewardZone");
		prize_RewardZone_4.scaleX = 0.8;
		prize_RewardZone_4.scaleY = 0.8;

		// prize_Ranking_04
		const prize_Ranking_04 = this.add.image(1111, 607, "Prize_Ranking_04");
		prize_Ranking_04.scaleX = 0.8;
		prize_Ranking_04.scaleY = 0.8;

		// arrow_Page_Left_png
		this.add.image(90, 520, "Arrow_Page_Left.png");

		// arrow_Page_Right
		this.add.image(1840, 520, "Arrow_Page_Right");

		// title_PrizeArea
		this.add.image(993, 71, "Title_PrizeArea");

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
