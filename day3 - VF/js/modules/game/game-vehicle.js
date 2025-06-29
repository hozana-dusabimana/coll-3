// Defines vehicle properties and controls vehicle behavior
'use strict';

function drawCars() {
    for (const v of vehicles)
        v.draw();
}

function updateCars() {
    // spawn in more vehicles
    const playerIsSlow = titleScreenMode || playerVehicle.velocity.z < 20;
    const trafficPosOffset = playerIsSlow ? 0 : 16e4; // check in front/behind
    const trafficLevel = (playerVehicle.pos.z + trafficPosOffset) / checkpointDistance;
    const trafficLevelInfo = getLevelInfo(trafficLevel);
    const trafficDensity = trafficLevelInfo.trafficDensity;
    const maxVehicleCount = 10 * trafficDensity;
    if (trafficDensity)
        if (vehicles.length < maxVehicleCount && !gameOverTimer.isSet() && !vehicleSpawnTimer.active()) {
            const spawnOffset = playerIsSlow ? -1300 : rand(5e4, 6e4);
            spawnVehicle(playerVehicle.pos.z + spawnOffset);
            vehicleSpawnTimer.set(rand(1, 2) / trafficDensity);
        }

    for (const v of vehicles)
        v.update();
    vehicles = vehicles.filter(o => !o.destroyed);
}

function spawnVehicle(z) {
    if (disableAiVehicles)
        return;

    const v = new Vehicle(z);
    vehicles.push(v);
    v.update();
}

///////////////////////////////////////////////////////////////////////////////

class Vehicle {
    constructor(z, color) {
        this.pos = vec3(0, 0, z);
        this.color = color;
        this.isBraking =
            this.drawTurn =
            this.drawPitch =
            this.wheelTurn = 0;
        this.collisionSize = vec3(230, 200, 380);
        this.velocity = vec3();

        if (!this.color) {
            this.color = // random color
                randInt(9) ? hsl(rand(), rand(.5, .9), .5) :
                    randInt(2) ? WHITE : hsl(0, 0, .1);

            // not player if no color
            //if (!isPlayer)
            {
                if (this.isTruck = randInt(2)) // random trucks
                {
                    this.collisionSize.z = 450;
                    this.truckColor = hsl(rand(), rand(.5, 1), rand(.2, 1));
                }

                // do not pick same lane as player if behind
                const levelInfo = getLevelInfo(this.pos.z / checkpointDistance);
                this.lane = randInt(levelInfo.laneCount);
                if (!titleScreenMode && z < playerVehicle.pos.z)
                    this.lane = playerVehicle.pos.x > 0 ? 0 : levelInfo.laneCount - 1;
                this.laneOffset = this.getLaneOffset();
                this.velocity.z = this.getTargetSpeed();
            }
        }
    }

    getTargetSpeed() {
        const levelInfo = getLevelInfo(this.pos.z / checkpointDistance);
        const lane = levelInfo.laneCount - 1 - this.lane; // flip side
        return max(120, 120 + lane * 20); // faster on left
    }

    getLaneOffset() {
        const levelInfo = getLevelInfo(this.pos.z / checkpointDistance);
        const o = (levelInfo.laneCount - 1) * laneWidth / 2;
        return this.lane * laneWidth - o;
    }

