// Manages the Heads-Up Display (HUD) elements
'use strict';

// Create a namespace for HUD-related variables and functions
const HUD = {
    showTitle: 1,
    minimapVisible: false,
    isFullscreen: false,

    init: function() {
        // Add event listeners
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
    },

    handleKeyPress: function(event) {
        if (event.key.toLowerCase() === 't') {
            this.minimapVisible = !this.minimapVisible;
        }
        
        // Fullscreen controls
        if (event.shiftKey) {
            if (event.key.toLowerCase() === 'f') {
                this.toggleFullscreen();
            } else if (event.key === 'Escape') {
                this.exitFullscreen();
            }
        }
    },

    toggleFullscreen: function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
            this.isFullscreen = true;
        } else {
            this.exitFullscreen();
        }
    },

    exitFullscreen: function() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            this.isFullscreen = false;
        }
    }
};

// Initialize HUD
HUD.init();

function drawHUD() {
    if (freeCamMode)
        return;

    if (enhancedMode && paused) {
        // paused
        drawHUDText('-PAUSE-', vec3(.5, .9), .08, undefined, 'monospace', undefined, 900, undefined, undefined, undefined, 3);
    }

    if (titleScreenMode) {
        if (HUD.showTitle)
            for (let j = 2; j--;) {
                // draw logo
                const text = j ? 'RTB COMPETITION ON' : 'FUTURE SKILLS';
                const pos = vec3(.5, .3 - j * .15).multiply(mainCanvasSize);
                let size = mainCanvasSize.y / 9;
                const weight = 900;
                const style = 'italic';
                const font = 'arial';
                if (enhancedMode && getAspect() < .6)
                    size = mainCanvasSize.x / 5;

                const context = mainContext;
                context.strokeStyle = BLACK;
                context.textAlign = 'center';

                let totalWidth = 0;
                for (let k = 2; k--;)
                    for (let i = 0; i < text.length; i++) {
                        const p = Math.sin(i - time * 2 - j * 2);
                        let size2 = (size + p * mainCanvasSize.y / 20);
                        if (enhancedMode)
                            size2 *= lerp(time * 2 - 2 + j, 0, 1)
                        context.font = `${style} ${weight} ${size2}px ${font}`;
                        const c = text[i];
                        const w = context.measureText(c).width;
                        if (k) {
                            totalWidth += w;
                            continue;
                        }

                        const x = pos.x + w / 3 - totalWidth / 2;
                        for (let f = 2; f--;) {
                            const o = f * mainCanvasSize.y / 99;
                            context.fillStyle = hsl(.15 - p / 9, 1, f ? 0 : .75 - p * .25);
                            context.fillText(c, x + o, pos.y + o);
                        }
                        pos.x += w;
                    }
            }

        if (!enhancedMode || time > 5) {
            if (bestTime && (!enhancedMode || time % 20 < 10)) {
                const timeString = formatTimeString(bestTime);
                if (!RP31KBuildLevel2)
                    drawHUDText('BEST TIME :'+timeString, vec3(.5, .9), .07, undefined, 'monospace', undefined, 900, undefined, undefined, undefined, 3);
            }
            else if (enhancedMode && !isTouchDevice) {
                drawHUDText('CLICK TO PLAY', vec3(.5, .97), .07, undefined, 'monospace', undefined, 900, undefined, undefined, undefined, 3);
            }
        }
        // --- Main Menu Card (drawn last, above everything else) ---


        startMenuY = mainCanvasSize.y + 110;
        const menuCardWidth = mainCanvasSize.x * 0.5;
        const menuCardHeight = startMenuY * 0.50;
        const menuCardX = (mainCanvasSize.x - menuCardWidth) / 2;
        const menuCardY = ((startMenuY - menuCardHeight) / 2) + 20;
        const menuCardRadius = 36;
        const menuBaseAlpha = 0.7;
        const menuPulse = 0.12 * Math.abs(Math.sin(time * 1.2));
        const menuCardAlpha = menuBaseAlpha + menuPulse;
        const menuCtx = mainContext;
        menuCtx.save();
        menuCtx.globalAlpha = menuCardAlpha;
        menuCtx.fillStyle = '#000';
        // Draw rounded rectangle for menu
        menuCtx.beginPath();
        menuCtx.moveTo(menuCardX + menuCardRadius, menuCardY);
        menuCtx.lineTo(menuCardX + menuCardWidth - menuCardRadius, menuCardY);
        menuCtx.quadraticCurveTo(menuCardX + menuCardWidth, menuCardY, menuCardX + menuCardWidth, menuCardY + menuCardRadius);
        menuCtx.lineTo(menuCardX + menuCardWidth, menuCardY + menuCardHeight - menuCardRadius);
        menuCtx.quadraticCurveTo(menuCardX + menuCardWidth, menuCardY + menuCardHeight, menuCardX + menuCardWidth - menuCardRadius, menuCardY + menuCardHeight);
        menuCtx.lineTo(menuCardX + menuCardRadius, menuCardY + menuCardHeight);
        menuCtx.quadraticCurveTo(menuCardX, menuCardY + menuCardHeight, menuCardX, menuCardY + menuCardHeight - menuCardRadius);
        menuCtx.lineTo(menuCardX, menuCardY + menuCardRadius);
        menuCtx.quadraticCurveTo(menuCardX, menuCardY, menuCardX + menuCardRadius, menuCardY);
        menuCtx.closePath();
        menuCtx.fill();
        menuCtx.restore();
        // Menu Title
        drawHUDText('Main Menu', vec3(0.5, 0.50), 0.09, WHITE, 'arial', 'center', 900);
        // Menu Prompt
        drawHUDText('Press any space key to start', vec3(0.5, 0.56), 0.05, YELLOW, 'arial', 'center', 700);
        // Additional controls instructions
        drawHUDText('Controls:', vec3(0.5, 0.62), 0.04, WHITE, 'arial', 'center', 700);
        drawHUDText('WASD or Arrow Keys: Drive', vec3(0.5, 0.67), 0.035, YELLOW, 'arial', 'center', 600);
        drawHUDText('Mouse: Steer & Accelerate', vec3(0.5, 0.71), 0.035, YELLOW, 'arial', 'center', 600);
        drawHUDText('R: Restart   F: Free Ride', vec3(0.5, 0.75), 0.035, YELLOW, 'arial', 'center', 600);
        drawHUDText('T: Toggle Minimap', vec3(0.5, 0.79), 0.035, YELLOW, 'arial', 'center', 600);
        drawHUDText('Shift + F: Fullscreen', vec3(0.5, 0.83), 0.035, YELLOW, 'arial', 'center', 600);
        drawHUDText('Esc: Exit Fullscreen', vec3(0.5, 0.87), 0.035, GREEN, 'arial', 'center', 600);
        // Visual Start Button
        startMenuY = startMenuY + 140;
        menuCtx.save();
        menuCtx.globalAlpha = 0.85;
        menuCtx.fillStyle = '#222';
        const btnW = mainCanvasSize.x * 0.18;
        const btnH = startMenuY * 0.07;
        const btnX = (mainCanvasSize.x - btnW) / 2;
        const btnY = startMenuY * 0.56;
        menuCtx.beginPath();
        menuCtx.moveTo(btnX + 18, btnY);
        menuCtx.lineTo(btnX + btnW - 18, btnY);
        menuCtx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + 18);
        menuCtx.lineTo(btnX + btnW, btnY + btnH - 18);
        menuCtx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - 18, btnY + btnH);
        menuCtx.lineTo(btnX + 18, btnY + btnH);
        menuCtx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - 18);
        menuCtx.lineTo(btnX, btnY + 18);
        menuCtx.quadraticCurveTo(btnX, btnY, btnX + 18, btnY);
        menuCtx.closePath();
        menuCtx.fill();
        menuCtx.restore();
      //  drawHUDText('Click to Start', vec3(0.5, 0.82), 0.045, WHITE, 'arial', 'center', 900);
        // --- End Main Menu Card ---
    }
    else if (startCountdownTimer.active() || startCountdown) {
        // count down
        const a = 1 - time % 1;
        const t = !startCountdown && startCountdownTimer.active() ? 'GO!' : startCountdown | 0;
        const c = (startCountdown ? RED : GREEN).copy();
        c.a = a;
        drawHUDText(t, vec3(.5, .2), .25 - a * .1, c, undefined, undefined, 900, undefined, undefined, .03);
    }
    else {
        const wave1 = .04 * (1 - abs(Math.sin(time * 2)));
        if (gameOverTimer.isSet()) {
            // win screen
            const c = playerWin ? YELLOW : WHITE;
            const wave2 = .04 * (1 - abs(Math.sin(time * 2 + PI / 2)));
            drawHUDText(playerWin ? 'YOU ARE' : 'GAME', vec3(.5, .2), .1 + wave1, c, undefined, undefined, 900, 'italic', .5, undefined, 4);
            drawHUDText(playerWin ? 'WELCOME TO THE MAGIC GARDEN!' : 'MAGIC GARDEN!', vec3(.5, .3), .1 + wave2, c, undefined, undefined, 900, 'italic', .5, undefined, 4);

            if (playerNewRecord || playerNewDistanceRecord && !bestTime)
                drawHUDText('NEW RECORD', vec3(.5, .6), .08 + wave1 / 4, RED, 'monospace', undefined, 900, undefined, undefined, undefined, 3);
        }
        else if (!startCountdownTimer.active() && !freeRide) {
            // big center checkpoint time
            const c = checkpointTimeLeft < 4 ? RED : checkpointTimeLeft < 11 ? YELLOW : WHITE;
            const t = checkpointTimeLeft | 0;

            let y = .13, s = .14;
            if (enhancedMode && getAspect() < .6)
                y = .14, s = .1;

            drawHUDText(t, vec3(.5, y), s, c, undefined, undefined, 900, undefined, undefined, .04);
        }

        if (!freeRide) {
            if (playerWin) {
                // current time
                const timeString = formatTimeString(raceTime);
                if (!RP31KBuildLevel2)
                    drawHUDText('TIME', vec3(.5, .43), .08, undefined, 'monospace', undefined, 900, undefined, undefined, undefined, 3);
                drawHUDText(timeString, vec3(.5), .08, undefined, 'monospace', undefined, 900, undefined, undefined, undefined, 3);
            }
            else {
                // current time
                const timeString = formatTimeString(raceTime);
                drawHUDText(timeString, vec3(.01, .05), .05, undefined, 'monospace', 'left');

                // current stage
                const level = debug && testLevelInfo ? testLevelInfo.level + 1 : playerLevel + 1;
                drawHUDText('STAGE ' + level, vec3(.99, .05), .05, undefined, 'monospace', 'right');

            }
        }

        // --- HUD: Speed, Distance, Score, Level ---
        if (!titleScreenMode && !freeCamMode) {
            // --- Animated Card Background ---
            const cardX = 0;
            const cardY = 0;
            const cardWidth = mainCanvasSize.x * 0.38;
            const cardHeight = startMenuY * 0.4;
            const cardRadius = 28;
            // Animate opacity with a gentle pulse
            const baseAlpha = 0.55;
            const pulse = 0.08 * Math.abs(Math.sin(time * 1.5));
            const cardAlpha = baseAlpha + pulse;
            const cardCtx = mainContext;
            cardCtx.save();
            cardCtx.globalAlpha = cardAlpha;
            cardCtx.fillStyle = '#000';
            // Draw rounded rectangle
            cardCtx.beginPath();
            cardCtx.moveTo(cardX + cardRadius, cardY);
            cardCtx.lineTo(cardX + cardWidth - cardRadius, cardY);
            cardCtx.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + cardRadius);
            cardCtx.lineTo(cardX + cardWidth, cardY + cardHeight - cardRadius);
            cardCtx.quadraticCurveTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - cardRadius, cardY + cardHeight);
            cardCtx.lineTo(cardX + cardRadius, cardY + cardHeight);
            cardCtx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - cardRadius);
            cardCtx.lineTo(cardX, cardY + cardRadius);
            cardCtx.quadraticCurveTo(cardX, cardY, cardX + cardRadius, cardY);
            cardCtx.closePath();
            cardCtx.fill();
            cardCtx.restore();
            // --- End Animated Card Background ---

            // Speed (km/h)
            const speed = Math.round(playerVehicle.velocity.z);
            drawHUDText('Speed: ' + speed + ' km/h', vec3(.01, .12), .05, WHITE, 'arial', 'left', 900);
            // Distance (km)
            const distanceKm = playerVehicle.pos.z / 1000;
            drawHUDText('Distance: ' + distanceKm.toFixed(2) + ' km', vec3(.01, .18), .05, YELLOW, 'arial', 'left', 900);
            // Score
            if (typeof score === 'undefined') window.score = 0;
            drawHUDText('Score: ' + score, vec3(.01, .24), .05, YELLOW, 'arial', 'left', 900);
            // High Score
            if (typeof highScore !== 'undefined')
                drawHUDText('High Score: ' + highScore, vec3(.01, .29), .05, YELLOW, 'arial', 'left', 900);
            // Level
            drawHUDText('Level: ' + (playerLevel + 1), vec3(.01, .35), .05, YELLOW, 'arial', 'left', 900);
            let moto;
            if (playerLevel === 0) {
                moto = 'UBUMWE';
                drawHUDText('MOTO: ' + moto, vec3(.01, .42), .05, YELLOW, 'arial', 'left', 900);
            }
            else if (playerLevel === 1) {
                moto = 'UMURIMO';
                drawHUDText('MOTO: ' + moto, vec3(.01, .42), .05, YELLOW, 'arial', 'left', 900);
            }
            else if (playerLevel === 2 && playerLevel < 4) {
                moto = 'GUKUNDA IGIHUGU';
                drawHUDText('MOTO: ' + moto, vec3(.01, .42), .05, YELLOW, 'arial', 'left', 900);
            }
            else {
                moto = 'Ubumwe-Umurimo-gukunda-igihugu';
                drawHUDText('MOTO: ', vec3(.01, .42), .05, YELLOW, 'arial', 'left', 900);
                drawHUDText(moto, vec3(.01, .46), .05, YELLOW, 'arial', 'left', 900);
            }

            // Music Controls
            drawHUDText('Music Controls:', vec3(.99, .12), .04, WHITE, 'arial', 'right', 900);
            drawHUDText('1: Happy Birthday', vec3(.99, .17), .035, YELLOW, 'arial', 'right', 600);
            drawHUDText('2: Twinkle Star', vec3(.99, .21), .035, YELLOW, 'arial', 'right', 600);
            drawHUDText('3: Lullaby', vec3(.99, .25), .035, YELLOW, 'arial', 'right', 600);

            // Minimap
            if (HUD.minimapVisible) {
                const minimapSize = mainCanvasSize.x * 0.15;
                const minimapX = mainCanvasSize.x - minimapSize - 20;
                const minimapY = mainCanvasSize.y - minimapSize - 20;
                const minimapCtx = mainContext;
                const minimapCenterX = minimapX + minimapSize/2;
                const minimapCenterY = minimapY + minimapSize/2;
                const minimapRadius = minimapSize/2;
                
                // Draw minimap background
                minimapCtx.save();
                minimapCtx.globalAlpha = 0.7;
                minimapCtx.fillStyle = '#000';
                minimapCtx.beginPath();
                minimapCtx.arc(minimapCenterX, minimapCenterY, minimapRadius, 0, Math.PI * 2);
                minimapCtx.fill();
                minimapCtx.restore();

                // Calculate scale factor for the minimap
                const scaleFactor = minimapSize / 2000; // Adjust this value to change zoom level

                // Draw curved road
                minimapCtx.save();
                // Create circular clipping path
                minimapCtx.beginPath();
                minimapCtx.arc(minimapCenterX, minimapCenterY, minimapRadius, 0, Math.PI * 2);
                minimapCtx.clip();
                
                minimapCtx.strokeStyle = '#666';
                minimapCtx.lineWidth = 3;
                
                // Draw multiple curved road segments
                for (let i = -2; i <= 2; i++) {
                    const offset = i * 1000 * scaleFactor;
                    const startX = minimapCenterX - offset;
                    const startY = minimapCenterY + offset;
                    const endX = minimapCenterX + 1000 * scaleFactor - offset;
                    const endY = minimapCenterY - 1000 * scaleFactor + offset;
                    
                    // Calculate control points for the curve
                    const controlX1 = startX + (endX - startX) * 0.25;
                    const controlY1 = startY + (endY - startY) * 0.25;
                    const controlX2 = startX + (endX - startX) * 0.75;
                    const controlY2 = startY + (endY - startY) * 0.75;
                    
                    // Add some curve variation based on the segment
                    const curveAmount = Math.sin(i * 0.5) * 200 * scaleFactor;
                    
                    minimapCtx.beginPath();
                    minimapCtx.moveTo(startX, startY);
                    minimapCtx.bezierCurveTo(
                        controlX1 + curveAmount, controlY1,
                        controlX2 - curveAmount, controlY2,
                        endX, endY
                    );
                    minimapCtx.stroke();
                }
                minimapCtx.restore();

                // Draw player position
                if (playerVehicle && playerVehicle.pos) {
                    // Calculate player position relative to minimap center
                    const playerX = minimapCenterX + (playerVehicle.pos.x * scaleFactor);
                    const playerY = minimapCenterY - (playerVehicle.pos.z * scaleFactor);
                    
                    // Only draw if within minimap bounds
                    if (playerX >= minimapX && playerX <= minimapX + minimapSize &&
                        playerY >= minimapY && playerY <= minimapY + minimapSize) {
                        
                        // Draw car direction indicator
                        minimapCtx.save();
                        // Apply clipping for car
                        minimapCtx.beginPath();
                        minimapCtx.arc(minimapCenterX, minimapCenterY, minimapRadius, 0, Math.PI * 2);
                        minimapCtx.clip();
                        
                        minimapCtx.translate(playerX, playerY);
                        minimapCtx.rotate(playerVehicle.rot.y);
                        
                        // Draw car body
                        minimapCtx.fillStyle = '#0f0';
                        minimapCtx.beginPath();
                        minimapCtx.moveTo(0, -4); // Front
                        minimapCtx.lineTo(3, 2);  // Right
                        minimapCtx.lineTo(-3, 2); // Left
                        minimapCtx.closePath();
                        minimapCtx.fill();
                        
                        minimapCtx.restore();
                    }
                }

                // Draw minimap border
                minimapCtx.save();
                minimapCtx.strokeStyle = '#fff';
                minimapCtx.lineWidth = 2;
                minimapCtx.beginPath();
                minimapCtx.arc(minimapCenterX, minimapCenterY, minimapRadius, 0, Math.PI * 2);
                minimapCtx.stroke();
                minimapCtx.restore();

                // Draw minimap legend
                const legendX = minimapX + 5;
                const legendY = minimapY + 5;
                drawHUDText('Player', vec3(legendX/mainCanvasSize.x, legendY/mainCanvasSize.y), .02, '#0f0', 'arial', 'left', 600);
            }
        }

        // --- END HUD ---
        // Show checkpoint sign only if showCheckPoint and playerLevel > 0


    }

    if (debugInfo && !titleScreenMode) // mph
    {
        const mph = playerVehicle.velocity.z | 0;
        const mphPos = vec3(.01, .95);
        drawHUDText(mph + ' MPH', mphPos, .08, undefined, undefined, 'left', 900, 'italic');
    }
}

///////////////////////////////////////////////////////////////////////////////

function drawHUDText(text, pos, size = .1, color = WHITE, font = 'arial', textAlign = 'center', weight = 400, style = '', width, shadowScale = .07, outline) {
    size *= mainCanvasSize.y;
    if (width)
        width *= mainCanvasSize.y;
    pos = pos.multiply(mainCanvasSize);

    const context = mainContext;
    context.lineCap = context.lineJoin = 'round';
    context.font = `${style} ${weight} ${size}px ${font}`;
    context.textAlign = textAlign;

    const shadowOffset = size * shadowScale;
    context.fillStyle = rgb(0, 0, 0, color.a);
    if (shadowOffset)
        context.fillText(text, pos.x + shadowOffset, pos.y + shadowOffset, width);

    context.lineWidth = outline;
    outline && context.strokeText(text, pos.x, pos.y, width);
    context.fillStyle = color;
    context.fillText(text, pos.x, pos.y, width);
}