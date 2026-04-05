
// You can write more code here

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
/* END-USER-IMPORTS */

export default class RankingPage_scene extends Phaser.Scene {

	constructor() {
		super("RankingPage_scene");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {

		// bg
		this.add.image(960, 540, "bg");

		// title_01
		const title_01 = this.add.image(947, 113, "Title_01");
		title_01.scaleX = 0.9;
		title_01.scaleY = 0.9;

		// rankingPlate_01
		const rankingPlate_01 = this.add.image(597, 262, "RankingPlate_01");
		rankingPlate_01.scaleX = 0.25;
		rankingPlate_01.scaleY = 0.25;

		// rankingPlate_02
		const rankingPlate_02 = this.add.image(597, 410, "RankingPlate_02");
		rankingPlate_02.scaleX = 0.25;
		rankingPlate_02.scaleY = 0.25;

		// rankingPlate_03
		const rankingPlate_03 = this.add.image(597, 565, "RankingPlate_03");
		rankingPlate_03.scaleX = 0.25;
		rankingPlate_03.scaleY = 0.25;

		// rankingPlate_04
		const rankingPlate_04 = this.add.image(597, 717, "RankingPlate_04");
		rankingPlate_04.scaleX = 0.25;
		rankingPlate_04.scaleY = 0.25;

		// rankingPlate_05
		const rankingPlate_05 = this.add.image(597, 874, "RankingPlate_05");
		rankingPlate_05.scaleX = 0.25;
		rankingPlate_05.scaleY = 0.25;

		// rankingPlate_06
		const rankingPlate_06 = this.add.image(1329, 262, "RankingPlate_06");
		rankingPlate_06.scaleX = 0.25;
		rankingPlate_06.scaleY = 0.25;

		// rankingPlate_07
		const rankingPlate_07 = this.add.image(1329, 410, "RankingPlate_07");
		rankingPlate_07.scaleX = 0.25;
		rankingPlate_07.scaleY = 0.25;

		// rankingPlate_08
		const rankingPlate_08 = this.add.image(1329, 565, "RankingPlate_08");
		rankingPlate_08.scaleX = 0.25;
		rankingPlate_08.scaleY = 0.25;

		// rankingPlate_09
		const rankingPlate_09 = this.add.image(1329, 717, "RankingPlate_09");
		rankingPlate_09.scaleX = 0.25;
		rankingPlate_09.scaleY = 0.25;

		// rankingPlate_10
		const rankingPlate_10 = this.add.image(1329, 874, "RankingPlate_10");
		rankingPlate_10.scaleX = 0.25;
		rankingPlate_10.scaleY = 0.25;

		// button_Page_01
		this.add.image(778, 1011, "Button_Page_01");

		// button_Page_02
		this.add.image(900, 1011, "Button_Page_02");

		// button_Page_03
		this.add.image(1024, 1011, "Button_Page_03");

		// button_Page_04
		this.add.image(1147, 1011, "Button_Page_04");

		// arrow_Page_Left_png
		this.add.image(90, 520, "Arrow_Page_Left.png");

		// arrow_Page_Right
		this.add.image(1840, 520, "Arrow_Page_Right");

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
