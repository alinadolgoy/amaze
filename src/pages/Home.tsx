import { useNavigate } from 'react-router-dom';

interface HomeProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export default function Home({ theme, toggleTheme }: HomeProps) {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 md:py-16 animate-[fadeIn_0.4s_ease-out]">
      {/* Clean Header with Top-Right Theme Toggler */}
      <header className="flex justify-between items-center mb-8 border-b border-[var(--border-color)] pb-4">
        <div className="flex flex-col gap-1">
          <span className="home-logo text-3xl md:text-4xl font-extrabold tracking-tight">amaze.</span>
          <span className="home-tagline text-xs text-[var(--text-muted)] font-medium">Your personal utility companion</span>
        </div>
        <button 
          onClick={toggleTheme} 
          className="btn-icon-only text-lg cursor-pointer" 
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Centered Launcher & Placeholders Dashboard */}
      <div className="flex flex-col gap-6 w-full">
        {/* Primary Action Button */}
        <button 
          className="launch-btn-card group cursor-pointer w-full" 
          onClick={() => navigate('/lift')}
        >
          <div className="launch-btn-info">
            <h3 className="launch-btn-title">
              🏋️‍♂️ Launch Lift Tracker
            </h3>
            <p className="launch-btn-desc">
              Interactive StrongLifts counter & rest timers
            </p>
          </div>
          <div className="launch-arrow group-hover:translate-x-1 transition-transform duration-300">➔</div>
        </button>

        {/* Placeholder Apps Grid */}
        <div className="placeholder-grid">
          <div className="placeholder-card glass hover:border-[var(--color-accent)] hover:opacity-100 transition-all duration-300">
            <span className="placeholder-icon">💧</span>
            <h4 className="placeholder-title">Hydration</h4>
            <span className="placeholder-badge">Coming soon</span>
          </div>

          <button 
            onClick={() => navigate('/planner')}
            className="placeholder-card glass hover:border-[var(--color-accent)] hover:opacity-100 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer w-full text-center flex flex-col items-center justify-center border-none"
          >
            <span className="placeholder-icon">📓</span>
            <h4 className="placeholder-title">Focus Planner</h4>
            <span className="placeholder-badge text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 font-bold uppercase tracking-wider">Live</span>
          </button>


          <div className="placeholder-card glass hover:border-[var(--color-accent)] hover:opacity-100 transition-all duration-300">
            <span className="placeholder-icon">🍎</span>
            <h4 className="placeholder-title">Calorie Hub</h4>
            <span className="placeholder-badge">Coming soon</span>
          </div>

          <button 
            onClick={() => navigate('/pomodoro')}
            className="placeholder-card glass hover:border-[var(--color-accent)] hover:opacity-100 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer w-full text-center flex flex-col items-center justify-center border-none"
          >
            <span className="placeholder-icon">⏱️</span>
            <h4 className="placeholder-title">Pomodoro</h4>
            <span className="placeholder-badge text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 font-bold uppercase tracking-wider">Live</span>
          </button>
        </div>

      </div>
    </div>
  );
}
