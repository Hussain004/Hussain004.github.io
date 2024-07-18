class Player 
{
    constructor(scene) {
        this.scene = scene;

        // Create the player sprite using the new spritesheet
        this.sprite = scene.add.sprite(SCREEN_CENTER_X, SCREEN_HEIGHT - 100, 'car');
        this.sprite.setOrigin(0.5, 1);

        // Create animations
        scene.anims.create({
            key: 'straight',
            frames: [{ key: 'car', frame: 2 }],
            frameRate: 1,
            repeat: 0
        });

        scene.anims.create({
            key: 'left',
            frames: [
                { key: 'car', frame: 1 },
                { key: 'car', frame: 0 }
            ],
            frameRate: 10,
            repeat: 0
        });

        scene.anims.create({
            key: 'right',
            frames: [
                { key: 'car', frame: 3 },
                { key: 'car', frame: 4 },
            ],
            frameRate: 10,
            repeat: 0
        });

        // Player world coordinates
        this.x = 0;
        this.y = 0;
        this.z = 0;

        // Player screen coordinates
        this.screen = { x: 0, y: 0 };

        // Player speed
        this.speed = 0;

        // Steering state
        this.steering = 'straight';
    }

    init() {
        // Initialize player position
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.speed = 0;
        this.steering = 'straight';
        this.sprite.setVisible(true);
        this.sprite.play('straight');
    }

    restart() {
        this.init();
    }

    update(dt) {
        // Update player position based on speed
        this.z += this.speed * dt;
    
        // ensure the sprite is visible
        this.sprite.setVisible(true);
    
        // Loop the track
        if (this.z >= this.scene.circuit.roadLength) this.z -= this.scene.circuit.roadLength;
    
        // Get the current segment
        var segment = this.scene.circuit.getSegment(this.z);
    
        // Update player's screen coordinates
        this.screen.x = segment.point.screen.x - segment.point.screen.w * this.x;
        this.screen.y = segment.point.screen.y;
    
        // Update sprite position
        this.sprite.x = this.screen.x;
        this.sprite.y = this.screen.y;
    
        // Adjust sprite scale based on segment scale
        var scale = segment.point.scale * 0.3;  // Adjust the multiplier as needed
        this.sprite.setScale(scale);
    
        // Handle player input
        if (this.scene.input.keyboard.addKey('UP').isDown) {
            this.speed += 100 * dt;
        } else if (this.scene.input.keyboard.addKey('DOWN').isDown) {
            this.speed -= 100 * dt;
        } else {
            this.speed *= 0.9;  // Deceleration
        }
    
        // Handle steering
        if (this.scene.input.keyboard.addKey('LEFT').isDown) {
            if (this.steering !== 'left') {
                this.steering = 'left';
                this.sprite.play('left');
            }
            this.x = Math.max(-1, this.x - dt);
        } else if (this.scene.input.keyboard.addKey('RIGHT').isDown) {
            if (this.steering !== 'right') {
                this.steering = 'right';
                this.sprite.play('right');
            }
            this.x = Math.min(1, this.x + dt);
        } else {
            if (this.steering !== 'straight') {
                this.steering = 'straight';
                this.sprite.play('straight');
            }
            this.x *= 0.9;  // Return to center
        }
    
        // Limit speed
        this.speed = Phaser.Math.Clamp(this.speed, 0, 500);
    }
}