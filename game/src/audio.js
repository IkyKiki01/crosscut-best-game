// One oscillator and one looping noise source, allocated on user activation only.
// Envelopes synthesize rifle cracks, low reports and bright confirmation pings.
export function createAudio() {
  let context, oscillator, gain, noiseGain;
  function unlock() {
    if (!context) {
      context = new AudioContext();
      oscillator = context.createOscillator();
      gain = context.createGain();
      oscillator.type = "sawtooth";
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = context.createBufferSource(),
        filter = context.createBiquadFilter();
      noise.buffer = buffer;
      noise.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 2800;
      noiseGain = context.createGain();
      noiseGain.gain.value = 0;
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(context.destination);
      noise.start();
    }
    context.resume();
  }
  function tone(frequency, volume, duration, crack) {
    if (!context) return;
    const now = context.currentTime;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(35, now + duration);
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noiseGain.gain.cancelScheduledValues(now);
    noiseGain.gain.setValueAtTime(crack ? volume * 0.9 : 0, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  }
  return {
    unlock,
    shot(player) {
      tone(player ? 150 : 90, player ? 0.08 : 0.025, 0.09, true);
    },
    hit() {
      tone(800, 0.035, 0.05, false);
    },
  };
}
