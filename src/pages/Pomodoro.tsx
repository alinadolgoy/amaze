import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';


interface PomodoroProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export default function Pomodoro({ theme, toggleTheme }: PomodoroProps) {
  const navigate = useNavigate();
  
  // Timer settings (in minutes)
  const [focusLength, setFocusLength] = useState(25);
  const [shortBreakLength, setShortBreakLength] = useState(5);
  const [longBreakLength, setLongBreakLength] = useState(15);
  
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef<any>(null);

  // --- AUDIO SYNTHESIS ENGINE ---
  const playAlertSound = (type: 'success' | 'click' | 'break') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'click') {
        // Soft button tap
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        // Uplifting ascending chime when focus session completes
        const playTriad = (freq: number, start: number, length: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.12, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + length);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + length);
        };
        playTriad(523.25, now, 0.4);       // C5
        playTriad(659.25, now + 0.15, 0.4); // E5
        playTriad(783.99, now + 0.3, 0.4);  // G5
        playTriad(1046.50, now + 0.45, 0.6);// C6
      } else if (type === 'break') {
        // Relaxing descending chime when break completes
        const playDesc = (freq: number, start: number, length: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.12, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + length);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + length);
        };
        playDesc(1046.50, now, 0.4);       // C6
        playDesc(783.99, now + 0.15, 0.4);  // G5
        playDesc(659.25, now + 0.3, 0.4);  // E5
        playDesc(523.25, now + 0.45, 0.6); // C5
      }
    } catch (e) {
      console.warn("Audio blocked or failed to run: ", e);
    }
  };

  // Switch Modes
  const switchMode = (newMode: TimerMode) => {
    playAlertSound('click');
    setTimerActive(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setMode(newMode);
    let newLen = focusLength;
    if (newMode === 'shortBreak') newLen = shortBreakLength;
    if (newMode === 'longBreak') newLen = longBreakLength;
    
    setTimeLeft(newLen * 60);
    setTotalDuration(newLen * 60);
  };

  // Timer Core Loop
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      
      if (mode === 'focus') {
        playAlertSound('success');
        setCompletedSessions(prev => prev + 1);
        // Automatically switch to short break
        switchMode('shortBreak');
      } else {
        playAlertSound('break');
        switchMode('focus');
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerActive, timeLeft]);

  // Adjust timers if focus lengths are customized
  useEffect(() => {
    if (!timerActive) {
      let newLen = focusLength;
      if (mode === 'shortBreak') newLen = shortBreakLength;
      if (mode === 'longBreak') newLen = longBreakLength;
      setTimeLeft(newLen * 60);
      setTotalDuration(newLen * 60);
    }
  }, [focusLength, shortBreakLength, longBreakLength]);

  const toggleTimer = () => {
    playAlertSound('click');
    setTimerActive(prev => !prev);
  };

  const resetTimer = () => {
    playAlertSound('click');
    setTimerActive(false);
    let newLen = focusLength;
    if (mode === 'shortBreak') newLen = shortBreakLength;
    if (mode === 'longBreak') newLen = longBreakLength;
    setTimeLeft(newLen * 60);
    setTotalDuration(newLen * 60);
  };

  // Formatting helper
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Circumference calculations for the large progress ring (radius = 90, circumference = 2 * PI * 90 = ~565.48)
  const circumference = 565.48;
  const strokeDashoffset = totalDuration > 0 
    ? (circumference - (timeLeft / totalDuration) * circumference) 
    : 0;

  // Active theme borders & pastel highlights based on Mode
  const getModeColorClass = () => {
    if (mode === 'focus') return 'text-[var(--color-primary)] stroke-[var(--color-primary)]';
    if (mode === 'shortBreak') return 'text-[var(--color-accent)] stroke-[var(--color-accent)]';
    return 'text-amber-400 stroke-amber-400';
  };

  const getModeBgClass = () => {
    if (mode === 'focus') return 'bg-emerald-500/10 text-[var(--color-primary)]';
    if (mode === 'shortBreak') return 'bg-indigo-500/10 text-[var(--color-accent)]';
    return 'bg-amber-500/10 text-amber-500';
  };

  return (
    <div className="app-container">
      {/* HEADER SECTION */}
      <header className="app-header glass">
        <div className="logo-section">
          <div className="barbell-logo">⏱️</div>
          <div className="logo-text">
            <h1 className="capitalize">{mode === 'focus' ? 'Focus Session' : 'Break Time'}</h1>
            <p>Amaze Pomodoro Timer</p>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            🏠 Hub
          </button>
          <button onClick={toggleTheme} className="btn-icon-only" aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* MODE TABS SWITCHER */}
      <section className="workout-selector glass">
        <div className="preset-tabs w-full flex">
          <button 
            onClick={() => switchMode('focus')} 
            className={`tab-btn flex-1 text-center py-2 ${mode === 'focus' ? 'active font-bold' : ''}`}
          >
            🎯 Focus ({focusLength}m)
          </button>
          <button 
            onClick={() => switchMode('shortBreak')} 
            className={`tab-btn flex-1 text-center py-2 ${mode === 'shortBreak' ? 'active font-bold' : ''}`}
          >
            ☕ Break ({shortBreakLength}m)
          </button>
          <button 
            onClick={() => switchMode('longBreak')} 
            className={`tab-btn flex-1 text-center py-2 ${mode === 'longBreak' ? 'active font-bold' : ''}`}
          >
            🌴 Long Break ({longBreakLength}m)
          </button>
        </div>
      </section>

      {/* HERO HERO TIMER COUNTER */}
      <div className="glass rounded-3xl p-8 flex flex-col items-center justify-center gap-6 border border-[var(--border-color)]">
        {/* Large Progress Dial */}
        <div className="relative w-56 h-56 md:w-64 md:h-64 flex items-center justify-center">
          <svg className="absolute top-0 left-0 transform -rotate-90 w-full h-full" viewBox="0 0 200 200">
            <circle 
              className="fill-none stroke-[var(--border-color)]" 
              cx="100" 
              cy="100" 
              r="90" 
              strokeWidth="6"
            />
            <circle 
              className={`fill-none stroke-linecap-round transition-[stroke-dashoffset] duration-300 ${getModeColorClass()}`}
              cx="100" 
              cy="100" 
              r="90" 
              strokeWidth="6"
              strokeDasharray="565.48"
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          
          <div className="flex flex-col items-center z-10">
            <span className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-main)]">
              {formatTime(timeLeft)}
            </span>
            <span className={`text-[10px] uppercase font-bold tracking-widest mt-1.5 px-2 py-0.5 rounded-full ${getModeBgClass()}`}>
              {mode === 'focus' ? 'Focus' : mode === 'shortBreak' ? 'Break' : 'Relax'}
            </span>
          </div>
        </div>

        {/* TIMER ACTION BUTTONS */}
        <div className="flex gap-4 w-full justify-center">
          <button 
            onClick={toggleTimer} 
            className={`btn px-8 py-3 text-base rounded-xl font-bold transition-all duration-300 cursor-pointer ${
              timerActive 
                ? 'bg-red-500/10 text-red-500 border border-red-500/30' 
                : 'btn-primary'
            }`}
          >
            {timerActive ? '⏸️ Pause' : '▶️ Start'}
          </button>
          <button 
            onClick={resetTimer} 
            className="btn btn-secondary px-6 py-3 text-base rounded-xl font-semibold cursor-pointer"
          >
            🔄 Reset
          </button>
        </div>

        <div className="text-xs text-[var(--text-muted)] font-medium text-center">
          Sessions completed: <span className="font-extrabold text-[var(--text-main)]">{completedSessions}</span>
        </div>
      </div>

      {/* MINIMAL COLLAPSIBLE CUSTOMIZATION SETTINGS */}
      <div className="glass rounded-2xl border border-[var(--border-color)] overflow-hidden transition-all duration-300">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="w-full p-4 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer select-none border-none bg-transparent hover:text-[var(--text-main)] transition-colors"
        >
          <span className="flex items-center gap-1.5">⚙️ Customize Durations</span>
          <span className="text-[9px] transform transition-transform duration-300 opacity-60">
            {showSettings ? '▲ Hide' : '▼ Expand'}
          </span>
        </button>
        
        {showSettings && (
          <div className="px-5 pb-5 flex flex-col gap-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[var(--text-muted)]">🎯 Focus Length</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFocusLength(prev => Math.max(1, prev - 5))} 
                    className="adjust-btn py-1 px-3"
                  >
                    -5
                  </button>
                  <span className="font-extrabold text-base w-10 text-center">{focusLength}m</span>
                  <button 
                    onClick={() => setFocusLength(prev => prev + 5)} 
                    className="adjust-btn py-1 px-3"
                  >
                    +5
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[var(--text-muted)]">☕ Short Break</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShortBreakLength(prev => Math.max(1, prev - 1))} 
                    className="adjust-btn py-1 px-3"
                  >
                    -1
                  </button>
                  <span className="font-extrabold text-base w-10 text-center">{shortBreakLength}m</span>
                  <button 
                    onClick={() => setShortBreakLength(prev => prev + 1)} 
                    className="adjust-btn py-1 px-3"
                  >
                    +1
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-[var(--text-muted)]">🌴 Long Break</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setLongBreakLength(prev => Math.max(1, prev - 5))} 
                    className="adjust-btn py-1 px-3"
                  >
                    -5
                  </button>
                  <span className="font-extrabold text-base w-10 text-center">{longBreakLength}m</span>
                  <button 
                    onClick={() => setLongBreakLength(prev => prev + 5)} 
                    className="adjust-btn py-1 px-3"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
