import { useState, useRef, useCallback, useEffect } from 'react';

type TimerMode = 'countdown' | 'stopwatch';

export function useTimer(mode: TimerMode, initialSeconds: number = 0) {
  const [time, setTime] = useState(mode === 'countdown' ? initialSeconds : 0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (intervalRef.current !== null) return;
    setIsFinished(false);
    setIsRunning(true);
    startTimeRef.current = performance.now();
    elapsedRef.current = 0;

    if (mode === 'countdown') {
      setTime(initialSeconds);
      intervalRef.current = window.setInterval(() => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, initialSeconds - elapsed);
        setTime(remaining);
        if (remaining <= 0) {
          stop();
          setIsFinished(true);
        }
      }, 50);
    } else {
      setTime(0);
      intervalRef.current = window.setInterval(() => {
        const elapsed = (performance.now() - startTimeRef.current) / 1000;
        elapsedRef.current = elapsed;
        setTime(elapsed);
      }, 50);
    }
  }, [mode, initialSeconds, stop]);

  const reset = useCallback(() => {
    stop();
    setTime(mode === 'countdown' ? initialSeconds : 0);
    setIsFinished(false);
    elapsedRef.current = 0;
  }, [mode, initialSeconds, stop]);

  const getElapsed = useCallback(() => {
    return elapsedRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { time, isRunning, isFinished, start, stop, reset, getElapsed };
}
