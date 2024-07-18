class Circuit
{
    constructor(scene) {
        // reference to the game scene
        this.scene = scene;

        // graphics to draw the road polygons
        this.graphics = scene.add.graphics(0, 0);

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
        this.createSection(10);
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

    project2D(point) {
        point.screen.x = SCREEN_CENTER_X;
        point.screen.y = SCREEN_HEIGHT - point.screen.z;
        point.screen.w = this.roadWidth;
    }

    render2D() {
        this.graphics.clear();

        // get the current and previous segments
        var currSegment = this.segments[1];
        var prevSegment = this.segments[0];

        this.project2D(currSegment.point);
        this.project2D(prevSegment.point);

        var p1 = prevSegment.point.screen;
        var p2 = currSegment.point.screen;

        this.drawSegment(
            p1.x, p1.y, p1.w,
            p2.x, p2.y, p2.w,
            currSegment.color
        )
        // console.log("Previous segment screen point: ", p1);
        // console.log("Current segment screen point: ", p2);
    }

    // draw a road segment
    drawSegment(x1, y1, w1, x2, y2, w2, color) {
        this.drawPolygon(x1-w1, y1, x1+w1, y1, x2+w2, y2, x2-w2, y2, color.road);
    }

    // draw a polygon
    drawPolygon(x1, y1, x2, y2, x3, y3, x4, y4, color) {
        this.graphics.fillStyle(color, 1);
        this.graphics.beginPath();

        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
        this.graphics.lineTo(x3, y3);
        this.graphics.lineTo(x4, y4);

        this.graphics.closePath();
        this.graphics.fill();
    }
}