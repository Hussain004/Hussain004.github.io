class Player 
{
    constructor(scene) {
        this.scene = scene;

        // Create the player sprite using the spritesheet
        this.sprite = scene.add.sprite(SCREEN_CENTER_X, SCREEN_HEIGHT - 100, 'car');
        
        // Set the initial scale of the sprite (adjust as needed)
        this.sprite.setScale(2);

        // Set the initial frame to the center position (frame 2)
        this.sprite.setFrame(2);

        // Set the initial position
        this.x = 0;
        this.y = 0;
        this.z = 0;

        // Screen position
        this.screen = { x: 0, y: 0 };

        // Speed
        this.speed = 0;

        // Input
        this.cursors = scene.input.keyboard.createCursorKeys();
    }

    init() {
        // Initialize player position
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.speed = 0;
    }

    restart() {
        this.init();
    }

    update(dt) {
        // Handle input
        if (this.cursors.up.isDown) {
            this.speed += 10 * dt; // Accelerate
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
        this.updateScreenPosition();

        // Update sprite position
        this.sprite.setPosition(this.screen.x, this.screen.y);
    }

    updateScreenPosition() {
        // Get the current segment
        const segment = this.scene.circuit.getSegment(this.z);

        // Interpolation factor
        const percentageInSegment = (this.z % this.scene.circuit.segmentLength) / this.scene.circuit.segmentLength;

        // Interpolate between current and next segment
        const nextSegment = this.scene.circuit.getSegment(this.z + this.scene.circuit.segmentLength);
        
        const dx = nextSegment.point.screen.x - segment.point.screen.x;
        const dy = nextSegment.point.screen.y - segment.point.screen.y;

        this.screen.x = segment.point.screen.x + dx * percentageInSegment + this.x * segment.point.screen.w;
        this.screen.y = segment.point.screen.y + dy * percentageInSegment;
    }
}