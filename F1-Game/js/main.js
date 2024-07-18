//  screen size
const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;

// coordinates of screen center
const SCREEN_CENTER_X = SCREEN_WIDTH / 2;
const SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;

// game states
const STATE_INIT = 1;
const STATE_RESTART = 2;
const STATE_PLAY = 3;
const STATE_GAMEOVER = 4;

// global variables
var state = STATE_INIT;



// main scene
class MainScene extends Phaser.Scene 
{
    constructor() {
        super({key: 'SceneMain'});
    }

    // load assets
    preload() {
        this.load.image('background', 'assets/background.jpg');
    }

    // create game objects
    create() {

        // background image
        this.add.sprite(SCREEN_CENTER_X, SCREEN_CENTER_Y, 'background');

        // instances
        this.circuit = new Circuit(this);
        this.camera = new Camera(this);
        this.settings = new Settings(this);

        // listen for pause event
        this.input.keyboard.on('keydown_P', function() {
            this.settings.txtPause.text = '[P] to resume';
            this.scene.pause();
            this.scene.launch('ScenePause');
        }, this);

        // listen for resume event
        this.events.on('resume', function() {
            this.settings.show();
        }, this);
    }

    // main game loop
    update(time, delta) {
        switch(state) {
            case STATE_INIT:
                console.log("Init game.");
                
                this.camera.init();
                
                state = STATE_RESTART;
                break;
            
            case STATE_RESTART:
                console.log("Restart game.");
                
                this.circuit.create();
                
                state = STATE_PLAY;
                break;
            
            case STATE_PLAY:
                console.log("Playing game.");

                this.camera.update();
                this.circuit.render3D();
                
                state = STATE_GAMEOVER;
                break;
            
            case STATE_GAMEOVER:
                console.log("Game over.");
                break;
        }
    }
}


// pause scene
class PauseScene extends Phaser.Scene {
    constructor() {
        super({key: 'ScenePause'});
    }

    create() {
        // listen for resume event
        this.input.keyboard.on('keydown_P', function() {
            this.scene.resume('SceneMain');
            this.scene.stop();
        }, this);
    }
}


// game configuration
var config = {
    type: Phaser.AUTO,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [MainScene, PauseScene]
};


// game instance
var game = new Phaser.Game(config);