// Goal achievement sound effect - simple success tone
let audioContext = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
};

export const resumeAudioContext = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
};

export const playGoalSound = () => {
  const audioContext = getAudioContext();
  
  // Resume if suspended
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  // Create three ascending tones for a celebratory sound
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const now = audioContext.currentTime;
  
  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    const startTime = now + (index * 0.1);
    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.3);
  });
};
