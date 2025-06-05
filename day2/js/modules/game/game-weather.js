'use strict';

// Rain system configuration
const RAIN_CONFIG = {
    particleCount: 4000,  // Increased for denser rain
    rainSpeed: 3500,      // Faster rain
    rainLength: 200,      // Longer rain drops
    rainWidth: 4,         // Thicker rain drops
    rainColor: new Color(0.9, 0.9, 1, 0.6),  // Brighter rain drops
    splashRadius: 40,     // Larger splashes
    splashDuration: 0.5,  // Longer-lasting splashes
    wetnessFactor: 0.95,  // More pronounced wet effect
    cameraRange: 3500,    // Wider rain area
    windEffect: 0.2,      // Wind effect on rain
    splashCount: 3,       // Multiple splashes per drop
    splashSpread: 20,      // How far splashes spread
    maxSpeedLimit: 110,   // Maximum speed limit when raining
    speedLimitWarningThreshold: 105, // Speed at which to show warning
    speedLimitSoundVolume: 0.4, // Volume for speed limit warning
    skyDarkness: 0.85,    // Slightly less dark sky
    skyColor: new Color(0.12, 0.12, 0.18, 0.9), // Slightly brighter stormy sky
    skyDarkeningSpeed: 1.2, // Faster darkening for dramatic effect
    skyGradientIntensity: 0.95, // Strong gradient effect
    stormColor: new Color(0.08, 0.08, 0.15, 0.95) // Slightly brighter storm color
};

// Rain particles array
let rainParticles = [];
let rainSplashes = [];
let isRaining = false;
let wetnessLevel = 0;
let windDirection = 0;  // Wind direction in radians
let isStage2 = false;   // Track if we're in stage 2
let speedLimitWarningTimer = new Timer(); // Timer for speed limit warning
let lastSpeedLimitState = false; // Track if speed was limited last frame

class RainParticle {
    constructor() {
        this.reset();
    }

    reset() {
        // Random position in a larger area around the camera
        const range = RAIN_CONFIG.cameraRange;
        // Ensure cameraPos exists before using it
        if (!cameraPos) {
            this.pos = vec3(
                random.float(-range, range),
                random.float(1000, 2000),  // Higher starting point
                random.float(-range, range)
            );
        } else {
            this.pos = vec3(
                random.float(-range, range),
                random.float(1000, 2000),
                random.float(-range, range)
            ).addSelf(cameraPos);
        }
        this.speed = RAIN_CONFIG.rainSpeed * random.float(0.9, 1.1);
        this.active = true;
        this.angle = random.float(-0.15, 0.15); // Individual drop angle
    }

    update() {
        if (!this.active) return;

        // Update wind direction slowly
        windDirection += random.float(-0.01, 0.01) * timeDelta;
        windDirection = mod(windDirection, Math.PI * 2);

        // Move particle down with wind effect
        const windX = Math.sin(windDirection) * RAIN_CONFIG.windEffect;
        const windZ = Math.cos(windDirection) * RAIN_CONFIG.windEffect;

        this.pos.x += windX * this.speed * timeDelta;
        this.pos.y -= this.speed * timeDelta;
        this.pos.z += windZ * this.speed * timeDelta;

        // Add slight random movement
        this.pos.x += random.float(-0.1, 0.1) * timeDelta;
        this.pos.z += random.float(-0.1, 0.1) * timeDelta;

        // Check if particle hits ground
        if (this.pos.y < 0) {
            // Create multiple splashes
            for (let i = 0; i < RAIN_CONFIG.splashCount; i++) {
                const splashOffset = vec3(
                    random.float(-RAIN_CONFIG.splashSpread, RAIN_CONFIG.splashSpread),
                    0,
                    random.float(-RAIN_CONFIG.splashSpread, RAIN_CONFIG.splashSpread)
                );
                createSplash(this.pos.add(splashOffset));
            }
            this.reset();
        }

        // Reset if too far from camera
        if (cameraPos && this.pos.distance(cameraPos) > RAIN_CONFIG.cameraRange) {
            this.reset();
        }
    }

