
// You can write more code here

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
/* END-USER-IMPORTS */

export default class Main_scene extends Phaser.Scene {

	constructor() {
		super("Main_Scene");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	/** @returns {void} */
	editorCreate() {

		// bg
		this.add.image(960, 540, "bg");

		// roulette
		const roulette = this.add.image(964, 561, "Roulette");
		roulette.scaleX = 0.85;
		roulette.scaleY = 0.85;

		// spin_Blue
		const spin_Blue = this.add.image(962, 556, "Spin_Blue");
		spin_Blue.scaleX = 0.85;
		spin_Blue.scaleY = 0.85;

		// spin_Red
		const spin_Red = this.add.image(962, 556, "Spin_Red");
		spin_Red.scaleX = 0.65;
		spin_Red.scaleY = 0.65;

		// rouletteArrow
		const rouletteArrow = this.add.image(957, 80, "RouletteArrow");
		rouletteArrow.scaleX = 0.8;
		rouletteArrow.scaleY = 0.8;

		// gameTutorial
		const gameTutorial = this.add.image(380, 135, "GameTutorial");
		gameTutorial.scaleX = 0.7;
		gameTutorial.scaleY = 0.7;

		// button_Language
		const button_Language = this.add.image(1416, 130, "Button_Language");
		button_Language.scaleX = 1.2;
		button_Language.scaleY = 1.2;

		// button_Support
		const button_Support = this.add.image(1604, 128, "Button_Support");
		button_Support.scaleX = 1.2;
		button_Support.scaleY = 1.2;

		// button_iBET
		const button_iBET = this.add.image(1805, 124, "Button_iBET");
		button_iBET.scaleX = 1.2;
		button_iBET.scaleY = 1.2;

		// frame_time_01
		const frame_time_01 = this.add.image(334, 925, "Frame_time_01");
		frame_time_01.scaleX = 0.55;
		frame_time_01.scaleY = 0.55;

		// frame_MyTotalPoint
		const frame_MyTotalPoint = this.add.image(1598, 867, "Frame_MyTotalPoint");
		frame_MyTotalPoint.scaleX = 0.65;
		frame_MyTotalPoint.scaleY = 0.65;

		// frame_MyTotalPoint_1
		const frame_MyTotalPoint_1 = this.add.image(1438, 986, "Frame_MyTotalPoint");
		frame_MyTotalPoint_1.scaleX = 0.3;
		frame_MyTotalPoint_1.scaleY = 0.5;

		// frame_MyTotalPoint_2
		const frame_MyTotalPoint_2 = this.add.image(1759, 986, "Frame_MyTotalPoint");
		frame_MyTotalPoint_2.scaleX = 0.3;
		frame_MyTotalPoint_2.scaleY = 0.5;

		// arrow_Page_Right
		this.add.image(1840, 520, "Arrow_Page_Right");

		// arrow_Page_Left_png
		this.add.image(90, 520, "Arrow_Page_Left.png");

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
