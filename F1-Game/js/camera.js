class Camera
{
    constructor(scene){
		// reference to the main scene
		this.scene = scene;
		
		// camera world coordinates
		this.x = 0;
		this.y = 1000;
		this.z = 0;
        
        // Z-distance between camera and player
        this.distToPlayer = 500;

		// Z-distance between camera and normalized projection plane
        this.distToPlane = null;
	}

    // initializing camera
    init() {
        // set the camera depth
        this.distToPlane = 1 / (this.y / this.distToPlayer)
    }

    // update camera position
    update() {
        // references
        var player = this.scene.player;
        var circuit = this.scene.circuit;

        // reference to the player
        this.x = player.x * circuit.roadWidth;
        
        // place the camera behind the player at the desired distance
        this.z = player.z - this.distToPlayer;

        // loop back the road
        if (this.z < 0) this.z += circuit.roadLength;
    }
}