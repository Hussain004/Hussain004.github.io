class Player 
{
    constructor(scene) {
        // reference to the game scene
        this.scene = scene;

        // player world coordinates
        this.x = 0;
        this.y = 0;
        this.z = 0;

        // max speed
        this.maxSpeed = (scene.circuit.segmentLength) / (1/60);

        // driving control parameters
        this.speed = 0;
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
        // moving in z direction
        this.z += this.speed * dt;
    }
}