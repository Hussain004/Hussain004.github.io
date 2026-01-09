/**
 * 8-Bit F1 Racing Game - Easter Egg
 * A top-down retro-style F1 racing game
 */

const F1Game = {
    canvas: null,
    ctx: null,
    gameLoop: null,
    isRunning: false,
    
    // Game state
    player: {
        x: 0,
        y: 0,
        angle: 0,
        speed: 0,
        maxSpeed: 8,
        acceleration: 0.15,
        deceleration: 0.05,
        turnSpeed: 0.06,
        width: 20,
        height: 35,
        color: '#E10600', // Ferrari Red for player
        teamName: 'YOU'
    },
    
    // AI opponents
    opponents: [],
    opponentTeams: [
        { name: 'Mercedes', color: '#00D2BE' },
        { name: 'Red Bull', color: '#1E41FF' },
        { name: 'McLaren', color: '#FF8700' },
        { name: 'Aston Martin', color: '#006F62' },
        { name: 'Alpine', color: '#0090FF' },
        { name: 'Williams', color: '#005AFF' },
        { name: 'Haas', color: '#FFFFFF' },
        { name: 'Kick Sauber', color: '#52E252' },
        { name: 'RB', color: '#6692FF' }
    ],
    
    // Track
    track: {
        outerPath: [],
        innerPath: [],
        checkpoints: [],
        startLine: { x: 0, y: 0, angle: 0 }
    },
    
    // Timing
    lapTime: 0,
    bestLap: null,
    currentLap: 0,
    lastCheckpoint: -1,
    lapStartTime: 0,
    raceStartTime: 0,
    
    // Input
    keys: {
        up: false,
        down: false,
        left: false,
        right: false
    },
    
    // Overtake tracking
    overtakes: 0,
    passedOpponents: new Set(),
    
    // UI
    overlay: null,
    
    init() {
        this.createGameUI();
        this.setupCanvas();
        this.setupTrack();
        this.setupPlayer();
        this.setupOpponents();
        this.setupControls();
        this.startGame();
    },
    
    createGameUI() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'f1-game-overlay';
        this.overlay.innerHTML = `
            <div class="f1-game-container">
                <div class="f1-game-header">
                    <div class="f1-game-title">🏎️ RETRO F1 GRAND PRIX 🏎️</div>
                    <button id="f1-game-close" class="f1-game-close">✕</button>
                </div>
                <div class="f1-game-hud">
                    <div class="f1-hud-item">
                        <span class="f1-hud-label">LAP</span>
                        <span id="f1-lap-count" class="f1-hud-value">0/3</span>
                    </div>
                    <div class="f1-hud-item">
                        <span class="f1-hud-label">TIME</span>
                        <span id="f1-lap-time" class="f1-hud-value">0:00.000</span>
                    </div>
                    <div class="f1-hud-item">
                        <span class="f1-hud-label">BEST</span>
                        <span id="f1-best-lap" class="f1-hud-value">--:--.---</span>
                    </div>
                    <div class="f1-hud-item">
                        <span class="f1-hud-label">OVERTAKES</span>
                        <span id="f1-overtakes" class="f1-hud-value">0</span>
                    </div>
                    <div class="f1-hud-item">
                        <span class="f1-hud-label">POSITION</span>
                        <span id="f1-position" class="f1-hud-value">10/10</span>
                    </div>
                </div>
                <canvas id="f1-game-canvas"></canvas>
                <div class="f1-game-controls-info">
                    <span>⬆️ Accelerate</span>
                    <span>⬇️ Brake</span>
                    <span>⬅️➡️ Steer</span>
                    <span>ESC Close</span>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
        
        // Add styles
        this.addStyles();
        
        // Close button
        document.getElementById('f1-game-close').addEventListener('click', () => this.closeGame());
    },
    
    addStyles() {
        if (document.getElementById('f1-game-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'f1-game-styles';
        styles.textContent = `
            #f1-game-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 99999;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Press Start 2P', 'Courier New', monospace;
            }
            
            .f1-game-container {
                background: #1a1a2e;
                border: 4px solid #e10600;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 0 40px rgba(225, 6, 0, 0.5);
            }
            
            .f1-game-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .f1-game-title {
                color: #e10600;
                font-size: 18px;
                text-shadow: 2px 2px 0px #000;
                letter-spacing: 2px;
            }
            
            .f1-game-close {
                background: #e10600;
                border: none;
                color: white;
                font-size: 20px;
                width: 35px;
                height: 35px;
                border-radius: 4px;
                cursor: pointer;
                transition: transform 0.2s;
            }
            
            .f1-game-close:hover {
                transform: scale(1.1);
                background: #ff1a1a;
            }
            
            .f1-game-hud {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                background: #0f0f23;
                padding: 10px 15px;
                border-radius: 4px;
                border: 2px solid #333;
            }
            
            .f1-hud-item {
                text-align: center;
            }
            
            .f1-hud-label {
                display: block;
                color: #888;
                font-size: 8px;
                margin-bottom: 4px;
            }
            
            .f1-hud-value {
                color: #00ff00;
                font-size: 12px;
                text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
            }
            
            #f1-game-canvas {
                display: block;
                border: 3px solid #333;
                border-radius: 4px;
                image-rendering: pixelated;
                image-rendering: crisp-edges;
            }
            
            .f1-game-controls-info {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 10px;
                color: #666;
                font-size: 10px;
            }
            
            .f1-game-message {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                border: 3px solid #e10600;
                padding: 30px 50px;
                border-radius: 8px;
                text-align: center;
                z-index: 100000;
            }
            
            .f1-game-message h2 {
                color: #e10600;
                font-size: 24px;
                margin: 0 0 20px 0;
                text-shadow: 2px 2px 0 #000;
            }
            
            .f1-game-message p {
                color: #00ff00;
                font-size: 14px;
                margin: 10px 0;
            }
            
            .f1-game-message button {
                background: #e10600;
                border: none;
                color: white;
                padding: 15px 30px;
                font-size: 14px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 20px;
                font-family: inherit;
            }
            
            .f1-game-message button:hover {
                background: #ff1a1a;
            }
            
            @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        `;
        document.head.appendChild(styles);
    },
    
    setupCanvas() {
        this.canvas = document.getElementById('f1-game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size - larger for bigger track
        this.canvas.width = 1000;
        this.canvas.height = 700;
    },
    
    setupTrack() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        
        // Store track parameters for use in collision detection
        this.trackParams = {
            outerRadius: 340,
            innerRadius: 240,
            centerX: cx,
            centerY: cy
        };
        
        const outerRadius = this.trackParams.outerRadius;
        const innerRadius = this.trackParams.innerRadius;
        const trackWidth = outerRadius - innerRadius;
        
        // Generate track path points with complex layout including hairpin
        this.track.outerPath = [];
        this.track.innerPath = [];
        this.track.checkpoints = [];
        
        const numPoints = 150; // More points for complex track
        for (let i = 0; i < numPoints; i++) {
            const t = (i / numPoints) * Math.PI * 2;
            
            // Create complex circuit with chicanes, fast corners, and a hairpin
            // Multiple frequency variations create different corner types
            const fastCorner = Math.sin(t * 2) * 40; // Long sweeping corners
            const chicane = Math.sin(t * 6) * 20; // Quick chicanes
            const hairpin = Math.cos(t * 1) * 35; // Slow hairpin section
            const variation = fastCorner + chicane + hairpin;
            
            const outerR = outerRadius + variation;
            const innerR = innerRadius + variation;
            
            // More elongated oval for longer straights and tighter hairpin
            const radiusModifier = 0.55; // Very elongated
            const ox = cx + Math.cos(t) * outerR;
            const oy = cy + Math.sin(t) * outerR * radiusModifier;
            
            const ix = cx + Math.cos(t) * innerR;
            const iy = cy + Math.sin(t) * innerR * radiusModifier;
            
            this.track.outerPath.push({ x: ox, y: oy });
            this.track.innerPath.push({ x: ix, y: iy });
            
            // Add checkpoints every 30 points (5 checkpoints)
            if (i % 30 === 0) {
                this.track.checkpoints.push({
                    index: i,
                    x: (ox + ix) / 2,
                    y: (oy + iy) / 2,
                    angle: t
                });
            }
        }
        
        // Start/finish line - positioned at the middle of the right side of track
        const startIndex = 0;
        const startOuter = this.track.outerPath[startIndex];
        const startInner = this.track.innerPath[startIndex];
        
        this.track.startLine = {
            x: (startOuter.x + startInner.x) / 2,
            y: (startOuter.y + startInner.y) / 2,
            angle: Math.PI / 2
        };
    },
    
    setupPlayer() {
        const startPos = this.track.startLine;
        this.player.x = startPos.x;
        this.player.y = startPos.y;
        
        // Calculate angle same way as opponents (pointing forward along track)
        const nextIndex = 1;
        const nextOuter = this.track.outerPath[nextIndex];
        const nextInner = this.track.innerPath[nextIndex];
        const nextX = (nextOuter.x + nextInner.x) / 2;
        const nextY = (nextOuter.y + nextInner.y) / 2;
        this.player.angle = Math.atan2(nextY - this.player.y, nextX - this.player.x);
        this.player.speed = 0;
        
        this.currentLap = 0;
        this.lapTime = 0;
        this.bestLap = null;
        this.lastCheckpoint = -1;
        this.overtakes = 0;
        this.passedOpponents.clear();
    },
    
    setupOpponents() {
        this.opponents = [];
        
        // Create 9 AI opponents
        for (let i = 0; i < 9; i++) {
            const team = this.opponentTeams[i];
            const startOffset = (i + 1) * 60; // Stagger starting positions
            
            // Calculate position along track
            const startIndex = Math.floor((startOffset / 600) * this.track.outerPath.length) % this.track.outerPath.length;
            const outer = this.track.outerPath[startIndex];
            const inner = this.track.innerPath[startIndex];
            
            const opponent = {
                x: (outer.x + inner.x) / 2,
                y: (outer.y + inner.y) / 2,
                angle: 0,
                speed: 3 + Math.random() * 2, // Varying speeds
                baseSpeed: 3 + Math.random() * 2,
                trackPosition: startIndex,
                width: 18,
                height: 32,
                color: team.color,
                teamName: team.name,
                passed: false
            };
            
            // Calculate initial angle
            const nextIndex = (startIndex + 1) % this.track.outerPath.length;
            const nextOuter = this.track.outerPath[nextIndex];
            const nextInner = this.track.innerPath[nextIndex];
            const nextX = (nextOuter.x + nextInner.x) / 2;
            const nextY = (nextOuter.y + nextInner.y) / 2;
            opponent.angle = Math.atan2(nextY - opponent.y, nextX - opponent.x);
            
            this.opponents.push(opponent);
        }
    },
    
    setupControls() {
        const keyHandler = (e, pressed) => {
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.keys.up = pressed;
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.keys.down = pressed;
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.keys.left = pressed;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.keys.right = pressed;
                    e.preventDefault();
                    break;
                case 'Escape':
                    if (pressed) this.closeGame();
                    break;
            }
        };
        
        this.keydownHandler = (e) => keyHandler(e, true);
        this.keyupHandler = (e) => keyHandler(e, false);
        
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    },
    
    startGame() {
        this.isRunning = true;
        this.raceStartTime = Date.now();
        this.lapStartTime = Date.now();
        this.gameLoop = requestAnimationFrame(() => this.update());
    },
    
    update() {
        if (!this.isRunning) return;
        
        this.updatePlayer();
        this.updateOpponents();
        this.checkCollisions();
        this.checkCheckpoints();
        this.updateHUD();
        this.render();
        
        this.gameLoop = requestAnimationFrame(() => this.update());
    },
    
    updatePlayer() {
        // Acceleration/deceleration
        if (this.keys.up) {
            this.player.speed = Math.min(this.player.speed + this.player.acceleration, this.player.maxSpeed);
        } else if (this.keys.down) {
            this.player.speed = Math.max(this.player.speed - this.player.acceleration * 2, -this.player.maxSpeed / 3);
        } else {
            // Natural deceleration
            if (this.player.speed > 0) {
                this.player.speed = Math.max(0, this.player.speed - this.player.deceleration);
            } else if (this.player.speed < 0) {
                this.player.speed = Math.min(0, this.player.speed + this.player.deceleration);
            }
        }
        
        // Steering (only when moving)
        if (Math.abs(this.player.speed) > 0.1) {
            const turnModifier = this.player.speed / this.player.maxSpeed;
            if (this.keys.left) {
                this.player.angle -= this.player.turnSpeed * turnModifier;
            }
            if (this.keys.right) {
                this.player.angle += this.player.turnSpeed * turnModifier;
            }
        }
        
        // Apply velocity
        this.player.x += Math.cos(this.player.angle) * this.player.speed;
        this.player.y += Math.sin(this.player.angle) * this.player.speed;
        
        // Check if on track (grass slows you down)
        if (!this.isOnTrack(this.player.x, this.player.y)) {
            this.player.speed *= 0.95; // Slow down on grass
            this.player.maxSpeed = 4; // Reduce max speed
        } else {
            this.player.maxSpeed = 8;
        }
        
        // Keep on screen
        this.player.x = Math.max(10, Math.min(this.canvas.width - 10, this.player.x));
        this.player.y = Math.max(10, Math.min(this.canvas.height - 10, this.player.y));
    },
    
    updateOpponents() {
        this.opponents.forEach(opponent => {
            // AI follows track
            const targetIndex = (opponent.trackPosition + 2) % this.track.outerPath.length;
            const outer = this.track.outerPath[targetIndex];
            const inner = this.track.innerPath[targetIndex];
            const targetX = (outer.x + inner.x) / 2;
            const targetY = (outer.y + inner.y) / 2;
            
            // Calculate angle to target
            const targetAngle = Math.atan2(targetY - opponent.y, targetX - opponent.x);
            
            // Smooth turning
            let angleDiff = targetAngle - opponent.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            opponent.angle += angleDiff * 0.1;
            
            // Vary speed slightly for natural behavior
            opponent.speed = opponent.baseSpeed + Math.sin(Date.now() / 1000 + opponent.trackPosition) * 0.5;
            
            // Move opponent
            opponent.x += Math.cos(opponent.angle) * opponent.speed;
            opponent.y += Math.sin(opponent.angle) * opponent.speed;
            
            // Check if reached target
            const dist = Math.hypot(targetX - opponent.x, targetY - opponent.y);
            if (dist < 20) {
                opponent.trackPosition = (opponent.trackPosition + 1) % this.track.outerPath.length;
            }
        });
    },
    
    isOnTrack(x, y) {
        // Simple point-in-polygon check between outer and inner track
        const cx = this.trackParams.centerX;
        const cy = this.trackParams.centerY;
        
        // Calculate distance from center (accounting for oval shape)
        const dx = x - cx;
        const dy = (y - cy) / 0.55; // Account for very elongated oval
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Track boundaries with variation matching track shape
        const angle = Math.atan2(dy, dx);
        const fastCorner = Math.sin(angle * 2) * 40;
        const chicane = Math.sin(angle * 6) * 20;
        const hairpin = Math.cos(angle * 1) * 35;
        const variation = fastCorner + chicane + hairpin;
        const outerRadius = this.trackParams.outerRadius + variation;
        const innerRadius = this.trackParams.innerRadius + variation;
        
        return dist >= innerRadius - 20 && dist <= outerRadius + 20;
    },
    
    checkCollisions() {
        // Check collision with opponents for overtakes
        this.opponents.forEach((opponent, index) => {
            const dx = this.player.x - opponent.x;
            const dy = this.player.y - opponent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Collision detection
            if (dist < 25) {
                // Push away
                const pushAngle = Math.atan2(dy, dx);
                this.player.x += Math.cos(pushAngle) * 2;
                this.player.y += Math.sin(pushAngle) * 2;
                this.player.speed *= 0.8;
                
                opponent.x -= Math.cos(pushAngle) * 1;
                opponent.y -= Math.sin(pushAngle) * 1;
            }
            
            // Check for overtake (player ahead of opponent on track)
            const playerProgress = this.getTrackProgress(this.player.x, this.player.y);
            const opponentProgress = this.getTrackProgress(opponent.x, opponent.y);
            
            if (playerProgress > opponentProgress && !this.passedOpponents.has(index)) {
                if (dist < 100) { // Only count if relatively close
                    this.passedOpponents.add(index);
                    this.overtakes++;
                }
            }
        });
    },
    
    getTrackProgress(x, y) {
        // Find closest point on track
        let minDist = Infinity;
        let closestIndex = 0;
        
        for (let i = 0; i < this.track.outerPath.length; i++) {
            const outer = this.track.outerPath[i];
            const inner = this.track.innerPath[i];
            const midX = (outer.x + inner.x) / 2;
            const midY = (outer.y + inner.y) / 2;
            const dist = Math.hypot(x - midX, y - midY);
            
            if (dist < minDist) {
                minDist = dist;
                closestIndex = i;
            }
        }
        
        return closestIndex;
    },
    
    checkCheckpoints() {
        const progress = this.getTrackProgress(this.player.x, this.player.y);
        const numCheckpoints = this.track.checkpoints.length; // Should be 4 checkpoints
        const checkpointIndex = Math.floor(progress / 30); // 120 points / 4 checkpoints = 30
        
        // Check if crossed start/finish line (checkpoint 0 after checkpoint 3)
        if (this.lastCheckpoint === numCheckpoints - 1 && checkpointIndex === 0) {
            // Completed a lap
            const lapTime = Date.now() - this.lapStartTime;
            
            if (this.currentLap > 0) {
                if (this.bestLap === null || lapTime < this.bestLap) {
                    this.bestLap = lapTime;
                }
            }
            
            this.currentLap++;
            this.lapStartTime = Date.now();
            
            // Check for race end (3 laps)
            if (this.currentLap > 3) {
                this.endRace();
                return;
            }
        }
        
        this.lastCheckpoint = checkpointIndex;
        this.lapTime = Date.now() - this.lapStartTime;
    },
    
    updateHUD() {
        document.getElementById('f1-lap-count').textContent = `${Math.min(this.currentLap, 3)}/3`;
        document.getElementById('f1-lap-time').textContent = this.formatTime(this.lapTime);
        document.getElementById('f1-best-lap').textContent = this.bestLap ? this.formatTime(this.bestLap) : '--:--.---';
        document.getElementById('f1-overtakes').textContent = this.overtakes;
        
        // Calculate position
        const playerProgress = this.getTrackProgress(this.player.x, this.player.y) + this.currentLap * 100;
        let position = 1;
        this.opponents.forEach(opp => {
            const oppProgress = opp.trackPosition + 100; // AI cars don't count laps for simplicity
            if (oppProgress > playerProgress) position++;
        });
        document.getElementById('f1-position').textContent = `${position}/10`;
    },
    
    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const millis = ms % 1000;
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
    },
    
    render() {
        const ctx = this.ctx;
        
        // Clear canvas with grass color
        ctx.fillStyle = '#1a472a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grass pattern (8-bit style)
        ctx.fillStyle = '#1e5631';
        for (let x = 0; x < this.canvas.width; x += 20) {
            for (let y = 0; y < this.canvas.height; y += 20) {
                if ((x + y) % 40 === 0) {
                    ctx.fillRect(x, y, 10, 10);
                }
            }
        }
        
        // Draw track
        this.drawTrack();
        
        // Draw start/finish line
        this.drawStartLine();
        
        // Draw checkpoints (subtle)
        this.drawCheckpoints();
        
        // Draw opponents
        this.opponents.forEach(opponent => this.drawCar(opponent));
        
        // Draw player (on top)
        this.drawCar(this.player);
        
        // Draw speed indicator
        this.drawSpeedometer();
    },
    
    drawTrack() {
        const ctx = this.ctx;
        
        // Draw track surface
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(this.track.outerPath[0].x, this.track.outerPath[0].y);
        this.track.outerPath.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        
        // Cut out inner
        ctx.fillStyle = '#1a472a';
        ctx.beginPath();
        ctx.moveTo(this.track.innerPath[0].x, this.track.innerPath[0].y);
        this.track.innerPath.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        
        // Draw track edges (kerbs)
        ctx.strokeStyle = '#e10600';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 10]);
        
        ctx.beginPath();
        ctx.moveTo(this.track.outerPath[0].x, this.track.outerPath[0].y);
        this.track.outerPath.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();
        
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(this.track.innerPath[0].x, this.track.innerPath[0].y);
        this.track.innerPath.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // Draw racing line (subtle guide)
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.track.outerPath.length; i++) {
            const outer = this.track.outerPath[i];
            const inner = this.track.innerPath[i];
            const midX = (outer.x + inner.x) / 2;
            const midY = (outer.y + inner.y) / 2;
            if (i === 0) ctx.moveTo(midX, midY);
            else ctx.lineTo(midX, midY);
        }
        ctx.closePath();
        ctx.stroke();
    },
    
    drawStartLine() {
        const ctx = this.ctx;
        const start = this.track.startLine;
        
        // Calculate perpendicular angle to track direction
        const startOuter = this.track.outerPath[0];
        const startInner = this.track.innerPath[0];
        const lineAngle = Math.atan2(startOuter.y - startInner.y, startOuter.x - startInner.x);
        
        // Checkered flag pattern at start (perpendicular to track)
        ctx.save();
        ctx.translate(start.x, start.y);
        ctx.rotate(lineAngle);
        
        const squareSize = 8;
        const lineWidth = 70; // Width of finish line across track
        const lineHeight = 16; // Height along track direction
        
        for (let i = 0; i < Math.floor(lineWidth / squareSize); i++) {
            for (let j = 0; j < Math.floor(lineHeight / squareSize); j++) {
                ctx.fillStyle = (i + j) % 2 === 0 ? '#fff' : '#000';
                ctx.fillRect((i * squareSize) - lineWidth/2, (j * squareSize) - lineHeight/2, squareSize, squareSize);
            }
        }
        
        ctx.restore();
    },
    
    drawCheckpoints() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        
        this.track.checkpoints.forEach((cp, index) => {
            if (index === 0) return; // Skip start line
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    },
    
    drawCar(car) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.angle + Math.PI / 2);
        
        // Car body (8-bit pixel style)
        ctx.fillStyle = car.color;
        
        // Main body
        ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);
        
        // Front wing
        ctx.fillRect(-car.width / 2 - 3, -car.height / 2, car.width + 6, 6);
        
        // Rear wing
        ctx.fillRect(-car.width / 2 - 2, car.height / 2 - 6, car.width + 4, 6);
        
        // Cockpit (darker)
        ctx.fillStyle = '#000';
        ctx.fillRect(-4, -5, 8, 12);
        
        // Helmet
        ctx.fillStyle = '#ff0';
        ctx.fillRect(-3, -2, 6, 6);
        
        // Wheels
        ctx.fillStyle = '#222';
        ctx.fillRect(-car.width / 2 - 4, -car.height / 2 + 4, 4, 8);
        ctx.fillRect(car.width / 2, -car.height / 2 + 4, 4, 8);
        ctx.fillRect(-car.width / 2 - 4, car.height / 2 - 12, 4, 8);
        ctx.fillRect(car.width / 2, car.height / 2 - 12, 4, 8);
        
        ctx.restore();
        
        // Draw team name above car
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(car.teamName, car.x, car.y - 25);
    },
    
    drawSpeedometer() {
        const ctx = this.ctx;
        const speed = Math.abs(this.player.speed);
        const maxSpeed = this.player.maxSpeed;
        const percentage = speed / maxSpeed;
        
        // Draw speed bar
        const barWidth = 100;
        const barHeight = 10;
        const x = 20;
        const y = this.canvas.height - 30;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Speed fill with gradient color
        const hue = 120 - percentage * 120; // Green to red
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(x, y, barWidth * percentage, barHeight);
        
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Speed text
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.floor(speed * 30)} km/h`, x + barWidth + 10, y + barHeight - 1);
    },
    
    endRace() {
        this.isRunning = false;
        cancelAnimationFrame(this.gameLoop);
        
        const totalTime = Date.now() - this.raceStartTime;
        
        // Show end message
        const message = document.createElement('div');
        message.className = 'f1-game-message';
        message.innerHTML = `
            <h2>🏁 RACE COMPLETE! 🏁</h2>
            <p>Total Time: ${this.formatTime(totalTime)}</p>
            <p>Best Lap: ${this.bestLap ? this.formatTime(this.bestLap) : 'N/A'}</p>
            <p>Overtakes: ${this.overtakes}</p>
            <button id="f1-restart">RACE AGAIN</button>
            <button id="f1-exit">EXIT</button>
        `;
        this.overlay.querySelector('.f1-game-container').appendChild(message);
        
        document.getElementById('f1-restart').addEventListener('click', () => {
            message.remove();
            this.setupPlayer();
            this.setupOpponents();
            this.startGame();
        });
        
        document.getElementById('f1-exit').addEventListener('click', () => {
            this.closeGame();
        });
    },
    
    closeGame() {
        this.isRunning = false;
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.keydownHandler);
        document.removeEventListener('keyup', this.keyupHandler);
        
        // Remove overlay
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        
        // Reset keys
        this.keys = { up: false, down: false, left: false, right: false };
    }
};

// Initialize game when logo is clicked
function initF1EasterEgg() {
    const logo = document.querySelector('.s-header__logo a');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault();
            F1Game.init();
        });
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initF1EasterEgg);
} else {
    initF1EasterEgg();
}
