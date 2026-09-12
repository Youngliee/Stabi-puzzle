(function () {
  'use strict';
  const KEY = 'stabi-escape-sound-v1';
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let enabled = true, context = null, master = null, noise = null, generation = 0;
  const active = new Set();
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (_) {}

  // Audio is created only after an interaction, never during page loading.
  function unlock() {
    if (!enabled || !AudioContext || document.hidden) return Promise.resolve(false);
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0.32;
        master.connect(context.destination);
        noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.2), context.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (context.state === 'running') return Promise.resolve(true);
      return context.resume().then(() => context.state === 'running', () => false);
    } catch (_) { return Promise.resolve(false); }
  }

  function stop() {
    generation++;
    for (const source of active) {
      try { source.stop(); } catch (_) {}
    }
    active.clear();
  }

  function play(makeSound) {
    if (!enabled || document.hidden) return;
    const requested = generation;
    unlock().then(ready => {
      if (!ready || !enabled || document.hidden || requested !== generation) return;
      try { makeSound(context.currentTime + 0.008); } catch (_) {}
    });
  }

  function voice(source, gain, start, duration, volume, filter) {
    source.connect(filter || gain);
    if (filter) filter.connect(gain);
    gain.connect(master);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    active.add(source);
    source.onended = () => {
      active.delete(source);
      source.disconnect();
      gain.disconnect();
      if (filter) filter.disconnect();
    };
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function tone(frequency, start, duration, volume, endFrequency) {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    voice(oscillator, context.createGain(), start, duration, volume);
  }

  function slide(distance) {
    play(start => {
      const duration = 0.085 + Math.min(5, Math.abs(distance) || 1) * 0.012;
      const source = context.createBufferSource();
      source.buffer = noise;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, start);
      filter.frequency.exponentialRampToValueAtTime(350, start + duration);
      filter.Q.value = 0.65;
      voice(source, context.createGain(), start, duration, 0.22, filter);
      tone(240, start + duration * 0.55, 0.07, 0.13, 140);
    });
  }

  function victory() {
    play(start => {
      [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => {
        tone(note, start + 0.13 * i, i === 3 ? 0.48 : 0.28, 0.17);
      });
    });
  }

  function toggle() {
    enabled = !enabled;
    try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (_) {}
    if (!enabled) stop();
    if (master) master.gain.value = enabled ? 0.32 : 0;
    if (enabled) play(start => tone(660, start, 0.13, 0.14));
    return enabled;
  }

  document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  document.addEventListener('keydown', event => { if (!event.repeat) unlock(); }, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
      if (context && context.state === 'running') context.suspend().catch(() => {});
    }
  });
  window.addEventListener('pagehide', stop);
  window.EscapeSound = { unlock, slide, victory, stop, toggle,
    get enabled() { return enabled && !!AudioContext; },
    get available() { return !!AudioContext; }
  };
})();
