class Player 
{
    constructor(scene) {
        // reference to the game scene
        this.scene = scene;

        // reference to the player sprite
        this.sprite = scene.sprites[PLAYER];

        // player world coordinates
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = (this.sprite.width/1000)*2;

        // player screen coorindates
        this.screen = {x:0, y:0, w:0, h:0};

        // max speed
        this.maxSpeed = (scene.circuit.segmentLength) / (1/60);

        // driving control parameters
        this.speed = 0;
    }

    // initialize player
    init() {
        // set the player screen size
        this.screen.w = this.sprite.width;
        this.screen.h = this.sprite.height;

        // set the player screen position
        this.screen.x = SCREEN_CENTER_X;
        this.screen.y = SCREEN_HEIGHT - this.screen.h/2;
    }

    // restart player
    restart() {
        // reset player position
        this.x = 0;
        this.y = 0;
        this.z = 0;

        // reset speed
        this.speed = this.maxSpeed;
    }

    // update player position
    update(dt) {
        // references to the scene objects
        var circuit = this.scene.circuit;

        // moving in z direction
        this.z += this.speed * dt;
        if (this.z >= circuit.roadLength) this.z -= circuit.roadLength;
    }
}