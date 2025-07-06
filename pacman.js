class PacmanGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.lives = 3;
        this.gameRunning = false; // Don't start game immediately
        this.tileSize = 20;
        this.cols = this.canvas.width / this.tileSize;
        this.rows = this.canvas.height / this.tileSize;
        
        this.maze = this.generateMaze();
        
        this.player1 = {
            x: 1,
            y: 1,
            pixelX: 1 * this.tileSize,
            pixelY: 1 * this.tileSize,
            direction: 'right',
            nextDirection: 'right',
            mouthOpen: true,
            mouthFrame: 0,
            moving: false,
            speed: 2,
            score: 0,
            lives: 3,
            color: '#ff0',
            name: 'Player 1',
            active: true,
            powerMode: false,
            powerModeTimer: 0
        };
        
        this.player2 = {
            x: this.cols - 2,
            y: 1,
            pixelX: (this.cols - 2) * this.tileSize,
            pixelY: 1 * this.tileSize,
            direction: 'left',
            nextDirection: 'left',
            mouthOpen: true,
            mouthFrame: 0,
            moving: false,
            speed: 2,
            score: 0,
            lives: 3,
            color: '#f00',
            name: 'Player 2',
            active: true,
            powerMode: false,
            powerModeTimer: 0
        };
        
        this.ghosts = [
            { x: 19, y: 12, pixelX: 19 * this.tileSize, pixelY: 12 * this.tileSize, direction: 'up', color: 'red', moving: false, speed: 1.5, lastDirection: null, directionCooldown: 0, patrolTarget: null, searchMode: false },
            { x: 18, y: 12, pixelX: 18 * this.tileSize, pixelY: 12 * this.tileSize, direction: 'up', color: 'pink', moving: false, speed: 1.5, lastDirection: null, directionCooldown: 0, patrolTarget: null, searchMode: false },
            { x: 20, y: 12, pixelX: 20 * this.tileSize, pixelY: 12 * this.tileSize, direction: 'up', color: 'cyan', moving: false, speed: 1.5, lastDirection: null, directionCooldown: 0, patrolTarget: null, searchMode: false },
            { x: 21, y: 12, pixelX: 21 * this.tileSize, pixelY: 12 * this.tileSize, direction: 'up', color: 'orange', moving: false, speed: 1.5, lastDirection: null, directionCooldown: 0, patrolTarget: null, searchMode: false }
        ];
        
        this.dots = [];
        this.firstPlayerEliminated = false; // Track if first player has been eliminated
        this.gameEnding = false; // Track if game is already ending
        this.initializeDots();
        this.setupControls();
        this.setupAudio();
        this.setupStartButton();
        this.startMenuMusic();
        // Game will start when start button is pressed
    }
    
    generateMaze() {
        const maze = [];
        const halfWidth = Math.floor(this.cols / 2);
        
        // Initialize maze with walls
        for (let row = 0; row < this.rows; row++) {
            maze[row] = [];
            for (let col = 0; col < this.cols; col++) {
                maze[row][col] = 1;
            }
        }
        
        // Generate maze for left half only
        const visited = [];
        for (let row = 0; row < this.rows; row++) {
            visited[row] = [];
            for (let col = 0; col <= halfWidth; col++) {
                visited[row][col] = false;
            }
        }
        
        const directions = [[0, 2], [2, 0], [0, -2], [-2, 0]];
        
        const isValid = (row, col) => {
            return row >= 1 && row < this.rows - 1 && col >= 1 && col <= halfWidth - 1;
        };
        
        const carve = (row, col) => {
            visited[row][col] = true;
            maze[row][col] = 0;
            
            // Randomize directions
            const shuffled = directions.sort(() => Math.random() - 0.5);
            
            for (let [dr, dc] of shuffled) {
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (isValid(newRow, newCol) && !visited[newRow][newCol]) {
                    // Carve the wall between current and new cell
                    maze[row + dr/2][col + dc/2] = 0;
                    carve(newRow, newCol);
                }
            }
        };
        
        // Start carving from (1,1) on left side
        if (halfWidth > 1) {
            carve(1, 1);
        }
        
        // Add horizontal corridors to improve connectivity (left half only)
        for (let row = 1; row < this.rows - 1; row += 6) {
            for (let col = 1; col < halfWidth; col++) {
                maze[row][col] = 0;
            }
        }
        
        // Add vertical corridors to improve connectivity (left half only)
        for (let col = 1; col < halfWidth; col += 6) {
            for (let row = 1; row < this.rows - 1; row++) {
                maze[row][col] = 0;
            }
        }
        
        // Add some random wall blocks for variety on left half
        for (let i = 0; i < 8; i++) {
            const row = Math.floor(Math.random() * (this.rows - 6)) + 3;
            const col = Math.floor(Math.random() * (halfWidth - 4)) + 2;
            const size = Math.floor(Math.random() * 2) + 2;
            
            // Only add wall if it won't create isolated areas
            let canAddWall = true;
            for (let r = row; r < Math.min(row + size, this.rows - 2); r++) {
                for (let c = col; c < Math.min(col + size, halfWidth - 1); c++) {
                    if (this.countAdjacentPaths(maze, r, c) <= 1) {
                        canAddWall = false;
                        break;
                    }
                }
                if (!canAddWall) break;
            }
            
            if (canAddWall) {
                for (let r = row; r < Math.min(row + size, this.rows - 2); r++) {
                    for (let c = col; c < Math.min(col + size, halfWidth - 1); c++) {
                        maze[r][c] = 1;
                    }
                }
            }
        }
        
        // Mirror the left half to the right half
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < halfWidth; col++) {
                const mirrorCol = this.cols - 1 - col;
                maze[row][mirrorCol] = maze[row][col];
            }
        }
        
        // Handle center column if odd width
        if (this.cols % 2 === 1) {
            const centerCol = Math.floor(this.cols / 2);
            for (let row = 0; row < this.rows; row++) {
                // Make center column mostly open for connectivity
                if (row === 0 || row === this.rows - 1) {
                    maze[row][centerCol] = 1; // Top and bottom walls
                } else {
                    maze[row][centerCol] = 0; // Open path
                }
            }
        }
        
        // Create tunnel in middle for classic Pacman feel
        const midRow = Math.floor(this.rows / 2);
        for (let col = 0; col < this.cols; col++) {
            maze[midRow][col] = 0;
        }
        
        // Ensure spawn areas are clear (both sides)
        for (let row = 1; row < 4; row++) {
            for (let col = 1; col < 4; col++) {
                maze[row][col] = 0; // Left spawn
                maze[row][this.cols - 1 - col] = 0; // Right spawn (mirrored)
            }
        }
        
        // Ensure center area for ghosts is accessible
        const centerRow = Math.floor(this.rows / 2);
        const centerCol = Math.floor(this.cols / 2);
        for (let row = centerRow - 2; row <= centerRow + 2; row++) {
            for (let col = centerCol - 2; col <= centerCol + 2; col++) {
                if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
                    maze[row][col] = 0;
                }
            }
        }
        
        // Remove dead ends to prevent trapping
        this.removeDeadEnds(maze);
        
        // Final connectivity check and repair
        this.ensureConnectivity(maze);
        
        return maze;
    }
    
    countAdjacentPaths(maze, row, col) {
        let count = 0;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        for (let [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            
            if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
                if (maze[newRow][newCol] === 0) {
                    count++;
                }
            }
        }
        
        return count;
    }
    
    ensureConnectivity(maze) {
        const visited = [];
        for (let row = 0; row < this.rows; row++) {
            visited[row] = [];
            for (let col = 0; col < this.cols; col++) {
                visited[row][col] = false;
            }
        }
        
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        
        const floodFill = (startRow, startCol) => {
            const stack = [[startRow, startCol]];
            const component = [];
            
            while (stack.length > 0) {
                const [row, col] = stack.pop();
                
                if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) continue;
                if (visited[row][col] || maze[row][col] === 1) continue;
                
                visited[row][col] = true;
                component.push([row, col]);
                
                for (let [dr, dc] of directions) {
                    stack.push([row + dr, col + dc]);
                }
            }
            
            return component;
        };
        
        const components = [];
        
        // Find all connected components
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (maze[row][col] === 0 && !visited[row][col]) {
                    const component = floodFill(row, col);
                    if (component.length > 0) {
                        components.push(component);
                    }
                }
            }
        }
        
        // Connect all components to the largest one
        if (components.length > 1) {
            components.sort((a, b) => b.length - a.length);
            const mainComponent = components[0];
            
            for (let i = 1; i < components.length; i++) {
                const component = components[i];
                let minDistance = Infinity;
                let bestConnection = null;
                
                // Find closest points between main component and this component
                for (let [r1, c1] of mainComponent) {
                    for (let [r2, c2] of component) {
                        const distance = Math.abs(r1 - r2) + Math.abs(c1 - c2);
                        if (distance < minDistance) {
                            minDistance = distance;
                            bestConnection = [r1, c1, r2, c2];
                        }
                    }
                }
                
                // Create connection
                if (bestConnection) {
                    const [r1, c1, r2, c2] = bestConnection;
                    
                    // Create horizontal connection
                    const startCol = Math.min(c1, c2);
                    const endCol = Math.max(c1, c2);
                    const row = r1;
                    
                    for (let col = startCol; col <= endCol; col++) {
                        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
                            maze[row][col] = 0;
                        }
                    }
                    
                    // Create vertical connection
                    const startRow = Math.min(r1, r2);
                    const endRow = Math.max(r1, r2);
                    const col = c2;
                    
                    for (let row = startRow; row <= endRow; row++) {
                        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
                            maze[row][col] = 0;
                        }
                    }
                }
            }
        }
    }
    
    removeDeadEnds(maze) {
        let removedDeadEnd = true;
        
        // Keep removing dead ends until none are left
        while (removedDeadEnd) {
            removedDeadEnd = false;
            
            for (let row = 1; row < this.rows - 1; row++) {
                for (let col = 1; col < this.cols - 1; col++) {
                    if (maze[row][col] === 0) {
                        const pathCount = this.countAdjacentPaths(maze, row, col);
                        
                        // If this is a dead end (only one adjacent path)
                        if (pathCount === 1) {
                            // Don't remove spawn areas or center area
                            const centerRow = Math.floor(this.rows / 2);
                            const centerCol = Math.floor(this.cols / 2);
                            
                            const isSpawnArea = (row >= 1 && row < 4 && col >= 1 && col < 4) ||
                                              (row >= 1 && row < 4 && col >= this.cols - 4 && col < this.cols - 1);
                            const isCenterArea = Math.abs(row - centerRow) <= 2 && Math.abs(col - centerCol) <= 2;
                            const isMiddleTunnel = row === centerRow;
                            
                            if (!isSpawnArea && !isCenterArea && !isMiddleTunnel) {
                                // Find the direction to extend the path
                                const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
                                
                                for (let [dr, dc] of directions) {
                                    const newRow = row + dr;
                                    const newCol = col + dc;
                                    
                                    // Check if we can extend in this direction
                                    if (newRow >= 1 && newRow < this.rows - 1 && 
                                        newCol >= 1 && newCol < this.cols - 1 && 
                                        maze[newRow][newCol] === 1) {
                                        
                                        // Check if extending won't create an isolated area
                                        const extendRow = newRow + dr;
                                        const extendCol = newCol + dc;
                                        
                                        if (extendRow >= 1 && extendRow < this.rows - 1 && 
                                            extendCol >= 1 && extendCol < this.cols - 1) {
                                            
                                            maze[newRow][newCol] = 0;
                                            removedDeadEnd = true;
                                            
                                            // Mirror the change to maintain symmetry
                                            const mirrorCol = this.cols - 1 - newCol;
                                            if (mirrorCol !== newCol) {
                                                maze[newRow][mirrorCol] = 0;
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    initializeDots() {
        // First, create all regular dots
        const allDotPositions = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.maze[row] && this.maze[row][col] === 0) {
                    allDotPositions.push({ x: col, y: row });
                    this.dots.push({ 
                        x: col, 
                        y: row, 
                        collected: false, 
                        isPowerUp: false 
                    });
                }
            }
        }
        
        // Now randomly select exactly 3 dots to be power-ups
        const powerUpCount = Math.min(3, allDotPositions.length); // Ensure we don't exceed available dots
        const selectedIndices = [];
        
        while (selectedIndices.length < powerUpCount) {
            const randomIndex = Math.floor(Math.random() * this.dots.length);
            if (!selectedIndices.includes(randomIndex)) {
                selectedIndices.push(randomIndex);
                this.dots[randomIndex].isPowerUp = true;
            }
        }
    }
    
    setupControls() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                // Player 1 controls (WASD)
                case 'w':
                case 'W':
                    e.preventDefault();
                    if (this.player1.active) this.player1.nextDirection = 'up';
                    break;
                case 's':
                case 'S':
                    e.preventDefault();
                    if (this.player1.active) this.player1.nextDirection = 'down';
                    break;
                case 'a':
                case 'A':
                    e.preventDefault();
                    if (this.player1.active) this.player1.nextDirection = 'left';
                    break;
                case 'd':
                case 'D':
                    e.preventDefault();
                    if (this.player1.active) this.player1.nextDirection = 'right';
                    break;
                    
                // Player 2 controls (Arrow keys)
                case 'ArrowUp':
                    e.preventDefault();
                    if (this.player2.active) this.player2.nextDirection = 'up';
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.player2.active) this.player2.nextDirection = 'down';
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (this.player2.active) this.player2.nextDirection = 'left';
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (this.player2.active) this.player2.nextDirection = 'right';
                    break;
            }
        });
    }
    
    setupStartButton() {
        const startButton = document.getElementById('startButton');
        startButton.addEventListener('click', () => {
            this.startGame();
        });
    }
    
    startGame() {
        const startButton = document.getElementById('startButton');
        const startMenu = document.getElementById('startMenu');
        const gameContainer = document.getElementById('gameContainer');
        
        // Start the float up animation
        startButton.classList.add('float-up');
        
        // After the button animation, fade out the menu and show the game
        setTimeout(() => {
            startMenu.classList.add('fade-out');
            
            // Show game container and start game after fade out
            setTimeout(() => {
                startMenu.style.display = 'none';
                gameContainer.style.display = 'block';
                gameContainer.classList.add('fade-in');
                this.stopMenuMusic();
                this.gameRunning = true;
                this.startBackgroundMusic();
                this.gameLoop();
            }, 1000); // Wait for fade out animation
        }, 500); // Wait for button float animation
    }
    
    setupAudio() {
        // Create audio context for generating sounds
        this.audioContext = null;
        
        // Try to create audio context (some browsers require user interaction first)
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
        
        // Add click handler to start audio context on first user interaction
        const startAudio = () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            document.removeEventListener('click', startAudio);
            document.removeEventListener('keydown', startAudio);
        };
        
        document.addEventListener('click', startAudio);
        document.addEventListener('keydown', startAudio);
        
        // Background music variables
        this.backgroundMusicPlaying = false;
        this.menuMusicPlaying = false;
        this.musicInterval = null;
    }
    
    playSound(frequency, duration, type = 'sine', volume = 0.1) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    playDotSound() {
        // Musical note progression for collecting dots
        this.playSound(523, 0.08, 'sine', 0.04); // C note
        setTimeout(() => {
            this.playSound(659, 0.08, 'sine', 0.03); // E note
        }, 40);
    }
    
    playPowerUpSound() {
        // Triumphant ascending sound for power-up
        this.playSound(523, 0.1, 'sine', 0.06); // C
        setTimeout(() => this.playSound(659, 0.1, 'sine', 0.06), 50); // E
        setTimeout(() => this.playSound(784, 0.1, 'sine', 0.06), 100); // G
        setTimeout(() => this.playSound(1047, 0.15, 'sine', 0.08), 150); // C high
    }
    
    playDeathSound() {
        // Descending tone for death
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
    
    playWinSound() {
        // Ascending victory tune
        const notes = [262, 330, 392, 523]; // C, E, G, C
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playSound(freq, 0.3, 'triangle', 0.08);
            }, index * 150);
        });
    }
    
    playGameOverSound() {
        // Dramatic game over sound
        const notes = [200, 180, 160, 140, 120, 100];
        notes.forEach((freq, index) => {
            setTimeout(() => {
                this.playSound(freq, 0.2, 'sawtooth', 0.06);
            }, index * 100);
        });
    }
    
    playMoveSound() {
        // Subtle movement sound
        this.playSound(150, 0.05, 'triangle', 0.02);
    }
    
    startBackgroundMusic() {
        if (!this.audioContext || this.backgroundMusicPlaying) return;
        
        this.backgroundMusicPlaying = true;
        
        // Pacman-style background melody
        const melody = [
            { note: 262, duration: 0.25 }, // C
            { note: 330, duration: 0.25 }, // E
            { note: 392, duration: 0.25 }, // G
            { note: 523, duration: 0.25 }, // C (high)
            { note: 392, duration: 0.25 }, // G
            { note: 330, duration: 0.25 }, // E
            { note: 294, duration: 0.5 },  // D
            { note: 0, duration: 0.25 },   // Rest
            
            { note: 294, duration: 0.25 }, // D
            { note: 370, duration: 0.25 }, // F#
            { note: 440, duration: 0.25 }, // A
            { note: 587, duration: 0.25 }, // D (high)
            { note: 440, duration: 0.25 }, // A
            { note: 370, duration: 0.25 }, // F#
            { note: 330, duration: 0.5 },  // E
            { note: 0, duration: 0.25 },   // Rest
        ];
        
        let noteIndex = 0;
        
        const playNextNote = () => {
            if (!this.backgroundMusicPlaying) return;
            
            const currentNote = melody[noteIndex];
            
            if (currentNote.note > 0) {
                this.playSound(currentNote.note, currentNote.duration, 'triangle', 0.015);
            }
            
            noteIndex = (noteIndex + 1) % melody.length;
            
            setTimeout(playNextNote, currentNote.duration * 1000);
        };
        
        // Start playing the melody
        playNextNote();
    }
    
    stopBackgroundMusic() {
        this.backgroundMusicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
    
    startMenuMusic() {
        if (!this.audioContext || this.menuMusicPlaying) return;
        
        this.menuMusicPlaying = true;
        
        // Chill ambient menu melody - slower and more relaxed
        const chillMelody = [
            { note: 220, duration: 1.0 },  // A (low, long)
            { note: 247, duration: 0.5 },  // B
            { note: 262, duration: 1.5 },  // C (extra long)
            { note: 0, duration: 0.5 },    // Rest
            
            { note: 294, duration: 1.0 },  // D
            { note: 330, duration: 0.5 },  // E
            { note: 262, duration: 1.5 },  // C (back to home)
            { note: 0, duration: 0.5 },    // Rest
            
            { note: 196, duration: 1.0 },  // G (low)
            { note: 220, duration: 0.5 },  // A
            { note: 247, duration: 1.0 },  // B
            { note: 262, duration: 2.0 },  // C (very long, peaceful)
            { note: 0, duration: 1.0 },    // Long rest
        ];
        
        let noteIndex = 0;
        
        const playNextChillNote = () => {
            if (!this.menuMusicPlaying) return;
            
            const currentNote = chillMelody[noteIndex];
            
            if (currentNote.note > 0) {
                // Use soft sine wave for chill effect
                this.playSound(currentNote.note, currentNote.duration, 'sine', 0.008);
            }
            
            noteIndex = (noteIndex + 1) % chillMelody.length;
            
            setTimeout(playNextChillNote, currentNote.duration * 1000);
        };
        
        // Start playing the chill melody
        playNextChillNote();
    }
    
    stopMenuMusic() {
        this.menuMusicPlaying = false;
    }
    
    canMove(x, y) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
            return false;
        }
        return this.maze[y][x] === 0;
    }
    
    canMoveGhost(x, y, currentGhost) {
        // Check wall collision
        if (!this.canMove(x, y)) {
            return false;
        }
        
        // Check collision with other ghosts
        for (let ghost of this.ghosts) {
            if (ghost === currentGhost) continue; // Skip self
            
            // Check if another ghost is at this position or moving to it
            if (ghost.x === x && ghost.y === y) {
                return false;
            }
            
            // Check if another ghost is moving towards this position
            if (ghost.moving) {
                let targetX = ghost.x;
                let targetY = ghost.y;
                
                switch(ghost.direction) {
                    case 'up':
                        targetY--;
                        break;
                    case 'down':
                        targetY++;
                        break;
                    case 'left':
                        targetX--;
                        break;
                    case 'right':
                        targetX++;
                        break;
                }
                
                if (targetX === x && targetY === y) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    updatePlayer(player) {
        if (!player.active) return;
        
        // Handle direction changes when reaching tile centers
        if (!player.moving) {
            let newX = player.x;
            let newY = player.y;
            
            switch(player.nextDirection) {
                case 'up':
                    newY--;
                    break;
                case 'down':
                    newY++;
                    break;
                case 'left':
                    newX--;
                    break;
                case 'right':
                    newX++;
                    break;
            }
            
            if (this.canMove(newX, newY)) {
                player.direction = player.nextDirection;
                player.moving = true;
                this.playMoveSound();
            }
        }
        
        // Smooth movement between tiles
        if (player.moving) {
            switch(player.direction) {
                case 'up':
                    player.pixelY -= player.speed;
                    if (player.pixelY <= (player.y - 1) * this.tileSize) {
                        player.y--;
                        player.pixelY = player.y * this.tileSize;
                        player.moving = false;
                    }
                    break;
                case 'down':
                    player.pixelY += player.speed;
                    if (player.pixelY >= (player.y + 1) * this.tileSize) {
                        player.y++;
                        player.pixelY = player.y * this.tileSize;
                        player.moving = false;
                    }
                    break;
                case 'left':
                    player.pixelX -= player.speed;
                    if (player.pixelX <= (player.x - 1) * this.tileSize) {
                        player.x--;
                        player.pixelX = player.x * this.tileSize;
                        player.moving = false;
                    }
                    break;
                case 'right':
                    player.pixelX += player.speed;
                    if (player.pixelX >= (player.x + 1) * this.tileSize) {
                        player.x++;
                        player.pixelX = player.x * this.tileSize;
                        player.moving = false;
                    }
                    break;
            }
        }
        
        player.mouthFrame = (player.mouthFrame + 1) % 10;
        player.mouthOpen = player.mouthFrame < 5;
        
        // Update power mode timer
        if (player.powerMode && player.powerModeTimer > 0) {
            player.powerModeTimer--;
            if (player.powerModeTimer <= 0) {
                player.powerMode = false;
            }
        }
        
        this.collectDot(player);
    }
    
    updatePacman() {
        this.updatePlayer(this.player1);
        this.updatePlayer(this.player2);
    }
    
    collectDot(player) {
        const dot = this.dots.find(d => d.x === player.x && d.y === player.y && !d.collected);
        if (dot) {
            dot.collected = true;
            
            if (dot.isPowerUp) {
                // Activate power mode for 5 seconds
                player.powerMode = true;
                player.powerModeTimer = 300; // 5 seconds at 60 FPS
                player.score += 50; // Power-up dots are worth more
                this.playPowerUpSound();
            } else {
                player.score += 10;
                this.playDotSound();
            }
            
            this.updateScore();
        }
    }
    
    updateGhosts() {
        this.ghosts.forEach(ghost => {
            // Decrease direction cooldown
            if (ghost.directionCooldown > 0) {
                ghost.directionCooldown--;
            }
            
            // Handle direction changes when reaching tile centers
            if (!ghost.moving) {
                const directions = ['up', 'down', 'left', 'right'];
                const validDirections = directions.filter(dir => {
                    let newX = ghost.x;
                    let newY = ghost.y;
                    
                    switch(dir) {
                        case 'up':
                            newY--;
                            break;
                        case 'down':
                            newY++;
                            break;
                        case 'left':
                            newX--;
                            break;
                        case 'right':
                            newX++;
                            break;
                    }
                    
                    return this.canMoveGhost(newX, newY, ghost);
                });
                
                let chosenDirection = null;
                
                // Check if any active player is in line of sight
                const players = [this.player1, this.player2].filter(p => p.active);
                let targetPlayer = null;
                let minDistance = Infinity;
                
                // Find the closest visible player
                for (let player of players) {
                    const playerTileX = Math.floor(player.pixelX / this.tileSize);
                    const playerTileY = Math.floor(player.pixelY / this.tileSize);
                    const distance = Math.abs(ghost.x - playerTileX) + Math.abs(ghost.y - playerTileY);
                    
                    // Check direct line of sight
                    if (this.canSeeTarget(ghost.x, ghost.y, playerTileX, playerTileY) && distance < minDistance) {
                        targetPlayer = { x: playerTileX, y: playerTileY };
                        minDistance = distance;
                    }
                }
                
                // If we found a visible player, chase them
                if (targetPlayer) {
                    chosenDirection = this.getDirectionToTarget(ghost.x, ghost.y, targetPlayer.x, targetPlayer.y);
                    
                    // Make sure the chosen direction is valid and not blocked
                    if (!validDirections.includes(chosenDirection)) {
                        chosenDirection = null;
                    }
                }
                
                // If no direct line of sight, check if moving in any direction would reveal a player
                if (!chosenDirection) {
                    for (let direction of validDirections) {
                        let checkX = ghost.x;
                        let checkY = ghost.y;
                        
                        // Move one step in this direction to check line of sight from there
                        switch(direction) {
                            case 'up':
                                checkY--;
                                break;
                            case 'down':
                                checkY++;
                                break;
                            case 'left':
                                checkX--;
                                break;
                            case 'right':
                                checkX++;
                                break;
                        }
                        
                        // Check if from this new position, we can see any player
                        for (let player of players) {
                            const playerTileX = Math.floor(player.pixelX / this.tileSize);
                            const playerTileY = Math.floor(player.pixelY / this.tileSize);
                            
                            if (this.canSeeTarget(checkX, checkY, playerTileX, playerTileY)) {
                                chosenDirection = direction;
                                break;
                            }
                        }
                        if (chosenDirection) break;
                    }
                }
                
                
                // If no direction leads to seeing Pacman, use patrol behavior
                if (!chosenDirection && validDirections.length > 0) {
                    const oppositeDirection = this.getOppositeDirection(ghost.direction);
                    
                    // Prevent going backwards unless forced
                    const forwardDirections = validDirections.filter(dir => dir !== oppositeDirection);
                    
                    if (forwardDirections.length === 0) {
                        // Dead end - must turn around
                        chosenDirection = oppositeDirection;
                        ghost.directionCooldown = 5; // Longer cooldown after forced reversal
                    } else if (forwardDirections.includes(ghost.direction)) {
                        // Can continue straight - strongly prefer this
                        if (Math.random() < 0.8) { // 80% chance to continue straight
                            chosenDirection = ghost.direction;
                        } else {
                            // Occasionally turn to explore
                            const turnOptions = forwardDirections.filter(dir => dir !== ghost.direction);
                            if (turnOptions.length > 0) {
                                chosenDirection = turnOptions[Math.floor(Math.random() * turnOptions.length)];
                            } else {
                                chosenDirection = ghost.direction;
                            }
                        }
                    } else {
                        // At intersection - pick random forward direction
                        chosenDirection = forwardDirections[Math.floor(Math.random() * forwardDirections.length)];
                    }
                }
                
                // Set the chosen direction and start moving
                if (chosenDirection) {
                    ghost.lastDirection = ghost.direction;
                    ghost.direction = chosenDirection;
                    ghost.moving = true;
                } else if (validDirections.length === 0) {
                    // Ghost is completely blocked - wait a moment
                    ghost.directionCooldown = 5;
                }
            }
            
            // Smooth movement between tiles
            if (ghost.moving) {
                let targetX = ghost.x;
                let targetY = ghost.y;
                
                switch(ghost.direction) {
                    case 'up':
                        targetY--;
                        break;
                    case 'down':
                        targetY++;
                        break;
                    case 'left':
                        targetX--;
                        break;
                    case 'right':
                        targetX++;
                        break;
                }
                
                // Check if target position is still available (another ghost might have moved there)
                if (this.canMoveGhost(targetX, targetY, ghost)) {
                    switch(ghost.direction) {
                        case 'up':
                            ghost.pixelY -= ghost.speed;
                            if (ghost.pixelY <= (ghost.y - 1) * this.tileSize) {
                                ghost.y--;
                                ghost.pixelY = ghost.y * this.tileSize;
                                ghost.moving = false;
                            }
                            break;
                        case 'down':
                            ghost.pixelY += ghost.speed;
                            if (ghost.pixelY >= (ghost.y + 1) * this.tileSize) {
                                ghost.y++;
                                ghost.pixelY = ghost.y * this.tileSize;
                                ghost.moving = false;
                            }
                            break;
                        case 'left':
                            ghost.pixelX -= ghost.speed;
                            if (ghost.pixelX <= (ghost.x - 1) * this.tileSize) {
                                ghost.x--;
                                ghost.pixelX = ghost.x * this.tileSize;
                                ghost.moving = false;
                            }
                            break;
                        case 'right':
                            ghost.pixelX += ghost.speed;
                            if (ghost.pixelX >= (ghost.x + 1) * this.tileSize) {
                                ghost.x++;
                                ghost.pixelX = ghost.x * this.tileSize;
                                ghost.moving = false;
                            }
                            break;
                    }
                } else {
                    // Path blocked - stop moving and reset to tile position
                    ghost.moving = false;
                    ghost.pixelX = ghost.x * this.tileSize;
                    ghost.pixelY = ghost.y * this.tileSize;
                    ghost.directionCooldown = 3; // Brief pause before trying again
                }
            }
        });
    }
    
    canSeeTarget(fromX, fromY, toX, toY) {
        // Check if target is in same row or column
        if (fromX !== toX && fromY !== toY) {
            return false;
        }
        
        // Check horizontal line of sight
        if (fromY === toY) {
            const startX = Math.min(fromX, toX);
            const endX = Math.max(fromX, toX);
            
            for (let x = startX + 1; x < endX; x++) {
                if (!this.canMove(x, fromY)) {
                    return false;
                }
            }
            return true;
        }
        
        // Check vertical line of sight
        if (fromX === toX) {
            const startY = Math.min(fromY, toY);
            const endY = Math.max(fromY, toY);
            
            for (let y = startY + 1; y < endY; y++) {
                if (!this.canMove(fromX, y)) {
                    return false;
                }
            }
            return true;
        }
        
        return false;
    }
    
    getDirectionToTarget(fromX, fromY, toX, toY) {
        if (fromX === toX) {
            // Same column - move vertically
            return fromY > toY ? 'up' : 'down';
        } else if (fromY === toY) {
            // Same row - move horizontally
            return fromX > toX ? 'left' : 'right';
        }
        return null;
    }
    
    getOppositeDirection(direction) {
        switch(direction) {
            case 'up': return 'down';
            case 'down': return 'up';
            case 'left': return 'right';
            case 'right': return 'left';
            default: return null;
        }
    }
    
    checkCollisions() {
        this.ghosts.forEach(ghost => {
            // Check collision with player 1
            if (this.player1.active && ghost.x === this.player1.x && ghost.y === this.player1.y) {
                if (this.player1.powerMode) {
                    // Player can eat ghost
                    this.eatGhost(ghost, this.player1);
                } else {
                    // Normal collision - player gets hurt
                    this.player1.lives--;
                    this.playDeathSound();
                    
                    if (this.player1.lives <= 0) {
                        this.player1.active = false;
                        if (!this.firstPlayerEliminated) {
                            this.firstPlayerEliminated = true;
                            this.player1.score = Math.max(0, this.player1.score - 1000);
                        }
                    } else {
                        this.resetPlayerPosition(this.player1);
                    }
                    this.updateScore();
                }
            }
            
            // Check collision with player 2
            if (this.player2.active && ghost.x === this.player2.x && ghost.y === this.player2.y) {
                if (this.player2.powerMode) {
                    // Player can eat ghost
                    this.eatGhost(ghost, this.player2);
                } else {
                    // Normal collision - player gets hurt
                    this.player2.lives--;
                    this.playDeathSound();
                    
                    if (this.player2.lives <= 0) {
                        this.player2.active = false;
                        if (!this.firstPlayerEliminated) {
                            this.firstPlayerEliminated = true;
                            this.player2.score = Math.max(0, this.player2.score - 1000);
                        }
                    } else {
                        this.resetPlayerPosition(this.player2);
                    }
                    this.updateScore();
                }
            }
        });
        
        // Check if game should end
        if (!this.player1.active && !this.player2.active && !this.gameEnding) {
            this.gameEnding = true; // Prevent multiple end game calls
            this.stopBackgroundMusic();
            this.playGameOverSound();
            setTimeout(() => {
                this.endGame();
            }, 600);
        }
    }
    
    eatGhost(ghost, player) {
        // Award 300 points for eating a ghost
        player.score += 300;
        this.updateScore();
        
        // Play eating sound
        this.playGhostEatSound();
        
        // Respawn ghost at center
        this.respawnGhost(ghost);
    }
    
    playGhostEatSound() {
        // Satisfying descending tone for eating ghost
        this.playSound(800, 0.1, 'square', 0.08);
        setTimeout(() => this.playSound(600, 0.1, 'square', 0.06), 80);
        setTimeout(() => this.playSound(400, 0.15, 'square', 0.04), 160);
    }
    
    respawnGhost(ghost) {
        // Move ghost to center of map
        const centerX = Math.floor(this.cols / 2);
        const centerY = Math.floor(this.rows / 2);
        
        ghost.x = centerX;
        ghost.y = centerY;
        ghost.pixelX = centerX * this.tileSize;
        ghost.pixelY = centerY * this.tileSize;
        ghost.moving = false;
        ghost.direction = 'up';
        ghost.directionCooldown = 30; // Brief pause before moving again
    }
    
    resetPlayerPosition(player) {
        if (player === this.player1) {
            player.x = 1;
            player.y = 1;
            player.pixelX = 1 * this.tileSize;
            player.pixelY = 1 * this.tileSize;
            player.direction = 'right';
            player.nextDirection = 'right';
        } else {
            player.x = this.cols - 2;
            player.y = 1;
            player.pixelX = (this.cols - 2) * this.tileSize;
            player.pixelY = 1 * this.tileSize;
            player.direction = 'left';
            player.nextDirection = 'left';
        }
        player.moving = false;
    }
    
    resetPositions() {
        this.resetPlayerPosition(this.player1);
        this.resetPlayerPosition(this.player2);
        
        this.ghosts = [
            { x: 19, y: 12, pixelX: 19 * this.tileSize, pixelY: 12 * this.tileSize, direction: 'up', color: 'red', moving: false, speed: 1.5, lastDirection: null, directionCooldown: 0, patrolTarget: null, searchMode: false },
            { x: 18, y: 12, pixelX: 18 * this.tileSize, pixelY: 12 * this.tileSize, direction: 'up', color: 'pink', moving: false, speed: 1.5, lastDirection: null, directionCooldown: 0, patrolTarget: null, searchMode: false },
            { x: 20, y: 12, pixelX: 20 * this.tileSize, pixelY: 12 * this.tileSize, direction: 'up', color: 'cyan', moving: false, speed: 1.5, lastDirection: null, directionCooldown: 0, patrolTarget: null, searchMode: false },
            { x: 21, y: 12, pixelX: 21 * this.tileSize, pixelY: 12 * this.tileSize, direction: 'up', color: 'orange', moving: false, speed: 1.5, lastDirection: null, directionCooldown: 0, patrolTarget: null, searchMode: false }
        ];
    }
    
    checkWin() {
        if (this.dots.every(dot => dot.collected) && !this.gameEnding) {
            this.gameEnding = true; // Prevent multiple end game calls
            this.stopBackgroundMusic();
            this.playWinSound();
            setTimeout(() => {
                this.endGame();
            }, 600);
        }
    }
    
    endGame() {
        if (!this.gameRunning) return; // Prevent multiple calls
        
        this.gameRunning = false; // Stop the game loop
        
        const p1Score = this.player1.score;
        const p2Score = this.player2.score;
        
        let message = `Game Over!\n\nPlayer 1 (Yellow): ${p1Score}\nPlayer 2 (Red): ${p2Score}\n\n`;
        
        if (p1Score > p2Score) {
            message += 'Player 1 Wins!';
        } else if (p2Score > p1Score) {
            message += 'Player 2 Wins!';
        } else {
            message += "It's a Tie!";
        }
        
        alert(message);
        this.restartGame();
    }
    
    restartGame() {
        this.stopBackgroundMusic();
        this.maze = this.generateMaze();
        this.dots = [];
        this.initializeDots();
        
        // Reset both players
        this.player1.score = 0;
        this.player1.lives = 3;
        this.player1.active = true;
        this.player1.powerMode = false;
        this.player1.powerModeTimer = 0;
        
        this.player2.score = 0;
        this.player2.lives = 3;
        this.player2.active = true;
        this.player2.powerMode = false;
        this.player2.powerModeTimer = 0;
        
        this.firstPlayerEliminated = false; // Reset elimination flag
        this.gameEnding = false; // Reset game ending flag
        this.gameRunning = true; // Restart the game loop
        
        this.updateScore();
        this.resetPositions();
        this.startBackgroundMusic();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.renderMaze();
        this.renderDots();
        this.renderPlayers();
        this.renderGhosts();
        this.renderPlayerLabels();
    }
    
    renderMaze() {
        this.ctx.fillStyle = '#00f';
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.maze[row] && this.maze[row][col] === 1) {
                    this.ctx.fillRect(col * this.tileSize, row * this.tileSize, this.tileSize, this.tileSize);
                }
            }
        }
    }
    
    renderDots() {
        this.dots.forEach(dot => {
            if (!dot.collected) {
                const centerX = dot.x * this.tileSize + this.tileSize / 2;
                const centerY = dot.y * this.tileSize + this.tileSize / 2;
                
                if (dot.isPowerUp) {
                    // Render power-up dots as larger, pulsing circles
                    const pulseSize = 6 + Math.sin(Date.now() / 200) * 2;
                    this.ctx.fillStyle = '#ff0';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, pulseSize, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    // Add glow effect
                    this.ctx.shadowColor = '#ff0';
                    this.ctx.shadowBlur = 10;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, pulseSize, 0, 2 * Math.PI);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                } else {
                    // Regular dots
                    this.ctx.fillStyle = '#fff';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
            }
        });
    }
    
    renderPlayer(player) {
        if (!player.active) return;
        
        const centerX = player.pixelX + this.tileSize / 2;
        const centerY = player.pixelY + this.tileSize / 2;
        const radius = this.tileSize / 2 - 2;
        
        // Determine player color (rainbow if in power mode)
        let playerColor = player.color;
        if (player.powerMode) {
            // Rainbow flashing effect
            const time = Date.now() / 100;
            const hue = (time * 60) % 360; // Cycle through hue every 6 seconds
            playerColor = `hsl(${hue}, 100%, 50%)`;
            
            // Glowing aura around player
            const glowRadius = radius + 5 + Math.sin(time) * 3;
            this.ctx.shadowColor = playerColor;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = playerColor;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, glowRadius, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.fillStyle = playerColor;
        this.ctx.beginPath();
        
        if (player.mouthOpen) {
            let startAngle = 0;
            let endAngle = 2 * Math.PI;
            
            switch(player.direction) {
                case 'right':
                    startAngle = 0.2 * Math.PI;
                    endAngle = 1.8 * Math.PI;
                    break;
                case 'left':
                    startAngle = 1.2 * Math.PI;
                    endAngle = 0.8 * Math.PI;
                    break;
                case 'up':
                    startAngle = 1.7 * Math.PI;
                    endAngle = 1.3 * Math.PI;
                    break;
                case 'down':
                    startAngle = 0.7 * Math.PI;
                    endAngle = 0.3 * Math.PI;
                    break;
            }
            
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.lineTo(centerX, centerY);
        } else {
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        }
        
        this.ctx.fill();
    }
    
    renderPlayers() {
        this.renderPlayer(this.player1);
        this.renderPlayer(this.player2);
    }
    
    renderPlayerLabels() {
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        // Player 1 label
        if (this.player1.active) {
            this.ctx.fillStyle = this.player1.color;
            const p1X = this.player1.pixelX + this.tileSize / 2;
            const p1Y = this.player1.pixelY - 5;
            this.ctx.fillText('P1', p1X, p1Y);
        }
        
        // Player 2 label
        if (this.player2.active) {
            this.ctx.fillStyle = this.player2.color;
            const p2X = this.player2.pixelX + this.tileSize / 2;
            const p2Y = this.player2.pixelY - 5;
            this.ctx.fillText('P2', p2X, p2Y);
        }
    }
    
    renderGhosts() {
        this.ghosts.forEach(ghost => {
            // Save current context
            this.ctx.save();
            
            // Set transparency for overlapping ghosts
            this.ctx.globalAlpha = 0.8;
            
            this.ctx.fillStyle = ghost.color;
            const centerX = ghost.pixelX + this.tileSize / 2;
            const centerY = ghost.pixelY + this.tileSize / 2;
            const radius = this.tileSize / 2 - 2;
            
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Add a darker outline to make ghosts more visible
            this.ctx.globalAlpha = 1.0;
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            // Restore context
            this.ctx.restore();
        });
    }
    
    updateScore() {
        document.getElementById('player1Score').textContent = this.player1.score;
        document.getElementById('player1Lives').textContent = this.player1.lives;
        document.getElementById('player2Score').textContent = this.player2.score;
        document.getElementById('player2Lives').textContent = this.player2.lives;
    }
    
    gameLoop() {
        if (!this.gameRunning) return; // Stop the loop if game is not running
        
        this.updatePacman();
        this.updateGhosts();
        this.checkCollisions();
        this.checkWin();
        this.render();
        
        setTimeout(() => this.gameLoop(), 16); // ~60 FPS
    }
}

new PacmanGame();