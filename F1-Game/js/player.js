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
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.acceleration = 0;
        this.steering = 0;

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

        // Handle input
        if (this.cursors.up.isDown) {
            this.acceleration += 100 * dt;
        } else if (this.cursors.down.isDown) {
            this.acceleration -= 100 * dt;
        } else {
            this.acceleration *= 0.9; // Deceleration
        }

        if (this.cursors.left.isDown) {
            this.steering -= 2 * dt;
        } else if (this.cursors.right.isDown) {
            this.steering += 2 * dt;
        } else {
            this.steering *= 0.9; // Steering centering
        }

        // Clamp acceleration and steering
        this.acceleration = Math.max(-5, Math.min(5, this.acceleration));
        this.steering = Math.max(-0.2, Math.min(0.2, this.steering));

        // Update position
        this.x += this.steering * this.speed * dt;
        this.z += this.speed * dt;

        // Update speed
        this.speed += this.acceleration;
        this.speed = Math.max(0, Math.min(500, this.speed)); // Clamp speed

        // Loop the track
        if (this.z >= this.scene.circuit.roadLength) {
            this.z -= this.scene.circuit.roadLength;
        }

        // Update screen position
        this.screen.x = SCREEN_CENTER_X - (this.x * this.screen.scale * SCREEN_CENTER_X);
        this.screen.y = SCREEN_HEIGHT - 100; // Fixed vertical position
    }
}