    draw() {
        if (!this.active) return;

        // Draw rain drop using the game's rendering system
        const dropLength = RAIN_CONFIG.rainLength * (1 + this.angle * 2);
        const endPos = this.pos.add(vec3(
            this.angle * dropLength,
            -dropLength,
            this.angle * dropLength
        ));

        // Create a new color for the rain drop with alpha variation
        const dropColor = new Color(
            RAIN_CONFIG.rainColor.r,
            RAIN_CONFIG.rainColor.g,
            RAIN_CONFIG.rainColor.b,
            RAIN_CONFIG.rainColor.a * (0.7 + random.float(0, 0.3))
        );

        // Use the game's sprite rendering system with a stretched dot
        pushSprite(
            this.pos,
            vec3(RAIN_CONFIG.rainWidth * 2, dropLength),
            dropColor,
            spriteList.dot.spriteTile
        );
    }
}

class RainSplash {
    constructor(pos) {
        // Create a new vector instead of using clone
        this.pos = vec3(pos.x, pos.y, pos.z);
        this.time = 0;
        this.active = true;
        this.scale = random.float(0.8, 1.2); // Random size variation
        this.rotation = random.float(0, Math.PI * 2); // Random rotation
    }

    update() {
        if (!this.active) return;

        this.time += timeDelta;
        if (this.time >= RAIN_CONFIG.splashDuration) {
            this.active = false;
        }
    }

    draw() {
        if (!this.active) return;

        const progress = this.time / RAIN_CONFIG.splashDuration;
        const radius = RAIN_CONFIG.splashRadius * this.scale * (1 - progress);
        const alpha = (1 - progress) * 0.6; // More visible splashes

        // Create a more dynamic splash effect
        const splashColor = new Color(1, 1, 1, alpha);

        // Draw multiple overlapping circles for a more complex splash
        for (let i = 0; i < 2; i++) {
            const offset = vec3(
                Math.cos(this.rotation + i * Math.PI) * radius * 0.2,
                0,
                Math.sin(this.rotation + i * Math.PI) * radius * 0.2
            );

            pushSprite(
                this.pos.add(offset),
                vec3(radius * 2 * (1 - i * 0.3), radius * 2 * (1 - i * 0.3)),
                splashColor,
                spriteList.circle.spriteTile
            );
        }
    }
}

function createSplash(pos) {
    if (rainSplashes.length < 50) { // Limit number of splashes
        rainSplashes.push(new RainSplash(pos));
    }
}

function initRain() {
    rainParticles = [];
    rainSplashes = [];
    for (let i = 0; i < RAIN_CONFIG.particleCount; i++) {
        rainParticles.push(new RainParticle());
    }
}

// Function to check and update stage
function updateStage() {
    const newStage2 = playerLevel === 1;
    console.log('[Rain System] Checking stage:', {
        currentStage2: isStage2,
        newStage2: newStage2,
        playerLevel: playerLevel,
        isRaining: isRaining
    });

    if (newStage2 !== isStage2) {
        console.log('[Rain System] Stage changed:', {
            from: isStage2 ? 'stage 2' : 'other stage',
            to: newStage2 ? 'stage 2' : 'other stage',
            playerLevel: playerLevel
        });

        isStage2 = newStage2;
        // If entering stage 2 (level 1), automatically start rain with maximum intensity
        if (isStage2) {
            console.log('[Rain System] Entering stage 2 (level 1), forcing rain start');
            forceStartRain();
        }
    }
}

