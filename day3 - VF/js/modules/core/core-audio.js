// Handles audio playback and sound effects
'use strict';

///////////////////////////////////////////////////////////////////////////////
// Audio settings

let soundEnable = 1;
let soundVolume = .3;
let currentMusicPlayer = null;

///////////////////////////////////////////////////////////////////////////////

class MusicPlayer {
    constructor(context, tempo = 100) {
        this.context = context;
        this.tempo = tempo;
        this.currentTime = context.currentTime;
        this.noteFreq = {
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
            'G4': 392.00, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99
        };
    }

    playNote(note, duration) {
        const freq = this.noteFreq[note];
        if (!freq) return;

        const time = this.currentTime;
        const durationSec = (60 / this.tempo) * duration;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.02);
        gain.gain.linearRampToValueAtTime(0.05, time + 0.15);
        gain.gain.setValueAtTime(0.05, time + durationSec - 0.2);
        gain.gain.linearRampToValueAtTime(0, time + durationSec);

        const types = ['sine', 'triangle', 'sawtooth'];
        types.forEach((type, i) => {
            const osc = this.context.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(freq * (1 + i * 0.002), time);

            osc.connect(gain);
            gain.connect(this.context.destination);

            osc.start(time);
            osc.stop(time + durationSec);
        });

        this.currentTime += durationSec;
    }

    playSong(song) {
        this.currentTime = this.context.currentTime + 0.1;
        song.forEach(([note, duration]) => {
            this.playNote(note, duration);
        });

        const totalDuration = song.reduce((sum, [_, d]) => sum + d, 0);
        setTimeout(() => {
            this.playSong(song);
        }, (60 / this.tempo) * totalDuration * 1000);
    }
}

// Song data
const songs = {
    happyBirthday: [
        ['C4', 0.5], ['C4', 0.5], ['D4', 1], ['C4', 1], ['F4', 1], ['E4', 2],
        ['C4', 0.5], ['C4', 0.5], ['D4', 1], ['C4', 1], ['G4', 1], ['F4', 2],
        ['C4', 0.5], ['C4', 0.5], ['C5', 1], ['A4', 1], ['F4', 1], ['E4', 1], ['D4', 2],
        ['Bb4', 0.5], ['Bb4', 0.5], ['A4', 1], ['F4', 1], ['G4', 1], ['F4', 2]
    ],
    twinkle: [
        ['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['A4', 1], ['G4', 2],
        ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 2]
    ],
    lullaby: [
        ['F4', 1], ['F4', 1], ['C5', 1], ['A4', 1], ['A4', 1], ['F4', 2],
        ['G4', 1], ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1], ['C4', 2]
    ]
};

function playMusic(songName) {
    // Stop any currently playing music
    if (currentMusicPlayer) {
        // Stop all oscillators and gain nodes
        currentMusicPlayer.context.close();
        currentMusicPlayer = null;
    }

    // Create new audio context
    audioContext = new AudioContext();

    // Create a new player and start the new song
    const player = new MusicPlayer(audioContext, 100);
    currentMusicPlayer = player;
    player.playSong(songs[songName] || songs.happyBirthday);
}

// Add keyboard event listener for music
document.addEventListener('keydown', (event) => {
    if (!soundEnable) return;
    
    switch(event.key) {
        case '1':
            playMusic('happyBirthday');
            break;
        case '2':
            playMusic('twinkle');
            break;
        case '3':
            playMusic('lullaby');
            break;
    }
});

///////////////////////////////////////////////////////////////////////////////

class Sound
{
    constructor(zzfxSound)
    {
        if (!soundEnable) return;

        // generate zzfx sound now for fast playback
        this.randomness = zzfxSound[1] || 0;
        this.samples = zzfxG(...zzfxSound);
    }

    play(volume=1, pitch=1)
    {
        if (!soundEnable) return;

        // play the sound
        const playbackRate = pitch + this.randomness*rand(-pitch,pitch);
        return playSamples(this.samples, volume, playbackRate);
    }

    playNote(semitoneOffset, pos, volume)
    { return this.play(pos, volume, 2**(semitoneOffset/12), 0); }
}

///////////////////////////////////////////////////////////////////////////////

let audioContext;

function playSamples(samples, volume, rate) 
{
    const sampleRate=zzfxR;

    if (!soundEnable || isTouchDevice && !audioContext)
        return;
    
    if (!audioContext)
        audioContext = new AudioContext; // create audio context

    // prevent sounds from building up if they can't be played
    if (audioContext.state != 'running')
    {
        // fix stalled audio
        audioContext.resume();
        return; // prevent suspended sounds from building up
    }

    // create buffer and source
    const buffer = audioContext.createBuffer(1, samples.length, sampleRate), 
         source = audioContext.createBufferSource();

    // copy samples to buffer and setup source
    buffer.getChannelData(0).set(samples);
    source.buffer = buffer;
    source.playbackRate.value = rate;

    // create and connect gain node (createGain is more widely spported then GainNode construtor)
    const gainNode = audioContext.createGain();
    gainNode.gain.value = soundVolume*volume;
    gainNode.connect(audioContext.destination);

    // connect source to stereo panner and gain
    //source.connect(new StereoPannerNode(audioContext, {'pan':clamp(pan, -1, 1)})).connect(gainNode);
    source.connect(gainNode);

    // play and return sound
    source.start();
    return source;
}

