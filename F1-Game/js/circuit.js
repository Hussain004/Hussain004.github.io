class Circuit
{
    constructor(scene) {
        // reference to the game scene
        this.scene = scene;

        // array of road segments
        this.segments = [];

        // single segment length
        this.segmentLength = 200;

        // road width (half of the road)
        this.roadWidth = 1000;
    }

    create() {
        // clear arrays
        this.segments = [];

        // create a road
        this.createRoad();
    }

    // create road
    createRoad() {
        this.createSection();
    }

    // create road section
    createSection(nSegments) {
        for (var i = 0; i < nSegments; i++) {
            this.createSegment();
            console.log("Created segment:", this.segments[i])
        }
    }

    // create road segment
    createSegment() {
        // get the current number of segments
        var n = this.segments.length;

        // add a new segment
        this.segments.push({
            index: n,

            point: {
                world: {x: 0, y: 0, z: n * this.segmentLength},
                screen: {x: 0, y: 0, w: 0},
                scale: -1
            },

            color: {road: '0x8888888'}
        })
    }
}