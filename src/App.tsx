import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Types
interface Exercise {
  id: string;
  name: string;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  sets: number;
  reps: number;
  restDuration: number; // in seconds
  completedSets: (number | null)[]; // null means not done, 0-5 means reps completed
}

interface WorkoutPreset {
  name: string;
  exercises: Omit<Exercise, 'completedSets'>[];
}

// Preset Workouts (StrongLifts 5x5 default)
const PRESETS: Record<string, WorkoutPreset> = {
  'Workout A': {
    name: 'Workout A',
    exercises: [
      { id: 'squat', name: 'Barbell Squat', weight: 60, weightUnit: 'kg', sets: 5, reps: 5, restDuration: 90 },
      { id: 'bench', name: 'Barbell Bench Press', weight: 40, weightUnit: 'kg', sets: 5, reps: 5, restDuration: 90 },
      { id: 'row', name: 'Barbell Row', weight: 35, weightUnit: 'kg', sets: 5, reps: 5, restDuration: 90 },
    ],
  },
  'Workout B': {
    name: 'Workout B',
    exercises: [
      { id: 'squat-b', name: 'Barbell Squat', weight: 60, weightUnit: 'kg', sets: 5, reps: 5, restDuration: 90 },
      { id: 'ohp', name: 'Overhead Press', weight: 25, weightUnit: 'kg', sets: 5, reps: 5, restDuration: 90 },
      { id: 'deadlift', name: 'Deadlift', weight: 70, weightUnit: 'kg', sets: 1, reps: 5, restDuration: 180 },
    ],
  },
};

