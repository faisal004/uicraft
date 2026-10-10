let clickAudio: AudioContext | undefined;

export function playClick() {
  const context = clickAudio ?? new AudioContext();
  clickAudio = context;
  if (context.state === "suspended") void context.resume();

  const now = context.currentTime;
  const length = Math.floor(context.sampleRate * 0.008);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const noise = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  noise.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(5200, now);
  filter.Q.setValueAtTime(0.6, now);
  gain.gain.setValueAtTime(0.32, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  noise.start(now);
  noise.stop(now + 0.01);
}
