/**
 * Fully procedural audio: WebAudio-synthesised SFX + an adaptive dark-folk
 * score that layers instruments as the run escalates. No audio files at all —
 * the whole soundtrack is generated from oscillators, noise buffers and a
 * look-ahead scheduler.
 */

const SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10];
const ROOT = 55; // A1

import { Save } from './Save.js';

const noteHz = (semi) => ROOT * Math.pow(2, semi / 12);

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.ready = false;
        this.musicOn = true;
        this.sfxOn = true;
        this.intensity = 0;
        this.nextNoteTime = 0;
        this.step = 0;
        this.tempo = 96;
    }

    init() {
        if (this.ctx) { return; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { return; }
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);

        this.musicVol = Save.get('musicVol', 1);
        this.sfxVol = Save.get('sfxVol', 1);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = this.sfxOn ? 0.85 * this.sfxVol : 0;
        this.sfxBus.connect(this.master);

        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = this.musicOn ? 0.5 * this.musicVol : 0;
        // gentle glue for the score
        this.comp = this.ctx.createDynamicsCompressor();
        this.comp.threshold.value = -18;
        this.comp.ratio.value = 5;
        this.musicBus.connect(this.comp);
        this.comp.connect(this.master);

        this.noiseBuf = this.makeNoise(1.2);
        this.ready = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
    }

    resume() { if (this.ctx && this.ctx.state === 'suspended') { this.ctx.resume(); } }

    makeNoise(sec) {
        const len = Math.floor(this.ctx.sampleRate * sec);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) { d[i] = Math.random() * 2 - 1; }
        return buf;
    }

    setMusic(on) { this.musicOn = on; if (this.musicBus) { this.musicBus.gain.value = on ? 0.5 * (this.musicVol ?? 1) : 0; } }
    setSfx(on) { this.sfxOn = on; if (this.sfxBus) { this.sfxBus.gain.value = on ? 0.85 * (this.sfxVol ?? 1) : 0; } }
    setMusicVol(v) { this.musicVol = v; Save.setting('musicVol', v); if (this.musicBus && this.musicOn) { this.musicBus.gain.value = 0.5 * v; } }
    setSfxVol(v) { this.sfxVol = v; Save.setting('sfxVol', v); if (this.sfxBus && this.sfxOn) { this.sfxBus.gain.value = 0.85 * v; } }

    /* ── SFX helpers ── */

    tone({ f = 440, f2 = null, type = 'square', dur = 0.12, vol = 0.3, delay = 0, attack = 0.004, detune = 0 }) {
        if (!this.ready || !this.sfxOn) { return; }
        const t0 = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f, t0);
        if (f2) { osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur); }
        if (detune) { osc.detune.value = detune; }
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + attack);
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
        osc.connect(g); g.connect(this.sfxBus);
        osc.start(t0); osc.stop(t0 + dur + 0.02);
    }

    noise({ dur = 0.2, vol = 0.3, filter = 'bandpass', f = 1200, q = 1, sweep = null, delay = 0 }) {
        if (!this.ready || !this.sfxOn) { return; }
        const t0 = this.ctx.currentTime + delay;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const flt = this.ctx.createBiquadFilter();
        flt.type = filter;
        flt.frequency.setValueAtTime(f, t0);
        if (sweep) { flt.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), t0 + dur); }
        flt.Q.value = q;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t0);
        g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
        src.connect(flt); flt.connect(g); g.connect(this.sfxBus);
        src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
    }

    play(name, param = 0) {
        // suspended context (no gesture yet / background tab): skip node creation,
        // otherwise oscillators never end and the graph grows unbounded
        if (!this.ready || !this.sfxOn || this.ctx.state !== 'running') { return; }
        switch (name) {
            case 'shoot': this.tone({ f: 880 + Math.random() * 120, f2: 320, type: 'triangle', dur: 0.09, vol: 0.14 }); break;
            case 'lance': this.tone({ f: 1600, f2: 240, type: 'sawtooth', dur: 0.18, vol: 0.14 }); this.noise({ dur: 0.16, vol: 0.1, f: 3200, sweep: 500 }); break;
            case 'blade': this.noise({ dur: 0.07, vol: 0.06, f: 2600, q: 2, sweep: 900 }); break;
            case 'nova': this.tone({ f: 120, f2: 40, type: 'sine', dur: 0.4, vol: 0.4 }); this.noise({ dur: 0.35, vol: 0.22, filter: 'lowpass', f: 900, sweep: 120 }); break;
            case 'flask': this.tone({ f: 500, f2: 900, type: 'sine', dur: 0.08, vol: 0.1 }); break;
            case 'fire': this.noise({ dur: 0.5, vol: 0.12, filter: 'lowpass', f: 700, sweep: 200 }); break;
            case 'hit': this.noise({ dur: 0.06, vol: 0.12, f: 1800 + Math.random() * 800, q: 1.4, sweep: 400 }); break;
            case 'crit': this.noise({ dur: 0.1, vol: 0.2, f: 3000, q: 2, sweep: 600 }); this.tone({ f: 1200, f2: 300, type: 'square', dur: 0.12, vol: 0.12 }); break;
            case 'kill': this.tone({ f: 220 + Math.random() * 60, f2: 60, type: 'sawtooth', dur: 0.16, vol: 0.12 }); this.noise({ dur: 0.14, vol: 0.12, filter: 'lowpass', f: 800, sweep: 100 }); break;
            case 'explode': this.tone({ f: 90, f2: 30, type: 'sine', dur: 0.5, vol: 0.5 }); this.noise({ dur: 0.45, vol: 0.35, filter: 'lowpass', f: 1400, sweep: 90 }); break;
            case 'hurt': this.tone({ f: 160, f2: 60, type: 'square', dur: 0.22, vol: 0.3 }); this.noise({ dur: 0.2, vol: 0.2, filter: 'lowpass', f: 600 }); break;
            case 'dash': this.noise({ dur: 0.18, vol: 0.16, filter: 'bandpass', f: 600, sweep: 2600, q: 1.2 }); break;
            case 'xp': this.tone({ f: 1320 + param * 40, f2: 1760 + param * 40, type: 'sine', dur: 0.06, vol: 0.07 }); break;
            case 'levelup': [0, 4, 7, 12].forEach((s, i) => this.tone({ f: noteHz(s + 24), type: 'triangle', dur: 0.3, vol: 0.2, delay: i * 0.07 })); break;
            case 'upgrade': [7, 12, 16].forEach((s, i) => this.tone({ f: noteHz(s + 24), type: 'square', dur: 0.16, vol: 0.1, delay: i * 0.05 })); break;
            case 'gold': this.tone({ f: 1560, type: 'triangle', dur: 0.1, vol: 0.12 }); this.tone({ f: 2080, type: 'triangle', dur: 0.14, vol: 0.1, delay: 0.06 }); break;
            case 'chest': this.noise({ dur: 0.25, vol: 0.15, f: 500, sweep: 2000 }); [12, 16, 19, 24].forEach((s, i) => this.tone({ f: noteHz(s + 24), type: 'triangle', dur: 0.4, vol: 0.14, delay: 0.15 + i * 0.08 })); break;
            case 'heal': [12, 16, 19].forEach((s, i) => this.tone({ f: noteHz(s + 24), type: 'sine', dur: 0.25, vol: 0.14, delay: i * 0.06 })); break;
            case 'ui': this.tone({ f: 660, f2: 880, type: 'square', dur: 0.05, vol: 0.07 }); break;
            case 'uiBack': this.tone({ f: 440, f2: 300, type: 'square', dur: 0.07, vol: 0.07 }); break;
            case 'boss': this.tone({ f: 60, f2: 32, type: 'sawtooth', dur: 1.6, vol: 0.45 }); this.noise({ dur: 1.4, vol: 0.3, filter: 'lowpass', f: 400, sweep: 80 }); this.tone({ f: 62, f2: 33, type: 'sawtooth', dur: 1.6, vol: 0.35, detune: 18 }); break;
            case 'spit': this.tone({ f: 300, f2: 700, type: 'sine', dur: 0.1, vol: 0.1 }); break;
            case 'frost': this.noise({ dur: 0.25, vol: 0.14, filter: 'highpass', f: 2400, sweep: 6000 }); break;
            case 'deny': this.tone({ f: 200, f2: 140, type: 'square', dur: 0.12, vol: 0.12 }); break;
            case 'victory': [0, 7, 12, 16, 19, 24].forEach((s, i) => this.tone({ f: noteHz(s + 24), type: 'triangle', dur: 0.6, vol: 0.16, delay: i * 0.12 })); break;
            case 'defeat': [12, 8, 3, 0].forEach((s, i) => this.tone({ f: noteHz(s + 12), type: 'sawtooth', dur: 0.7, vol: 0.16, delay: i * 0.22 })); break;
        }
    }

    /* ── adaptive score ── */

    setIntensity(v) { this.intensity = Math.max(0, Math.min(3, v)); }

    schedule() {
        if (!this.ready || !this.musicOn || this.ctx.state !== 'running') { return; }
        const spb = 60 / this.tempo / 2;  // 8th notes
        // if the context was suspended for a while, don't dump queued notes at once
        if (this.nextNoteTime < this.ctx.currentTime) {
            this.nextNoteTime = this.ctx.currentTime + 0.05;
            this.step = 0;
        }
        while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
            this.playStep(this.step, this.nextNoteTime);
            this.nextNoteTime += spb;
            this.step = (this.step + 1) % 64;
        }
    }

    playStep(step, t) {
        this.stepsScheduled = (this.stepsScheduled || 0) + 1;
        const bar = Math.floor(step / 16);
        const s = step % 16;
        const I = this.intensity;
        const prog = [0, -2, -4, -5][bar % 4];   // Am F C G-ish minor motion

        // ── pad (always): soft detuned saws
        if (s === 0) {
            const semi = prog + 12;
            for (const det of [-6, 6]) {
                const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
                o.type = 'sawtooth'; o.frequency.value = noteHz(semi); o.detune.value = det;
                f.type = 'lowpass'; f.frequency.value = 420 + I * 160;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.05, t + 0.6);
                g.gain.linearRampToValueAtTime(0.0001, t + 3.6);
                o.connect(f); f.connect(g); g.connect(this.musicBus);
                o.start(t); o.stop(t + 3.8);
            }
        }

        // ── bass (intensity >= 1): root pulses on 8ths
        if (I >= 1 && s % 4 === 0) {
            this.mTone(noteHz(prog), t, 0.22, 'triangle', 0.16, 0.3);
        }

        // ── arpeggio (intensity >= 2): minor run
        if (I >= 2 && s % 2 === 0) {
            const idx = [0, 2, 4, 2, 5, 4, 2, 1][((step / 2) | 0) % 8];
            const semi = prog + 24 + SCALE_MINOR[idx % 7];
            this.mTone(noteHz(semi), t, 0.14, 'square', 0.045, 0.1);
        }

        // ── bells / melody (intensity >= 3): sparse haunting line
        if (I >= 3 && (step === 4 || step === 14 || step === 26 || step === 42 || step === 58)) {
            const mel = [0, 3, 7, 10, 12, 7, 3, -2];
            const semi = prog + 36 + mel[(step * 7) % 8];
            this.mTone(noteHz(semi), t, 0.7, 'sine', 0.07, 0.9);
            this.mTone(noteHz(semi) * 2.01, t, 0.4, 'sine', 0.02, 0.5);
        }

        // ── percussion
        if (I >= 2 && (s === 0 || s === 8)) { this.mKick(t, 0.5); }
        if (I >= 3 && (s === 4 || s === 12)) { this.mSnare(t, 0.25); }
        if (I >= 1 && s % 4 === 2) { this.mHat(t, 0.06); }
    }

    mTone(f, t, dur, type, vol, rel = 0.4) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
        o.connect(g); g.connect(this.musicBus);
        o.start(t); o.stop(t + dur + 0.05);
    }

    mKick(t, vol) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0006, t + 0.22);
        o.connect(g); g.connect(this.musicBus);
        o.start(t); o.stop(t + 0.25);
    }

    mSnare(t, vol) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0006, t + 0.16);
        src.connect(f); f.connect(g); g.connect(this.musicBus);
        src.start(t, Math.random()); src.stop(t + 0.2);
    }

    mHat(t, vol) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 7000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0006, t + 0.05);
        src.connect(f); f.connect(g); g.connect(this.musicBus);
        src.start(t, Math.random()); src.stop(t + 0.08);
    }
}

export const Audio = new AudioEngine();
