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

        // player screen coordinates
        this.screen = {x: 0, y: 0, w: 0, scale: 0};

        // player speed
        this.speed = 0;

        // Add input handling
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.acceleration = 0;
        this.steering = 0;
    }

    init() {
        this.screen.w = this.sprite.width;
    }

    restart() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.speed = 0;
    }

    update(dt) {
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

        // Update speed
        this.speed += this.acceleration;
        this.speed = Math.max(0, Math.min(500, this.speed)); // Clamp speed

        // Update position
        this.x += this.steering * this.speed * dt;
        this.z += this.speed * dt;

        // Constrain x position to keep car on the road
        const maxX = this.scene.circuit.roadWidth;
        this.x = Math.max(-maxX, Math.min(maxX, this.x));

        // Loop the track
        if (this.z >= this.scene.circuit.roadLength) {
            this.z -= this.scene.circuit.roadLength;
        }

        // Update screen position
        const roadWidth = this.scene.circuit.roadWidth;
        const screenScale = SCREEN_WIDTH / (2 * roadWidth);
        this.screen.x = SCREEN_CENTER_X + (this.x * screenScale);
        this.screen.y = SCREEN_HEIGHT - 100; // Fixed vertical position

        // Ensure the car stays within the screen bounds
        const halfCarWidth = this.sprite.width / 2;
        this.screen.x = Math.max(halfCarWidth, Math.min(SCREEN_WIDTH - halfCarWidth, this.screen.x));
    }
}