    update() {
        ASSERT(this != playerVehicle);

        // restore accel calculation
        const targetSpeed = this.getTargetSpeed();
        const accel = this.isBraking ? (--this.isBraking, -1) :
            this.velocity.z < targetSpeed ? .5 :
                this.velocity.z > targetSpeed + 10 ? -.5 : 0;

        // update lanes
        const levelInfo = getLevelInfo(this.pos.z / checkpointDistance);
        this.lane = min(this.lane, levelInfo.laneCount - 1);
        //if (rand() < .01 && this.pos.z > playerVehicle.pos.z)
        //    this.lane = randInt(levelInfo.laneCount);

        // move into lane
        const targetLaneOffset = this.getLaneOffset();
        this.laneOffset = lerp(.01, this.laneOffset, targetLaneOffset);
        const lanePos = this.laneOffset;
        this.pos.x = lanePos;

        // update physics
        this.pos.z += this.velocity.z = max(0, this.velocity.z + accel);

        // slow down if too close to other vehicles
        const x = this.laneOffset;
        for (const v of vehicles) {
            // slow down if behind
            if (v != this && v != playerVehicle)
                if (this.pos.z < v.pos.z + 500 && this.pos.z > v.pos.z - 2e3)
                    if (abs(x - v.laneOffset) < 500) // lane space 
                    {
                        if (this.pos.z >= v.pos.z)
                            this.destroyed = 1; // get rid of overlaps
                        this.velocity.z = min(this.velocity.z, v.velocity.z++); // clamp velocity & push
                        this.isBraking = 30;
                        break;
                    }
        }

        // move ai vehicles
        const trackInfo = new TrackSegmentInfo(this.pos.z);
        this.pos.x = trackInfo.pos.x + x;
        this.pos.y = trackInfo.offset.y;

        // get projected track angle
        const trackInfo2 = new TrackSegmentInfo(this.pos.z + trackSegmentLength);
        const delta = trackInfo2.pos.subtract(trackInfo.pos);
        this.drawTurn = Math.atan2(delta.x, delta.z);
        this.wheelTurn = this.drawTurn / 2;
        this.drawPitch = trackInfo.pitch;

        // remove in front or behind
        const playerDelta = this.pos.z - playerVehicle.pos.z;
        this.destroyed |= playerDelta > 7e4 || playerDelta < -2e3;
    }