function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<string>('Workout A');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Timer State
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerDuration, setTimerDuration] = useState<number>(0);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [timerExerciseName, setTimerExerciseName] = useState<string>('');
  
  // Modals / Drawer Editing State
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  
  // Custom Exercise Builder Form
  const [newExName, setNewExName] = useState('');
  const [newExWeight, setNewExWeight] = useState(40);
  const [newExSets, setNewExSets] = useState(5);
  const [newExReps, setNewExReps] = useState(5);
  const [newExRest, setNewExRest] = useState(90);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- AUDIO SYNTHESIS ENGINE ---
  const playSoundTone = (type: 'tick' | 'chime' | 'success') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'tick') {
        // High frequency soft click for rep changes
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        // Double sweet note for workout completion
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc2.frequency.setValueAtTime(1046.50, now + 0.3); // C6

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start(now);
        osc1.stop(now + 0.5);
        osc2.start(now + 0.2);
        osc2.stop(now + 0.5);
      } else if (type === 'chime') {
        // Beautiful major triad chime for rest timer completion
        const playTriad = (freq: number, start: number, length: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.15, start);
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
      }
    } catch (e) {
      console.warn("Web Audio API blocked or failed to run: ", e);
    }
  };

  // --- PERSISTENCE ---
  // Load Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('lift-theme');
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.add('light-theme');
    } else {
      setTheme('dark');
      document.documentElement.classList.remove('light-theme');
    }
  }, []);

  // Toggle Theme
  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('lift-theme', 'light');
    } else {
      setTheme('dark');
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('lift-theme', 'dark');
    }
  };

  // Load active tab exercises on change
  useEffect(() => {
    const savedExercises = localStorage.getItem(`lift-workout-${activeTab}`);
    if (savedExercises) {
      setExercises(JSON.parse(savedExercises));
    } else {
      // Load preset
      const preset = PRESETS[activeTab] || PRESETS['Workout A'];
      const initialExercises = preset.exercises.map(ex => ({
        ...ex,
        completedSets: Array(ex.sets).fill(null)
      }));
      setExercises(initialExercises);
    }
  }, [activeTab]);

  // Save current exercises on change
  const saveExercises = (updated: Exercise[]) => {
    setExercises(updated);
    localStorage.setItem(`lift-workout-${activeTab}`, JSON.stringify(updated));
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (timerActive && timerRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimerRemaining(prev => prev - 1);
      }, 1000);
    } else if (timerRemaining === 0 && timerActive) {
      setTimerActive(false);
      playSoundTone('chime');
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerActive, timerRemaining]);

  const startTimer = (duration: number, exerciseName: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimerDuration(duration);
    setTimerRemaining(duration);
    setTimerExerciseName(exerciseName);
    setTimerActive(true);
  };

  const adjustTimer = (seconds: number) => {
    setTimerRemaining(prev => Math.max(0, prev + seconds));
    if (timerDuration < timerRemaining + seconds) {
      setTimerDuration(timerRemaining + seconds);
    }
  };

  const skipTimer = () => {
    setTimerActive(false);
    setTimerRemaining(0);
  };

  // --- EVENT HANDLERS ---
  // Cycle Rep Counting Bubble
  // null (uncompleted) -> Max Target Reps -> Target-1 -> ... -> 0 -> null
  const handleBubbleClick = (exerciseId: string, setIndex: number, maxReps: number) => {
    playSoundTone('tick');
    const updated = exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newCompletedSets = [...ex.completedSets];
        const currentVal = newCompletedSets[setIndex];

        if (currentVal === null) {
          // Uncompleted to completed (max reps)
          newCompletedSets[setIndex] = maxReps;
          // Auto start customizable rest timer!
          startTimer(ex.restDuration, ex.name);
        } else if (currentVal === 0) {
          // Reset to uncompleted
          newCompletedSets[setIndex] = null;
        } else {
          // Decrement reps
          newCompletedSets[setIndex] = currentVal - 1;
          // Auto trigger/reset rest timer on any set tap
          startTimer(ex.restDuration, ex.name);
        }
        return { ...ex, completedSets: newCompletedSets };
      }
      return ex;
    });

    saveExercises(updated);
  };

  // Save customized exercise details
  const saveEditedExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExercise) return;

    const updated = exercises.map(ex => {
      if (ex.id === editingExercise.id) {
        // Adjust completedSets array length if sets count changed
        let newSets = [...editingExercise.completedSets];
        if (editingExercise.sets > ex.sets) {
          const diff = editingExercise.sets - ex.sets;
          newSets = [...newSets, ...Array(diff).fill(null)];
        } else if (editingExercise.sets < ex.sets) {
          newSets = newSets.slice(0, editingExercise.sets);
        }

        return {
          ...editingExercise,
          completedSets: newSets
        };
      }
      return ex;
    });

    saveExercises(updated);
    setEditingExercise(null);
  };

  // Create a Custom Exercise on the Fly
  const handleCreateCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim()) return;

    const customId = `custom-${Date.now()}`;
    const newEx: Exercise = {
      id: customId,
      name: newExName,
      weight: newExWeight,
      weightUnit: 'kg',
      sets: newExSets,
      reps: newExReps,
      restDuration: newExRest,
      completedSets: Array(newExSets).fill(null)
    };

    saveExercises([...exercises, newEx]);
    setIsCustomModalOpen(false);

    // Reset Form
    setNewExName('');
    setNewExWeight(40);
    setNewExSets(5);
    setNewExReps(5);
    setNewExRest(90);
  };

  // Reset entire workout session (clear progress bubbles)
  const resetWorkout = () => {
    const updated = exercises.map(ex => ({
      ...ex,
      completedSets: Array(ex.sets).fill(null)
    }));
    saveExercises(updated);
    skipTimer();
    playSoundTone('success');
  };

  // Delete an exercise from the list
  const deleteExercise = (id: string) => {
    const updated = exercises.filter(ex => ex.id !== id);
    saveExercises(updated);
    setEditingExercise(null);
  };

  // --- STATS CALCULATIONS ---
  const totalVolume = exercises.reduce((acc, ex) => {
    const completedReps = ex.completedSets.reduce((sum, reps) => sum + (reps || 0), 0);
    return acc + (completedReps * ex.weight);
  }, 0);

  const setsCompleted = exercises.reduce((acc, ex) => {
    const completed = ex.completedSets.filter(reps => reps !== null).length;
    return acc + completed;
  }, 0);

  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets, 0);

  // Timer Circle Progress calculations
  const strokeDashOffset = timerDuration > 0
    ? (364.42 - (timerRemaining / timerDuration) * 364.42)
    : 0;

  return (
    <div className="app-container">
      {/* HEADER SECTION */}
      <header className="app-header glass">
        <div className="logo-section">
          <div className="barbell-logo">💪</div>
          <div className="logo-text">
            <h1>LiftApp</h1>
            <p>Smart Lifting Timer & Counters</p>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={toggleTheme} className="btn-icon-only" aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={resetWorkout} className="btn btn-secondary">
            🔄 Reset
          </button>
        </div>
      </header>

      {/* WORKOUT TABS / STATS BAR */}
      <section className="workout-selector glass">
        <div className="preset-tabs">
          {Object.keys(PRESETS).map(key => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`tab-btn ${activeTab === key ? 'active' : ''}`}
            >
              {key}
            </button>
          ))}
          <button
            onClick={() => setActiveTab('Custom Routine')}
            className={`tab-btn ${activeTab === 'Custom Routine' ? 'active' : ''}`}
          >
            Custom
          </button>
        </div>

        <div className="workout-stats">
          <div className="stat-item">
            <span className="stat-label">Volume</span>
            <span className="stat-val">{totalVolume} kg</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Progress</span>
            <span className="stat-val">{setsCompleted} / {totalSets} Sets</span>
          </div>
        </div>
      </section>

      {/* EXERCISES VIEW */}
      {exercises.length === 0 ? (
        <div className="empty-workout glass">
          <span style={{ fontSize: '48px' }}>🏋️‍♂️</span>
          <h2 className="empty-title">No Exercises Added</h2>
          <p className="empty-desc">Your custom workout routine is empty. Tap the button below to add your first exercise!</p>
          <button onClick={() => setIsCustomModalOpen(true)} className="btn btn-primary">
            ➕ Add First Exercise
          </button>
        </div>
      ) : (
        <section className="exercises-grid">
          {exercises.map((ex) => {
            const isCompleted = ex.completedSets.every(s => s !== null);
            return (
              <div key={ex.id} className={`exercise-card glass ${isCompleted ? 'completed' : ''}`}>
                <div className="card-header">
                  <div className="exercise-info">
                    <h3 className="exercise-name">{ex.name}</h3>
                    <div className="exercise-target">
                      <span className="target-badge">{ex.weight} {ex.weightUnit}</span>
                      <span>Target: {ex.sets} sets of {ex.reps} reps</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingExercise(ex)}
                    className="card-options-btn"
                    title="Customize Exercise"
                  >
                    ✏️ Edit
                  </button>
                </div>

                <div className="sets-tracker">
                  <div className="sets-header">
                    <span>Set & Rep Progression</span>
                    <span>Tap bubble to log set</span>
                  </div>
                  <div className="sets-row">
                    {ex.completedSets.map((repsDone, idx) => {
                      let bubbleClass = 'empty';
                      let label = `${idx + 1}`;

                      if (repsDone !== null) {
                        label = `${repsDone}`;
                        if (repsDone === ex.reps) {
                          bubbleClass = 'completed';
                        } else if (repsDone > 0) {
                          bubbleClass = 'partial';
                        } else {
                          bubbleClass = 'failed';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleBubbleClick(ex.id, idx, ex.reps)}
                          className={`rep-bubble ${bubbleClass}`}
                        >
                          {repsDone === null ? '' : label}
                          <span className="rep-bubble-label">S{idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="card-footer">
                  <div className="footer-item">
                    ⏱️ Rest: {ex.restDuration}s
                  </div>
                  <div className="footer-item">
                    Target Reps: {ex.reps}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* QUICK ADD EXERCISE ACTION */}
      {exercises.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <button onClick={() => setIsCustomModalOpen(true)} className="btn btn-secondary" style={{ paddingInline: '32px' }}>
            ➕ Add Exercise
          </button>
        </div>
      )}

      {/* REST TIMER FLOATING PANEL */}
      {timerRemaining > 0 && (
        <div className="rest-timer-panel glass glow-indigo">
          <div className="timer-info">
            <div className="timer-circle-wrap">
              <svg className="timer-svg" width="130" height="130">
                <circle className="timer-circle-bg" cx="65" cy="65" r="58" />
                <circle
                  className="timer-circle-fg"
                  cx="65"
                  cy="65"
                  r="58"
                  strokeDasharray="364.42"
                  strokeDashoffset={strokeDashOffset}
                />
              </svg>
              <div className="timer-count">
                {Math.floor(timerRemaining / 60)}:{(timerRemaining % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <div className="timer-text">
              <span className="timer-title">Rest Timer</span>
              <span className="timer-subtitle">After {timerExerciseName}</span>
            </div>
          </div>

          <div className="timer-actions">
            <button onClick={() => adjustTimer(30)} className="btn-icon-only" title="+30 Seconds">
              +30s
            </button>
            <button onClick={() => adjustTimer(-30)} className="btn-icon-only" title="-30 Seconds">
              -30s
            </button>
            <button onClick={skipTimer} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODAL DIALOG */}
      {editingExercise && (
        <div className="modal-overlay">
          <form onSubmit={saveEditedExercise} className="modal-content glass">
            <div className="modal-header">
              <h3 className="modal-title">Customize Exercise</h3>
              <button type="button" onClick={() => setEditingExercise(null)} className="card-options-btn">✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Exercise Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={editingExercise.name}
                onChange={e => setEditingExercise({ ...editingExercise, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Weight</label>
              <div className="weight-adjuster">
                <input
                  type="number"
                  required
                  step="0.5"
                  className="form-input"
                  style={{ flex: 1 }}
                  value={editingExercise.weight}
                  onChange={e => setEditingExercise({ ...editingExercise, weight: parseFloat(e.target.value) || 0 })}
                />
                <button
                  type="button"
                  onClick={() => setEditingExercise({ ...editingExercise, weight: Math.max(0, editingExercise.weight - 2.5) })}
                  className="adjust-btn"
                >
                  -2.5
                </button>
                <button
                  type="button"
                  onClick={() => setEditingExercise({ ...editingExercise, weight: editingExercise.weight + 2.5 })}
                  className="adjust-btn"
                >
                  +2.5
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Sets</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  className="form-input"
                  value={editingExercise.sets}
                  onChange={e => setEditingExercise({ ...editingExercise, sets: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Reps per Set</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="20"
                  className="form-input"
                  value={editingExercise.reps}
                  onChange={e => setEditingExercise({ ...editingExercise, reps: parseInt(e.target.value) || 5 })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Rest Duration (Seconds)</label>
              <div className="weight-adjuster">
                <input
                  type="number"
                  required
                  min="10"
                  step="10"
                  className="form-input"
                  style={{ flex: 1 }}
                  value={editingExercise.restDuration}
                  onChange={e => setEditingExercise({ ...editingExercise, restDuration: parseInt(e.target.value) || 90 })}
                />
                <button
                  type="button"
                  onClick={() => setEditingExercise({ ...editingExercise, restDuration: Math.max(10, editingExercise.restDuration - 30) })}
                  className="adjust-btn"
                >
                  -30s
                </button>
                <button
                  type="button"
                  onClick={() => setEditingExercise({ ...editingExercise, restDuration: editingExercise.restDuration + 30 })}
                  className="adjust-btn"
                >
                  +30s
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => deleteExercise(editingExercise.id)}
                className="btn btn-secondary"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', border: 'none', marginRight: 'auto' }}
              >
                🗑️ Delete
              </button>
              <button type="button" onClick={() => setEditingExercise(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE CUSTOM EXERCISE MODAL */}
      {isCustomModalOpen && (
        <div className="modal-overlay">
          <form onSubmit={handleCreateCustomExercise} className="modal-content glass">
            <div className="modal-header">
              <h3 className="modal-title">Add Exercise</h3>
              <button type="button" onClick={() => setIsCustomModalOpen(false)} className="card-options-btn">✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Exercise Name</label>
              <input
                type="text"
                placeholder="e.g. Incline Bench Press"
                required
                className="form-input"
                value={newExName}
                onChange={e => setNewExName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Starting Weight (kg)</label>
              <input
                type="number"
                required
                step="0.5"
                className="form-input"
                value={newExWeight}
                onChange={e => setNewExWeight(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Sets</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  className="form-input"
                  value={newExSets}
                  onChange={e => setNewExSets(parseInt(e.target.value) || 5)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Target Reps</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="20"
                  className="form-input"
                  value={newExReps}
                  onChange={e => setNewExReps(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Rest Duration (Seconds)</label>
              <input
                type="number"
                required
                min="10"
                step="5"
                className="form-input"
                value={newExRest}
                onChange={e => setNewExRest(parseInt(e.target.value) || 90)}
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setIsCustomModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add to Workout
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
