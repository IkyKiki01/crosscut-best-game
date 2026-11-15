// audio.js — owns synthesized weapon, hit and footstep cues and the gesture-driven context unlock.

const OSCILLATOR_TYPE = "sawtooth";
const NOISE_FILTER_FREQUENCY = 2800;
const TONE_FLOOR_FREQUENCY = 35;
const TONE_FLOOR_GAIN = 0.001;
const CRACK_FLOOR_GAIN = 0.0001;
const CRACK_DECAY_SECONDS = 0.08;
const CRACK_VOLUME_RATIO = 0.9;

const PLAYER_SHOT = { frequency: 150, volume: 0.08, duration: 0.09 };
const SENTINEL_SHOT = { frequency: 90, volume: 0.025, duration: 0.09 };
const HIT = { frequency: 800, volume: 0.035, duration: 0.05 };
const METAL_STEP = { frequency: 420, volume: 0.018, quietVolume: 0.006, duration: 0.09 };
const DECK_STEP = { frequency: 90, volume: 0.018, quietVolume: 0.006, duration: 0.045 };

/**
 * Builds the lazily-created Web Audio graph and exposes the cue triggers.
 * @returns {{unlock: Function, shot: Function, hit: Function, footstep: Function}} audio API
 */
export function createAudio() {
  let context;
  let oscillator;
  let gain;
  let noiseGain;

  /**
   * Creates the audio graph on first use, then resumes it after a gesture.
   * @returns {void}
   */
  function unlock() {
    if (!context) {
      context = new AudioContext();
      oscillator = context.createOscillator();
      gain = context.createGain();
      oscillator.type = OSCILLATOR_TYPE;
      gain.gain.value = 0;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();

      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let sampleIndex = 0; sampleIndex < data.length; sampleIndex++) {
        data[sampleIndex] = Math.random() * 2 - 1;
      }
      const noise = context.createBufferSource();
      const filter = context.createBiquadFilter();
      noise.buffer = buffer;
      noise.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = NOISE_FILTER_FREQUENCY;
      noiseGain = context.createGain();
      noiseGain.gain.value = 0;
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(context.destination);
      noise.start();
    }
    context.resume();
  }

  /**
   * Plays one pitched click with an optional noise crack layer.
   * @param {number} frequency starting oscillator frequency in hertz
   * @param {number} volume peak gain
   * @param {number} duration decay time in seconds
   * @param {boolean} crack true to add the filtered noise transient
   * @returns {void}
   */
  function tone(frequency, volume, duration, crack) {
    if (!context) return;
    const now = context.currentTime;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(TONE_FLOOR_FREQUENCY, now + duration);
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(TONE_FLOOR_GAIN, now + duration);
    noiseGain.gain.cancelScheduledValues(now);
    noiseGain.gain.setValueAtTime(crack ? volume * CRACK_VOLUME_RATIO : 0, now);
    noiseGain.gain.exponentialRampToValueAtTime(CRACK_FLOOR_GAIN, now + CRACK_DECAY_SECONDS);
  }

  /**
   * Fires the shot cue for the player or a sentinel.
   * @param {boolean} player true for the louder first-person report
   * @returns {void}
   */
  function shot(player) {
    const cue = player ? PLAYER_SHOT : SENTINEL_SHOT;
    tone(cue.frequency, cue.volume, cue.duration, true);
  }

  /**
   * Fires the confirmation blip used by hits, plants and flash detonations.
   * @returns {void}
   */
  function hit() {
    tone(HIT.frequency, HIT.volume, HIT.duration, false);
  }

  /**
   * Fires a footstep, voiced differently on steel than on deck plating.
   * @param {boolean} metal true when standing on steel
   * @param {boolean} quiet true when walking
   * @returns {void}
   */
  function footstep(metal, quiet) {
    const cue = metal ? METAL_STEP : DECK_STEP;
    tone(cue.frequency, quiet ? cue.quietVolume : cue.volume, cue.duration, !metal);
  }

  return { unlock, shot, hit, footstep };
}