    draw() {
        const trackInfo = new TrackSegmentInfo(this.pos.z);
        const vehicleHeight = 75;
        const p = this.pos.copy();
        p.y += vehicleHeight;
        p.z = p.z - cameraOffset;

        if (p.z < 0 && !freeCamMode) {
            // causes glitches if rendered
            return; // behind camera
        }

 

        // car
        const heading = this.drawTurn;
        const trackPitch = trackInfo.pitch;

        const carPitch = this.drawPitch;
        const mHeading = buildMatrix(0, vec3(0, heading), 0);
        const m1 = buildMatrix(p, vec3(carPitch, 0)).multiply(mHeading);
        const mcar = m1.multiply(buildMatrix(0, 0, vec3(450, this.isTruck ? 700 : 500, 450)));

        {
            // shadow
            glSetDepthTest(this != playerVehicle, 0); // no depth test for player shadow
            glPolygonOffset(60);
            const lightOffset = vec3(0, 0, -60).rotateY(worldHeading);
            const shadowColor = rgb(0, 0, 0, .5);
            const shadowPosBase = vec3(p.x, trackInfo.pos.y, p.z).addSelf(lightOffset);
            const shadowSize = vec3(-720, 200, 600); // why x negative?

            const m2 = buildMatrix(shadowPosBase, vec3(trackPitch, 0)).multiply(mHeading);
            const mshadow = m2.multiply(buildMatrix(0, 0, shadowSize));
            shadowMesh.renderTile(mshadow, shadowColor, spriteList.carShadow.spriteTile);
            glPolygonOffset();
            glSetDepthTest();
        }

        carMesh.render(mcar, this.color);
        //cubeMesh.render(m1.multiply(buildMatrix(0, 0, this.collisionSize)), BLACK);  // collis

        let bumperY = 130, bumperZ = -440;
        if (this.isTruck) {
            bumperY = 50;
            bumperZ = -560;
            const truckO = vec3(0, 290, -250);
            const truckColor = this.truckColor;
            const truckSize = vec3(240, truckO.y, 300);
            glPolygonOffset(20);
            cubeMesh.render(m1.multiply(buildMatrix(truckO, 0, truckSize)), truckColor);
        }
        glPolygonOffset(); // turn it off!

        if (optimizedCulling) {
            const distanceFromPlayer = this.pos.z - playerVehicle.pos.z;
            if (distanceFromPlayer > 4e4)
                return; // cull too far
        }

        // wheels
        const wheelRadius = 110;
        const wheelSpinScale = 400;
        const wheelSize = vec3(50, wheelRadius, wheelRadius);
        const wheelM1 = buildMatrix(0, vec3(this.pos.z / wheelSpinScale, this.wheelTurn), wheelSize);
        const wheelM2 = buildMatrix(0, vec3(this.pos.z / wheelSpinScale, 0), wheelSize);
        const wheelColor = hsl(0, 0, .2);
        const wheelOffset1 = vec3(240, 25, 220);
        const wheelOffset2 = vec3(240, 25, -300);
        for (let i = 4; i--;) {
            const wo = i < 2 ? wheelOffset1 : wheelOffset2;

            glPolygonOffset(this.isTruck && i > 1 && 20);
            const o = vec3(i % 2 ? wo.x : -wo.x, wo.y, i < 2 ? wo.z : wo.z);
            carWheel.render(m1.multiply(buildMatrix(o)).multiply(i < 2 ? wheelM1 : wheelM2), wheelColor);
        }

        // decals
        glPolygonOffset(40);

        // bumpers
        cubeMesh.render(m1.multiply(buildMatrix(vec3(0, bumperY, bumperZ), 0, vec3(140, 50, 20))), hsl(0, 0, .1));

        // break lights
        const isBraking = this.isBraking;
        for (let i = 2; i--;) {
            const color = isBraking ? hsl(0, 1, .5) : hsl(0, 1, .2);
            glEnableLighting = !isBraking; // make it full bright when braking
            cubeMesh.render(m1.multiply(buildMatrix(vec3((i ? 1 : -1) * 180, bumperY - 25, bumperZ - 10), 0, vec3(40, 25, 5))), color);
            glEnableLighting = 1;
            cubeMesh.render(m1.multiply(buildMatrix(vec3((i ? 1 : -1) * 180, bumperY + 25, bumperZ - 10), 0, vec3(40, 25, 5))), WHITE);
        }

        if (this == playerVehicle) {
            // only player needs front bumper
            cubeMesh.render(m1.multiply(buildMatrix(vec3(0, 10, 440), 0, vec3(240, 30, 30))), hsl(0, 0, .5));

            // license plate
            quadMesh.renderTile(m1.multiply(buildMatrix(vec3(0, bumperY - 80, bumperZ - 20), vec3(0, PI, 0), vec3(80, 25, 1))), WHITE, spriteList.carLicense.spriteTile);

            // top number
            const m3 = buildMatrix(0, vec3(0, PI)); // flip for some reason
            quadMesh.renderTile(m1.multiply(buildMatrix(vec3(0, 230, -200), vec3(PI / 2 - .2, 0, 0), vec3(140)).multiply(m3)), WHITE, spriteList.carNumber.spriteTile);
        }

        glPolygonOffset();
    }
}

///////////////////////////////////////////////////////////////////////////////

class PlayerVehicle extends Vehicle {
    constructor(z, color) {
        super(z, color, 1);
        this.playerTurn =
            this.bumpTime =
            this.onGround =
            this.engineTime = 0;
        this.hitTimer = new Timer;
    }

    draw() { titleScreenMode || super.draw(); }

