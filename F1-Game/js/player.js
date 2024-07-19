class Player 
{
    constructor(scene) {
        this.scene = scene;

        // Create the player sprite using the spritesheet
        this.sprite = scene.add.sprite(SCREEN_CENTER_X, SCREEN_HEIGHT * 0.8, 'car');
        
        // Set the initial scale of the sprite (adjust as needed)
        this.sprite.setScale(2);

        // Set the initial frame to the center position (frame 2)
        this.sprite.setFrame(2);

        // Set the initial position
        this.x = 0;
        this.y = 0;
        this.z = 0;

        // Screen position
        this.screen = { x: SCREEN_CENTER_X, y: SCREEN_HEIGHT * 0.8 };
        this.targetScreen = { x: SCREEN_CENTER_X, y: SCREEN_HEIGHT * 0.8 };

        // Speed
        this.speed = 0;

        // Input
        this.cursors = scene.input.keyboard.createCursorKeys();

        // Smoothing factor
        this.smoothing = 0.2;
    }

    init() {
        // Initialize player position
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.speed = 0;
        this.screen = { x: SCREEN_CENTER_X, y: SCREEN_HEIGHT * 0.8 };
        this.targetScreen = { x: SCREEN_CENTER_X, y: SCREEN_HEIGHT * 0.8 };
    }

    restart() {
        this.init();
    }

    update(dt) {
        // Handle input
        if (this.cursors.up.isDown) {
            this.speed += 50 * dt; // Accelerate
            this.sprite.setFrame(2); // Center frame
        } else {
            this.speed -= 5 * dt; // Decelerate when not accelerating
        }

        if (this.cursors.right.isDown) {
            this.x += 1 * dt; // Move right
            this.sprite.setFrame(4); // Right-turning frame
        } else if (this.cursors.left.isDown) {
            this.x -= 1 * dt; // Move left
            this.sprite.setFrame(0); // Left-turning frame
        } else {
            this.sprite.setFrame(2); // Center frame when not turning
        }

        // Clamp speed
        this.speed = Phaser.Math.Clamp(this.speed, 0, 2);

        // Update position
        this.z += this.speed;

        // Loop the track
        if (this.z >= this.scene.circuit.roadLength) {
            this.z -= this.scene.circuit.roadLength;
        }

        // Update screen position
        this.updateScreenPosition(dt);

        // Smooth interpolation of sprite position
        this.sprite.x += (this.screen.x - this.sprite.x) * this.smoothing;
        this.sprite.y += (this.screen.y - this.sprite.y) * this.smoothing;

        // Handle curves
        const segment = this.scene.circuit.getSegment(this.z);
        this.x -= segment.curve * this.speed * dt;

        // Clamp horizontal position
        this.x = Phaser.Math.Clamp(this.x, -2, 2);
    }

    updateScreenPosition(dt) {
        // Get the current segment
        const segment = this.scene.circuit.getSegment(this.z);

        // Interpolation factor
        const percentageInSegment = (this.z % this.scene.circuit.segmentLength) / this.scene.circuit.segmentLength;

        // Interpolate between current and next segment
        const nextSegment = this.scene.circuit.getSegment(this.z + this.scene.circuit.segmentLength);
        
        const dx = nextSegment.point.screen.x - segment.point.screen.x;
        const dy = nextSegment.point.screen.y - segment.point.screen.y;

        // Adjust the vertical position to be higher up on the screen
        const baseY = SCREEN_HEIGHT * 0.8;
        const yOffset = (segment.point.screen.y - baseY) * 0.2;

        this.targetScreen.x = segment.point.screen.x + dx * percentageInSegment + this.x * segment.point.screen.w;
        this.targetScreen.y = baseY + yOffset;

        // Smooth interpolation of screen position
        this.screen.x += (this.targetScreen.x - this.screen.x) * this.smoothing;
        this.screen.y += (this.targetScreen.y - this.screen.y) * this.smoothing;
    }
}