///////////////////////////////////////////////////////////////////////////////
// ZzFXMicro - Zuper Zmall Zound Zynth - v1.3.1 by Frank Force

const zzfxR = 44100; 
function zzfxG
(
    // parameters
    volume = 1, randomness, frequency = 220, attack = 0, sustain = 0,
    release = .1, shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0,
    pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0,
    bitCrush = 0, delay = 0, sustainVolume = 1, decay = 0, tremolo = 0, filter = 0
)
{
    // init parameters
    let PI2 = PI*2, sampleRate = zzfxR,
        startSlide = slide *= 500 * PI2 / sampleRate / sampleRate,
        startFrequency = frequency *= PI2 / sampleRate, // no randomness
            // rand(1 + randomness, 1-randomness) * PI2 / sampleRate,
        b = [], t = 0, tm = 0, i = 0, j = 1, r = 0, c = 0, s = 0, f, length,

        // biquad LP/HP filter
        quality = 2, w = PI2 * abs(filter) * 2 / sampleRate,
        cos = Math.cos(w), alpha = Math.sin(w) / 2 / quality,
        a0 = 1 + alpha, a1 = -2*cos / a0, a2 = (1 - alpha) / a0,
        b0 = (1 + sign(filter) * cos) / 2 / a0, 
        b1 = -(sign(filter) + cos) / a0, b2 = b0,
        x2 = 0, x1 = 0, y2 = 0, y1 = 0;

    // scale by sample rate
    attack = attack * sampleRate + 9; // minimum attack to prevent pop
    decay *= sampleRate;
    sustain *= sampleRate;
    release *= sampleRate;
    delay *= sampleRate;
    deltaSlide *= 500 * PI2 / sampleRate**3;
    modulation *= PI2 / sampleRate;
    pitchJump *= PI2 / sampleRate;
    pitchJumpTime *= sampleRate;
    repeatTime = repeatTime * sampleRate | 0;

    ASSERT(shape != 3 && shape != 2); // need save space

    // generate waveform
    for(length = attack + decay + sustain + release + delay | 0;
        i < length; b[i++] = s * volume)               // sample
    {
        if (!(++c%(bitCrush*100|0)))                   // bit crush
        {
            s = shape? shape>1? 
                //shape>2? shape>3?      // wave shape
                //Math.sin(t**3) :                       // 4 noise
                //clamp(Math.tan(t),1,-1):               // 3 tan
                1-(2*t/PI2%2+2)%2:                     // 2 saw
                1-4*abs(Math.round(t/PI2)-t/PI2):      // 1 triangle
                Math.sin(t);                           // 0 sin

            s = (repeatTime ?
                    1 - tremolo + tremolo*Math.sin(PI2*i/repeatTime) // tremolo
                    : 1) *
                sign(s)*(abs(s)**shapeCurve) *           // curve
                (i < attack ? i/attack :                 // attack
                i < attack + decay ?                     // decay
                1-((i-attack)/decay)*(1-sustainVolume) : // decay falloff
                i < attack  + decay + sustain ?          // sustain
                sustainVolume :                          // sustain volume
                i < length - delay ?                     // release
                (length - i - delay)/release *           // release falloff
                sustainVolume :                          // release volume
                0);                                      // post release

            s = delay ? s/2 + (delay > i ? 0 :           // delay
                (i<length-delay? 1 : (length-i)/delay) * // release delay 
                b[i-delay|0]/2/volume) : s;              // sample delay

            if (filter)                                   // apply filter
                s = y1 = b2*x2 + b1*(x2=x1) + b0*(x1=s) - a2*y2 - a1*(y2=y1);
        }

        f = (frequency += slide += deltaSlide) *// frequency
            Math.cos(modulation*tm++);          // modulation
        t += f + f*noise*Math.sin(i**5);        // noise

        if (j && ++j > pitchJumpTime)           // pitch jump
        { 
            frequency += pitchJump;             // apply pitch jump
            startFrequency += pitchJump;        // also apply to start
            j = 0;                              // stop pitch jump time
        } 

        if (repeatTime && !(++r % repeatTime))  // repeat
        { 
            frequency = startFrequency;         // reset frequency
            slide = startSlide;                 // reset slide
            j = j || 1;                         // reset pitch jump time
        }
    }

    return b;
}