// Function to force start rain (used for stage 2)
function forceStartRain() {
    console.log('[Rain System] Force starting rain for stage 2');
    console.log('[Rain System] Current state:', {
        isRaining: isRaining,
        isStage2: isStage2,
        wetnessLevel: wetnessLevel,
        playerLevel: playerLevel
    });

    isRaining = true;
    isStage2 = true;
    initRain();
    wetnessLevel = 1; // Start at maximum intensity

    console.log('[Rain System] After force start:', {
        isRaining: isRaining,
        isStage2: isStage2,
        wetnessLevel: wetnessLevel,
        playerLevel: playerLevel,
        particleCount: rainParticles.length
    });
}

// Separate function to start rain
function startRain() {
    // If in stage 2, always force rain on
    if (isStage2) {
        forceStartRain();
        return;
    }

    isRaining = true;
    initRain();
}

function updateRain() {
    // Always check stage first
    updateStage();

    if (!isRaining) {
        if (isStage2) {
            console.log('[Rain System] Warning: In stage 2 but rain is not active');
            forceStartRain();
        }
        return;
    }

    // Update wetness level faster for heavy rain with dramatic darkening
    const oldWetness = wetnessLevel;
    wetnessLevel = Math.min(1, wetnessLevel + timeDelta * RAIN_CONFIG.skyDarkeningSpeed * (isStage2 ? 1.5 : 1));

    if (Math.abs(oldWetness - wetnessLevel) > 0.1) {
        console.log('[Rain System] Wetness level changed:', {
            from: oldWetness,
            to: wetnessLevel,
            isStage2: isStage2
        });
    }

    // Update particles
    let activeParticles = 0;
    for (const particle of rainParticles) {
        particle.update();
        if (particle.active) activeParticles++;
    }

    // Update splashes
    let activeSplashes = 0;
    for (let i = rainSplashes.length - 1; i >= 0; i--) {
        const splash = rainSplashes[i];
        splash.update();
        if (splash.active) activeSplashes++;
        if (!splash.active) {
            rainSplashes.splice(i, 1);
        }
    }

    // Enforce speed limit when raining
    if (playerVehicle) {
        enforceRainSpeedLimit(playerVehicle);
    }

    if (frame % 60 === 0) { // Log every second
        console.log('[Rain System] Update stats:', {
            activeParticles: activeParticles,
            activeSplashes: activeSplashes,
            wetnessLevel: wetnessLevel,
            isStage2: isStage2,
            playerLevel: playerLevel,
            currentSpeed: playerVehicle ? playerVehicle.velocity.z : 0
        });
    }
}

function drawRain() {
    if (!isRaining) return;

    // Draw dark storm sky overlay
    const ctx = mainContext;
    ctx.save();

    // Calculate sky darkness based on wetness level
    const darkness = RAIN_CONFIG.skyDarkness * wetnessLevel;

    // Create a dramatic storm gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, mainCanvasSize.y);

    // Top of sky - darkest part of the storm
    const topColor = new Color(
        RAIN_CONFIG.stormColor.r,
        RAIN_CONFIG.stormColor.g,
        RAIN_CONFIG.stormColor.b,
        darkness * RAIN_CONFIG.skyGradientIntensity
    );

    // Middle of sky - main storm color
    const midColor = new Color(
        RAIN_CONFIG.skyColor.r,
        RAIN_CONFIG.skyColor.g,
        RAIN_CONFIG.skyColor.b,
        darkness
    );

    // Bottom of sky - slightly lighter but still dark
    const bottomColor = new Color(
        RAIN_CONFIG.skyColor.r * 1.4,  // Increased brightness
        RAIN_CONFIG.skyColor.g * 1.4,
        RAIN_CONFIG.skyColor.b * 1.4,
        darkness * 0.75  // Slightly more transparent
    );

    // Add gradient stops for dramatic storm effect
    gradient.addColorStop(0, topColor.toString());
    gradient.addColorStop(0.3, midColor.toString());
    gradient.addColorStop(0.7, midColor.toString());
    gradient.addColorStop(1, bottomColor.toString());

    // Fill with storm gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, mainCanvasSize.x, mainCanvasSize.y);

    // Add a subtle dark vignette effect with reduced intensity
    const vignetteGradient = ctx.createRadialGradient(
        mainCanvasSize.x * 0.5, mainCanvasSize.y * 0.5, 0,
        mainCanvasSize.x * 0.5, mainCanvasSize.y * 0.5, mainCanvasSize.x * 0.8
    );
    vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)'); // Reduced vignette darkness
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, mainCanvasSize.x, mainCanvasSize.y);

    ctx.restore();

    // Draw rain particles
    for (const particle of rainParticles) {
        particle.draw();
    }

    // Draw splashes
    for (const splash of rainSplashes) {
        splash.draw();
    }

    // Draw speed limit warning if needed
    if (playerVehicle && playerVehicle.speed > RAIN_CONFIG.speedLimitWarningThreshold) {
        const warningAlpha = 0.7 + 0.3 * Math.sin(time * 5); // Pulsing effect
        const warningColor = new Color(1, 0.2, 0.2, warningAlpha);

        // Draw warning text
        ctx.save();
        ctx.globalAlpha = warningAlpha;
        ctx.fillStyle = warningColor.toString();
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SPEED LIMIT', mainCanvasSize.x * 0.5, mainCanvasSize.y * 0.2);
        ctx.fillText(RAIN_CONFIG.maxSpeedLimit + ' km/h', mainCanvasSize.x * 0.5, mainCanvasSize.y * 0.25);
        ctx.restore();
    }
}