    update() {
        if (titleScreenMode) {
            this.pos.z += this.velocity.z = 20;
            return;
        }

        const playHitSound = () => {
            if (!this.hitTimer.active()) {
                sound_hit.play(percent(this.velocity.z, 0, 50));
                this.hitTimer.set(.5);
            }
        }

        const hitBump = (amount = .98) => {
            this.velocity.z *= amount;
            if (this.bumpTime < 0) {
                sound_bump.play(percent(this.velocity.z, 0, 50));
                this.bumpTime = 500 * rand(1, 1.5);
                this.velocity.y += min(50, this.velocity.z) * rand(.1, .2);
            }
        }

        this.bumpTime -= this.velocity.z;

        if (!freeRide && checkpointSoundCount > 0 && !checkpointSoundTimer.active()) {
            sound_checkpoint.play();
            checkpointSoundTimer.set(.26);
            checkpointSoundCount--;
        }

        const playerDistance = playerVehicle.pos.z;
        if (!gameOverTimer.isSet())
            if (playerDistance > nextCheckpointDistance) {
                // checkpoint
                const oldLevel = playerLevel;
                ++playerLevel;
                showCheckPoint = (playerLevel > 0);
                nextCheckpointDistance += checkpointDistance;
                checkpointTimeLeft += extraCheckpointTime;
                if (enhancedMode)
                    checkpointTimeLeft = min(100, checkpointTimeLeft);

                // If entering stage 2, force start rain
                if (oldLevel === 1 && playerLevel === 2) {
                    forceStartRain();
                }

                if (playerLevel >= levelGoal && !gameOverTimer.isSet()) {
                    // end of game
                    playerWin = 1;
                    sound_win.play();
                    gameOverTimer.set();
                    if (!(debug && debugSkipped))
                        if (!freeRide) {
                            bestDistance = 0; // reset best distance
                            if (raceTime < bestTime || !bestTime) {
                                // new fastest time
                                bestTime = raceTime;
                                playerNewRecord = 1;
                            }
                            writeSaveData();
                        }
                }
                else {
                    //speak('CHECKPOINT');
                    checkpointSoundCount = 3;
                }
            }

        // check for collisions
        if (!testDrive)
            for (const v of vehicles) {
                const d = this.pos.subtract(v.pos);
                const s = this.collisionSize.add(v.collisionSize);
                if (v != this && abs(d.x) < s.x && abs(d.z) < s.z) {
                    // collision
                    const oldV = this.velocity.z;
                    this.velocity.z = v.velocity.z / 2;
                    //console.log(v.velocity.z, oldV*.9);
                    v.velocity.z = max(v.velocity.z, oldV * .9); // push other car
                    this.velocity.x = 99 * sign(d.x); // push away from car
                    playHitSound();
                    // --- Score Penalty on Collision ---
                    if (typeof collisionScorePenalty !== 'undefined') collisionScorePenalty = true;
                    // --- End Score Penalty ---
                }
            }

        // get player input
        let playerInputTurn = keyIsDown('ArrowRight') - keyIsDown('ArrowLeft');
        let playerInputGas = keyIsDown('ArrowUp');
        let playerInputBrake = keyIsDown('Space') || keyIsDown('ArrowDown');

        if (isUsingGamepad) {
            playerInputTurn = gamepadStick(0).x;
            playerInputGas = gamepadIsDown(0) || gamepadIsDown(7);
            playerInputBrake = gamepadIsDown(1) || gamepadIsDown(2) || gamepadIsDown(3) || gamepadIsDown(6);

            const analogGas = gamepadGetValue(7);
            if (analogGas)
                playerInputGas = analogGas;
            const analogBrake = gamepadGetValue(6);
            if (analogBrake)
                playerInputBrake = analogBrake;
        }

        if (playerInputGas)
            mouseControl = 0;
        if (debug && (mouseWasPressed(0) || mouseWasPressed(2) || isUsingGamepad && gamepadWasPressed(0)))
            testDrive = 0;

        if (mouseControl || mouseIsDown(0)) {
            mouseControl = 1;
            playerInputTurn = clamp(5 * (mousePos.x - .5), -1, 1);
            playerInputGas = mouseIsDown(0);
            playerInputBrake = mouseIsDown(2);

            if (isTouchDevice && mouseIsDown(0)) {
                const touch = 1.8 - 2 * mousePos.y;
                playerInputGas = percent(touch, .1, .2);
                playerInputBrake = touch < 0;
                playerInputTurn = clamp(3 * (mousePos.x - .5), -1, 1);
            }
        }
        if (freeCamMode)
            playerInputGas = playerInputTurn = playerInputBrake = 0;
        if (testDrive)
            playerInputGas = 1, playerInputTurn = 0;
        if (gameOverTimer.isSet())
            playerInputGas = playerInputTurn = playerInputBrake = 0;
        this.isBraking = playerInputBrake;

        const sound_velocity = max(40 + playerInputGas * 50, this.velocity.z);
        this.engineTime += sound_velocity * sound_velocity / 5e4;
        if (this.engineTime > 1) {
            if (--this.engineTime > 1)
                this.engineTime = 0;
            const f = sound_velocity;
            sound_engine.play(.1, f * f / 4e3 + rand(.1));
        }

        const playerTrackInfo = new TrackSegmentInfo(this.pos.z);
        const playerTrackSegment = playerTrackInfo.segmentIndex;

        // gravity
        const gravity = -3;           // gravity to apply in y axis
        this.velocity.y += gravity;

        // player settings
        const forwardDamping = .998;  // dampen player z speed
        const lateralDamping = .5;    // dampen player x speed
        const playerAccel = 1;        // player acceleration
        const playerBrake = 2;        // player acceleration when braking
        const playerMaxSpeed = 200;   // limit max player speed
        const speedPercent = this.velocity.z / playerMaxSpeed;
        const centrifugal = .5;

        // update physics
        const velocityAdjusted = this.velocity.copy();
        const trackHeadingScale = 20;
        const trackHeading = Math.atan2(trackHeadingScale * playerTrackInfo.offset.x, trackSegmentLength);
        const trackScaling = 1 / (1 + (this.pos.x / (2 * laneWidth)) * Math.tan(-trackHeading));
        velocityAdjusted.z *= trackScaling;
        this.pos.addSelf(velocityAdjusted);

        // Clamp car to visual road boundaries with much larger margin
        const playerTrackSegmentObj = track[playerTrackInfo.segmentIndex];
        if (playerTrackSegmentObj) {
            const visualHalfRoad = playerTrackSegmentObj.width / 2;
            const margin = 1000; // much larger margin
            this.pos.x = Math.max(-visualHalfRoad - margin, Math.min(visualHalfRoad + margin, this.pos.x));
        }

        // check if on ground
        const wasOnGround = this.onGround;
        this.onGround = this.pos.y < playerTrackInfo.offset.y;
        if (this.onGround) {
            this.pos.y = playerTrackInfo.offset.y;
            const trackPitch = playerTrackInfo.pitch;
            this.drawPitch = lerp(.2, this.drawPitch, trackPitch);

            // bounce off track
            const trackNormal = vec3(0, 1, 0).rotateX(trackPitch);
            const elasticity = 1.2;
            const normalDotVel = this.velocity.dot(trackNormal);
            const reflectVelocity = trackNormal.scale(-elasticity * normalDotVel);

            if (!gameOverTimer.isSet()) // dont roll in game over
                this.velocity.addSelf(reflectVelocity);
            if (!wasOnGround) {
                const p = percent(reflectVelocity.length(), 20, 80);
                sound_bump.play(p * 2, .5);
            }

            const trackSegment = track[playerTrackSegment];
            if (trackSegment && !trackSegment.sideStreet) // side streets are not offroad
                if (abs(this.pos.x) > playerTrackInfo.width - this.collisionSize.x && !testDrive)
                    hitBump(); // offroad

            // update velocity
            if (playerInputBrake)
                this.velocity.z -= playerBrake * playerInputBrake;
            else if (playerInputGas) {
                // extra boost at low speeds
                //const lowSpeedPercent = this.velocity.z**2/1e4;                
                const lowSpeedPercent = percent(this.velocity.z, 150, 0) ** 2;
                const accel = playerInputGas * playerAccel * lerp(speedPercent, 1, .5)
                    * lerp(lowSpeedPercent, 1, 3);
                //console.log(lerp(lowSpeedPercent, 1, 9))

                // apply acceleration in angle of road
                //const accelVec = vec3(0,0,accel).rotateX(trackSegment.pitch);
                //this.velocity.addSelf(accelVec);
                this.velocity.z += accel;
            }
            else if (this.velocity.z < 30)
                this.velocity.z *= .9; // slow to stop

            // dampen z velocity & clamp
            this.velocity.z = max(0, this.velocity.z * forwardDamping);
            this.velocity.x *= lateralDamping;
        }
        else {
            // in air
            this.drawPitch *= .99; // level out pitch
            this.onGround = 0;
        }

        {
            // turning
            let desiredPlayerTurn = startCountdown ? 0 : playerInputTurn;
            if (testDrive) {
                desiredPlayerTurn = clamp(-this.pos.x / 2e3, -1, 1);
                this.pos.x = clamp(this.pos.x, -playerTrackInfo.width, playerTrackInfo.width);
            }

            // scale desired turn input
            desiredPlayerTurn *= .4;
            const playerMaxTurnStart = 50; // fade on turning visual
            const turnVisualRamp = clamp(this.velocity.z / playerMaxTurnStart, 0, .1);
            this.wheelTurn = lerp(.1, this.wheelTurn, 1.3 * desiredPlayerTurn);
            this.playerTurn = lerp(.05, this.playerTurn, desiredPlayerTurn);
            this.drawTurn = lerp(turnVisualRamp, this.drawTurn, this.playerTurn);

            // centripetal force
            const centripetalForce = -velocityAdjusted.z * playerTrackInfo.offset.x * centrifugal;
            this.pos.x += centripetalForce

            // apply turn velocity and slip
            const physicsTurn = this.onGround ? this.playerTurn : 0;
            const maxStaticFriction = 30;
            const slip = maxStaticFriction / max(maxStaticFriction, abs(centripetalForce));

            const turnStrength = .8;
            const turnForce = turnStrength * physicsTurn * this.velocity.z;
            this.velocity.x += turnForce * slip;
        }

        if (playerWin)
            this.drawTurn = lerp(gameOverTimer.get(), this.drawTurn, -1);
        if (startCountdown)
            this.velocity.z = 0; // wait to start
        if (gameOverTimer.isSet())
            this.velocity = this.velocity.scale(.95);

        if (!testDrive) {
            // check for collisions
            const collisionCheckDistance = 20; // segments to check
            for (let i = -collisionCheckDistance; i < collisionCheckDistance; ++i) {
                const segmentIndex = playerTrackSegment + i;
                const trackSegment = track[segmentIndex];
                if (!trackSegment)
                    continue;

                // collidable objects
                for (const trackObject of trackSegment.trackObjects) {
                    if (!trackObject.collideSize)
                        continue;

                    // check for overlap
                    const pos = trackSegment.offset.add(trackObject.offset);
                    const dp = this.pos.subtract(pos);
                    const csx = this.collisionSize.x + trackObject.collideSize;
                    if (abs(dp.z) > 430 || abs(dp.x) > csx)
                        continue;

                    if (trackObject.sprite.isBump) {
                        trackObject.collideSize = 0; // prevent colliding again
                        hitBump(.8); // hit a bump
                    }
                    else if (trackObject.sprite.isSlow) {
                        trackObject.collideSize = 0; // prevent colliding again
                        sound_bump.play(percent(this.velocity.z, 0, 50) * 3, .2);
                        // just slow down the player
                        this.velocity.z *= .85;
                    }
                    else {
                        // push player away
                        const onSideOfTrack = abs(pos.x) + csx + 200 > playerTrackInfo.width;
                        const pushDirection = onSideOfTrack ?
                            -pos.x : // push towards center
                            dp.x;  // push away from object

                        this.velocity.x = 99 * sign(pushDirection);
                        this.velocity.z *= .7;
                        playHitSound();
                    }
                }
            }
        }
    }
}