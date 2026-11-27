let audioCtx = null, soundOn = true; const sfxLast = {};
function sfx(type, power = 1) {
    if (!soundOn) return;
    const now = performance.now(); if (now - (sfxLast[type] || 0) < (type === 'boom' ? 120 : 70)) return; sfxLast[type] = now;
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const t = audioCtx.currentTime, master = audioCtx.createGain(); master.connect(audioCtx.destination);
        const noise = (dur, pow) => { const b = audioCtx.createBuffer(1, Math.max(1, (audioCtx.sampleRate * dur) | 0), audioCtx.sampleRate), d = b.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, pow);
            const s = audioCtx.createBufferSource(); s.buffer = b; return s; };
        if (type === 'boom') {
            const dur = 0.35 + Math.min(1.2, power / 40), s = noise(dur, 2.5), lp = audioCtx.createBiquadFilter();
            lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(70, t + dur);
            master.gain.value = Math.min(0.5, 0.15 + power / 120); s.connect(lp); lp.connect(master); s.start(t);
        } else if (type === 'glass') {
            const s = noise(0.14, 1.5), hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
            master.gain.value = 0.12; s.connect(hp); hp.connect(master); s.start(t);
        } else {
            const o = audioCtx.createOscillator(); o.type = type === 'click' ? 'square' : 'sine';
            o.frequency.setValueAtTime(type === 'click' ? 900 : 660, t); if (type === 'blip') o.frequency.linearRampToValueAtTime(920, t + 0.1);
            master.gain.setValueAtTime(type === 'click' ? 0.05 : 0.08, t); master.gain.exponentialRampToValueAtTime(0.001, t + (type === 'click' ? 0.05 : 0.12));
            o.connect(master); o.start(t); o.stop(t + 0.14);
        }
    } catch (e) {}
}