// Function to toggle rain (only used for manual toggling)
function toggleRain() {
    // In stage 2, rain cannot be toggled
    if (isStage2) {
        return;
    }

    isRaining = !isRaining;
    if (isRaining) {
        initRain();
    } else {
        wetnessLevel = Math.max(0, wetnessLevel - timeDelta * 0.5);
    }
}

// Function to get current wetness level (0-1)
function getWetnessLevel() {
    return wetnessLevel;
}

// Function to enforce speed limit when raining
function enforceRainSpeedLimit(vehicle) {
    if (!vehicle) return false;

    // Only enforce speed limit if it's raining
    if (isRaining) {
        const maxSpeed = RAIN_CONFIG.maxSpeedLimit;
        const currentSpeed = vehicle.velocity.z;

        if (currentSpeed > maxSpeed) {
            console.log('[Rain System] Enforcing speed limit:', {
                currentSpeed: currentSpeed,
                maxSpeed: maxSpeed,
                isRaining: isRaining
            });

            // Directly enforce speed limit
            vehicle.velocity.z = maxSpeed;

            // Play warning sound if approaching limit
            if (currentSpeed > RAIN_CONFIG.speedLimitWarningThreshold && !speedLimitWarningTimer.active()) {
                sound_speedlimit.play(RAIN_CONFIG.speedLimitSoundVolume);
                speedLimitWarningTimer.set(1); // Prevent sound spam
            }

            return true; // Return true to indicate speed was limited
        }
    }
    return false;
}

// Initialize rain system
function initRainSystem() {
    console.log('[Rain System] Initializing rain system');
    console.log('[Rain System] Initial state:', {
        playerLevel: playerLevel,
        isStage2: isStage2,
        isRaining: isRaining,
        wetnessLevel: wetnessLevel
    });

    // Check if we're in stage 2 (level 1) at startup
    isStage2 = playerLevel === 1;
    if (isStage2) {
        console.log('[Rain System] Starting in stage 2 (level 1), forcing rain');
        forceStartRain();
    } else {
        console.log('[Rain System] Not in stage 2, rain not forced');
    }
}

// Export functions
window.initRain = initRain;
window.updateRain = updateRain;
window.drawRain = drawRain;
window.toggleRain = toggleRain;
window.getWetnessLevel = getWetnessLevel;
window.enforceRainSpeedLimit = enforceRainSpeedLimit;
window.initRainSystem = initRainSystem; 