class Circuit
{
    constructor(scene) {
        // reference to the game scene
        this.scene = scene;

        // graphics to draw the road polygons
        this.graphics = scene.add.graphics(0, 0);

        // texture to draw the sprites on it
        this.texture = scene.add.renderTexture(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // array of road segments
        this.segments = [];

        // single segment length
        this.segmentLength = 100;

        // total number of segments
        this.total_segments = null;

        // number of visible segments to be drawn
        this.visible_segments = 200;

        // number of segments that forms a rumble strip
        this.rumble_segments = 5;

        // number of road lanes
        this.roadLanes = 3;

        // road width (half of the road)
        this.roadWidth = 1000;

        // road length
        this.roadLength = null;
    }

    create() {
        // clear arrays
        this.segments = [];

        // create a road
        this.createRoad();

        // colorize first segments in a starting color and last segments in a finishing color
        for (var n = 0; n < this.rumble_segments; n++) {
            this.segments[n].color = {road: '0xFFFFFF'};
            this.segments[this.segments.length-1-n].color = {road: '0x222222'};
        }


        // store the total number of segments
        this.total_segments = this.segments.length;

        // calculate the road length
        this.roadLength = this.total_segments * this.segmentLength;
    }

    // create road
    createRoad() {
        this.createSection(1000);
    }

    // create road section
    createSection(nSegments) {
        for (var i = 0; i < nSegments; i++) {
            this.createSegment();
        }
    }

    // create road segment
    createSegment() {
        // defining colors
        const COLORS = {
            LIGHT: {road: '0x888888', grass: '0x429352', rumble: '0xb8312e'},
            DARK: {road: '0x666666', grass: '0x397d46', rumble: '0xDDDDDD', lane: '0xFFFFFF'}
        };

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

            // alternating colors
            color: Math.floor(n/this.rumble_segments)%2 ? COLORS.DARK : COLORS.LIGHT
        })
    }

    // returns a segment at the given Z position
    getSegment(positionZ) {
        if (positionZ < 0) positionZ += this.roadLength;
        var index = Math.floor(positionZ / this.segmentLength) % this.total_segments;
        return this.segments[index];

    }

    // project a point from 3D to 2D
    project3D(point, cameraX, cameraY, cameraZ, cameraDepth) {

        // translating world coordinates to camera coordinates
        var transX = point.world.x - cameraX;
        var transY = point.world.y - cameraY;
        var transZ = point.world.z - cameraZ;
        
        // scaling factor based on the law of similar triangles
        point.scale = cameraDepth/transZ;
        
        // projecting camera coordinates onto a normalized projection plane
        var projectedX = point.scale * transX;
        var projectedY = point.scale * transY;
        var projectedW = point.scale * this.roadWidth;
        
        // scaling projected coordinates to the screen coordinates 
        point.screen.x = Math.round((1 + projectedX) * SCREEN_CENTER_X);
        point.screen.y = Math.round((1 - projectedY) * SCREEN_CENTER_Y); 
        point.screen.w = Math.round(projectedW * SCREEN_CENTER_X);
    }

    // render 3D
    render3D() {
        this.graphics.clear();

        // define the clipping bottom line to render only the visible part of the road
        var clipBottomLine = SCREEN_HEIGHT;

        // get the camera position
        var camera = this.scene.camera;

        // get the base segment
        var baseSegment = this.getSegment(camera.z);
        var baseIndex = baseSegment.index;

        for (var n = 0; n < this.visible_segments; n++) {
            // get current segment
            var currIndex = (baseIndex + n) % this.total_segments;
            var currSegment = this.segments[currIndex];

            // get the camera offset-Z to loop back the road
            var offsetZ = (currIndex < baseIndex) ? this.roadLength : 0;

            // project the segment to the screen space
            this.project3D(currSegment.point, camera.x, camera.y, camera.z-offsetZ, camera.distToPlane);

            // draw this segment only if it is visible
            var currBottomLine = currSegment.point.screen.y;
            
            if (n > 0 && currBottomLine < clipBottomLine) {
                var prevIndex = (currIndex > 0) ? currIndex - 1 : this.total_segments - 1;
                var prevSegment = this.segments[prevIndex];

                var p1 = prevSegment.point.screen;
                var p2 = currSegment.point.screen;

                this.drawSegment(
                    p1.x, p1.y, p1.w,
                    p2.x, p2.y, p2.w,
                    currSegment.color
                );

                // update the clipping bottom line
                clipBottomLine = currBottomLine;

            }
        }

        // draw all the visible objects on the rendering texture
        this.texture.clear()

        // Draw player
        var player = this.scene.player;
        this.texture.draw(player.sprite, player.screen.x, player.screen.y);

        // Make sure the texture is visible
        this.texture.setVisible(true);

    }

    // draw a road segment
    drawSegment(x1, y1, w1, x2, y2, w2, color) {
        // draw grass
        this.graphics.fillStyle(color.grass, 1);
        this.graphics.fillRect(0, y2, SCREEN_WIDTH, y1-y2);

        // draw road
        this.drawPolygon(x1-w1, y1, x1+w1, y1, x2+w2, y2, x2-w2, y2, color.road);

        // draw rumble strips
        var rumble_w1 = w1/5;
        var rumble_w2 = w2/5;
        this.drawPolygon(x1-w1-rumble_w1, y1, x1-w1, y1, x2-w2, y2, x2-w2-rumble_w2, y2, color.rumble);
        this.drawPolygon(x1+w1+rumble_w1, y1, x1+w1, y1, x2+w2, y2, x2+w2+rumble_w2, y2, color.rumble);

        // draw lanes
        if (color.lane) {
            var line_w1 = (w1/20) / 2;
            var line_w2 = (w2/20) / 2;

            var lane_w1 = (w1*2) / this.roadLanes;
            var lane_w2 = (w2*2) / this.roadLanes;

            var lane_x1 = x1 - w1;
            var lane_x2 = x2 - w2;

            for (var i = 1; i < this.roadLanes; i++) {
                lane_x1 += lane_w1;
                lane_x2 += lane_w2;

                this.drawPolygon(lane_x1-line_w1, y1, 
                            lane_x1+line_w1, y1, 
                            lane_x2+line_w2, y2, 
                            lane_x2-line_w2, y2, 
                            color.lane);
            }
        }
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