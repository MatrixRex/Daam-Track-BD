import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(() => {
        // Check localStorage first
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        // Otherwise check system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            const savedTheme = localStorage.getItem('theme');
            if (!savedTheme) {
                setIsDark(e.matches);
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return (
        <button
            onClick={() => setIsDark(!isDark)}
            className="relative p-2.5 rounded-xl bg-primary-200 hover:bg-primary-400/40 transition-all duration-300 group overflow-hidden border border-primary-200 motion-preset-fade motion-duration-300"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {/* Background glow effect */}
            <div className={`absolute inset-0 transition-opacity duration-500 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary-600/30 to-primary-400/30 blur-xl" />
            </div>
            <div className={`absolute inset-0 transition-opacity duration-500 ${!isDark ? 'opacity-100' : 'opacity-0'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary-400/30 to-primary-500/30 blur-xl" />
            </div>

            {/* Icons container */}
            <div className="relative w-5 h-5">
                {/* Sun icon */}
                <Sun
                    size={20}
                    className={`absolute inset-0 text-primary-500 transition-all duration-300 ${isDark
                        ? 'opacity-0 rotate-90 scale-0'
                        : 'opacity-100 rotate-0 scale-100'
                        }`}
                />
                {/* Moon icon */}
                <Moon
                    size={20}
                    className={`absolute inset-0 text-primary-400 transition-all duration-300 ${isDark
                        ? 'opacity-100 rotate-0 scale-100'
                        : 'opacity-0 -rotate-90 scale-0'
                        }`}
                />
            </div>
        </button>
    );
};

export default ThemeToggle;
