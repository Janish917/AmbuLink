'use client';

import { useRef, useCallback, useEffect } from 'react';

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenOscRef = useRef<OscillatorNode | null>(null);
  const sirenGainRef = useRef<GainNode | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playBeep = useCallback((type: 'success' | 'alert' = 'alert') => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'alert') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  }, []);

  const playSiren = useCallback(() => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (sirenOscRef.current) {
      sirenOscRef.current.stop();
      sirenOscRef.current.disconnect();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    // LFO for the wail effect
    lfo.type = 'sine';
    lfo.frequency.value = 0.5; // Siren sweep speed
    lfo.connect(lfoGain);
    
    lfoGain.gain.value = 400; // Sweep range
    lfoGain.connect(osc.frequency);

    osc.type = 'sawtooth';
    osc.frequency.value = 700; // Base frequency
    
    gain.gain.value = 0.05; // Master volume for siren
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    lfo.start();

    sirenOscRef.current = osc;
    sirenGainRef.current = gain;
  }, []);

  const stopSiren = useCallback(() => {
    if (sirenGainRef.current && audioCtxRef.current) {
      // Fade out
      sirenGainRef.current.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.5);
      setTimeout(() => {
        if (sirenOscRef.current) {
          try { sirenOscRef.current.stop(); } catch (e) {}
          sirenOscRef.current.disconnect();
          sirenOscRef.current = null;
        }
      }, 500);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSiren();
    };
  }, [stopSiren]);

  return { playBeep, playSiren, stopSiren };
}
