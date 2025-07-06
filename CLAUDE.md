# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a JavaScript implementation of the classic Pacman game. The game runs in a web browser using HTML5 Canvas for rendering.

## Development Commands

### Common Tasks
- Run locally: Open `index.html` in a web browser
- No build process required - pure vanilla JavaScript

## Architecture

The game is implemented as a single JavaScript class `PacmanGame` that handles:
- Game state management (score, lives, game loop)
- Maze rendering and collision detection
- Pacman character movement and animation
- Ghost AI with random movement patterns
- Dot collection mechanics
- Win/lose conditions

### Key Components
- `index.html` - Main game HTML with canvas and UI elements
- `pacman.js` - Complete game logic and rendering engine

## Game Features

- 40x28 tile-based maze with walls and paths
- Pacman character with directional mouth animation
- 4 colored ghosts with basic AI movement
- Dot collection for scoring
- Collision detection and game over mechanics
- Lives system and score tracking
- Win condition when all dots are collected

## Controls

- Arrow keys control Pacman movement
- Game automatically starts when page loads

## Code Organization

The game uses a single class architecture with methods for:
- `initializeDots()` - Sets up collectible dots based on maze layout
- `setupControls()` - Handles keyboard input
- `updatePacman()` - Manages Pacman movement and animation
- `updateGhosts()` - Basic AI for ghost movement
- `checkCollisions()` - Collision detection between Pacman and ghosts
- `render()` - Canvas drawing and game state display
- `gameLoop()` - Main game loop with 200ms intervals

## Development Notes

- Repository is currently on `master` branch
- Pure vanilla JavaScript with no external dependencies
- Canvas size: 800x600 pixels (40x30 tiles at 20px each)
- Game runs at 5 FPS (200ms intervals)

## Getting Started

1. Clone the repository
2. Open `index.html` in any modern web browser
3. Use arrow keys to play