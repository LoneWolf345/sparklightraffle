import { useCallback, useRef, useEffect, useState } from 'react';

// Simple synthesized sound effects using Web Audio API
export function useSoundEffects(enabled: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize audio context on first interaction
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        setIsReady(true);
      }
    };

    // Listen for user interaction to initialize audio
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, []);

  const playTick = useCallback(() => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }, [enabled]);

  const playDrumroll = useCallback(() => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const duration = 2;
    const tickCount = 30;
    
    for (let i = 0; i < tickCount; i++) {
      const time = ctx.currentTime + (i / tickCount) * duration;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Increase pitch as we get closer to the end
      const pitchMultiplier = 1 + (i / tickCount) * 0.5;
      oscillator.frequency.setValueAtTime(200 * pitchMultiplier, time);
      oscillator.type = 'triangle';
      
      // Decrease interval as we speed up
      const tickDuration = 0.05 - (i / tickCount) * 0.03;
      
      gainNode.gain.setValueAtTime(0.05, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + tickDuration);
      
      oscillator.start(time);
      oscillator.stop(time + tickDuration);
    }
  }, [enabled]);

  const playWinnerReveal = useCallback(() => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Triumphant ascending notes
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      const startTime = ctx.currentTime + i * 0.1;
      oscillator.frequency.setValueAtTime(freq, startTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  }, [enabled]);

  const playBonusPrize = useCallback(() => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Extra celebratory fanfare
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5 to G6
    
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      const startTime = ctx.currentTime + i * 0.08;
      oscillator.frequency.setValueAtTime(freq, startTime);
      oscillator.type = 'triangle';
      
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.4);
    });

    // Add a shimmer effect
    setTimeout(() => {
      if (!audioContextRef.current) return;
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      
      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      
      shimmerOsc.frequency.setValueAtTime(2000, ctx.currentTime);
      shimmerOsc.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.3);
      shimmerOsc.type = 'sine';
      
      shimmerGain.gain.setValueAtTime(0.05, ctx.currentTime);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      
      shimmerOsc.start(ctx.currentTime);
      shimmerOsc.stop(ctx.currentTime + 0.3);
    }, 400);
  }, [enabled]);

  const playComplete = useCallback(() => {
    if (!enabled || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Grand finale chord
    const frequencies = [261.63, 329.63, 392.00, 523.25]; // C major chord
    
    frequencies.forEach((freq) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1.5);
    });
  }, [enabled]);

  return {
    playTick,
    playDrumroll,
    playWinnerReveal,
    playBonusPrize,
    playComplete,
    isReady,
  };
}
