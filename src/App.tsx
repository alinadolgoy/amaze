import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import LiftApp from './pages/LiftApp';
import Pomodoro from './pages/Pomodoro';
import Planner from './pages/Planner';
import './App.css';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Theme Persistence
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/lift" element={<LiftApp theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/pomodoro" element={<Pomodoro theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/planner" element={<Planner theme={theme} toggleTheme={toggleTheme} />} />
      </Routes>
    </BrowserRouter>
  );
}


