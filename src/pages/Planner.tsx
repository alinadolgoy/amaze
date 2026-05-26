import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface PlannerProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

interface FocusCard {
  id: string;
  task: string;
  duration: number; // in minutes
  timeLeft: number; // in seconds
  isActive: boolean;
  isCompleted: boolean;
}

export default function Planner({ theme, toggleTheme }: PlannerProps) {
  const navigate = useNavigate();
  
  // Load saved planner cards or default to a 25-minute setup
  const [cards, setCards] = useState<FocusCard[]>(() => {
    const saved = localStorage.getItem('amaze-planner-cards');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'default-1',
        task: 'Research project ideas',
        duration: 25,
        timeLeft: 25 * 60,
        isActive: false,
        isCompleted: false
      }
    ];
  });

  // State for creating a new focus card
  const [newCardTask, setNewCardTask] = useState('');
  const [newCardDuration, setNewCardDuration] = useState(25);

  const timerRef = useRef<any>(null);

  // Save cards to local storage
  useEffect(() => {
    localStorage.setItem('amaze-planner-cards', JSON.stringify(cards));
  }, [cards]);

  // Audio chimes
  const playSound = (type: 'success' | 'click' | 'tick') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
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
        playTriad(659.25, now + 0.1, 0.4); // E5
        playTriad(783.99, now + 0.2, 0.4); // G5
        playTriad(1046.50, now + 0.3, 0.6);// C6
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      console.warn("Audio blocked: ", e);
    }
  };

  // Timer Countdown loop (looks for the active card and decrements its timeLeft)
  useEffect(() => {
    const activeCard = cards.find(c => c.isActive);

    if (activeCard && activeCard.timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setCards(prevCards => 
          prevCards.map(c => {
            if (c.id === activeCard.id) {
              const newTime = c.timeLeft - 1;
              if (newTime === 0) {
                playSound('success');
                return { ...c, timeLeft: 0, isActive: false, isCompleted: true };
              }
              return { ...c, timeLeft: newTime };
            }
            return c;
          })
        );
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cards]);

  // Add a new Focus Card block
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTask.trim()) return;

    playSound('click');
    const newCard: FocusCard = {
      id: `card-${Date.now()}`,
      task: newCardTask,
      duration: newCardDuration,
      timeLeft: newCardDuration * 60,
      isActive: false,
      isCompleted: false
    };

    setCards([...cards, newCard]);
    setNewCardTask('');
  };

  // Toggle play/pause for a specific card's timer
  const handleToggleCardTimer = (cardId: string) => {
    playSound('click');
    setCards(prevCards => 
      prevCards.map(c => {
        if (c.id === cardId) {
          // Pause if active, otherwise pause all others and activate this one
          return { ...c, isActive: !c.isActive };
        }
        // Force pause on all other cards to prevent multi-timer runs
        return { ...c, isActive: false };
      })
    );
  };

  // Reset a specific card's timer
  const handleResetCardTimer = (cardId: string) => {
    playSound('click');
    setCards(prevCards => 
      prevCards.map(c => {
        if (c.id === cardId) {
          return { ...c, timeLeft: c.duration * 60, isActive: false, isCompleted: false };
        }
        return c;
      })
    );
  };

  // Delete a focus card block
  const handleDeleteCard = (cardId: string) => {
    playSound('click');
    setCards(prevCards => prevCards.filter(c => c.id !== cardId));
  };

  // Update card's task description directly inside card input
  const handleUpdateCardTask = (cardId: string, text: string) => {
    setCards(prevCards => 
      prevCards.map(c => {
        if (c.id === cardId) {
          return { ...c, task: text };
        }
        return c;
      })
    );
  };

  // Formatter helper
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      {/* HEADER SECTION */}
      <header className="app-header glass">
        <div className="logo-section">
          <div className="barbell-logo">📓</div>
          <div className="logo-text">
            <h1>Focus Planner</h1>
            <p>Task Blocks & Timers</p>
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

      {/* MINIMAL ADD CARD BLOCK */}
      <form onSubmit={handleAddCard} className="glass rounded-2xl p-4 border border-[var(--border-color)] flex flex-col gap-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Add Focus Session Block</h4>
        
        <div className="flex flex-col gap-2.5">
          <input
            type="text"
            required
            placeholder="What will you focus on during this block?"
            className="form-input text-sm w-full"
            value={newCardTask}
            onChange={e => setNewCardTask(e.target.value)}
          />
          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">Block Duration:</span>
              <select 
                className="form-input py-1 px-2.5 text-xs rounded-lg cursor-pointer bg-[var(--bg-tertiary)] border-[var(--border-color)]"
                value={newCardDuration}
                onChange={e => setNewCardDuration(parseInt(e.target.value) || 25)}
              >
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={25}>25 Minutes (Standard)</option>
                <option value={50}>50 Minutes (Deep Focus)</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary text-xs py-1.5 px-4 rounded-lg">
              ➕ Add Block
            </button>
          </div>
        </div>
      </form>

      {/* FOCUS CARDS CONTAINER */}
      <div className="flex flex-col gap-4">
        {cards.length === 0 ? (
          <div className="empty-workout glass py-8">
            <span style={{ fontSize: '32px' }}>📝</span>
            <h4 className="empty-title mt-2">No Focus Blocks Planned</h4>
            <p className="empty-desc">Create your first block above to start planning your task segments.</p>
          </div>
        ) : (
          cards.map(card => {
            // Circumference calculations for the mini progress ring (radius = 24, circumference = 2 * PI * 24 = ~150.8)
            const cardCircum = 150.8;
            const cardOffset = card.timeLeft > 0 
              ? (cardCircum - (card.timeLeft / (card.duration * 60)) * cardCircum) 
              : 0;

            return (
              <div 
                key={card.id} 
                className={`exercise-card glass flex flex-col gap-3 relative transition-all duration-300 ${
                  card.isCompleted ? 'border-emerald-500/30 bg-emerald-500/2' : ''
                } ${card.isActive ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20' : ''}`}
              >
                {/* Header info / input */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      className={`w-full bg-transparent border-none outline-none font-bold text-base text-[var(--text-main)] ${
                        card.isCompleted ? 'line-through opacity-60' : ''
                      }`}
                      value={card.task}
                      onChange={e => handleUpdateCardTask(card.id, e.target.value)}
                      placeholder="Focus task description..."
                    />
                    <div className="text-[11px] text-[var(--text-muted)] font-medium mt-1">
                      Duration: <span className="font-bold">{card.duration} mins</span>
                      {card.isCompleted && <span className="text-emerald-500 font-extrabold ml-1.5">✓ Completed</span>}
                    </div>
                  </div>

                  {/* Circular Timer Display */}
                  <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                    <svg className="absolute top-0 left-0 transform -rotate-90 w-full h-full" viewBox="0 0 54 54">
                      <circle 
                        className="fill-none stroke-[var(--border-color)]" 
                        cx="27" 
                        cy="27" 
                        r="24" 
                        strokeWidth="3.5"
                      />
                      <circle 
                        className={`fill-none stroke-linecap-round transition-all ${
                          card.isCompleted 
                            ? 'stroke-emerald-500' 
                            : card.isActive 
                              ? 'stroke-[var(--color-accent)]' 
                              : 'stroke-[var(--color-primary)]'
                        }`}
                        cx="27" 
                        cy="27" 
                        r="24" 
                        strokeWidth="3.5"
                        strokeDasharray="150.8"
                        strokeDashoffset={cardOffset}
                      />
                    </svg>
                    <span className="text-[10px] font-extrabold text-[var(--text-main)] z-10">
                      {formatTime(card.timeLeft)}
                    </span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex justify-between items-center border-t border-[var(--border-color)] pt-3 mt-1">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleToggleCardTimer(card.id)}
                      className={`btn py-1 px-3.5 text-xs rounded-lg font-bold ${
                        card.isActive 
                          ? 'bg-red-500/10 text-red-500 border border-red-500/30' 
                          : 'btn-primary'
                      }`}
                    >
                      {card.isActive ? '⏸️ Pause' : '▶️ Focus'}
                    </button>
                    <button 
                      onClick={() => handleResetCardTimer(card.id)}
                      className="adjust-btn py-1 px-2.5 text-xs rounded-lg font-semibold"
                    >
                      🔄 Reset
                    </button>
                  </div>

                  <button 
                    onClick={() => handleDeleteCard(card.id)}
                    className="text-[11px] font-bold text-red-500 hover:text-red-400 p-1.5 cursor-pointer"
                  >
                    🗑️ Delete Block
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
