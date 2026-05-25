import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Palette } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 p-2 bg-bg-card border border-border-dark rounded-xl shadow-sm">
      <Palette size={16} className="text-text-secondary hidden sm:block ml-2" />
      {(['dark', 'sky', 'white'] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={cn(
            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
            theme === t 
              ? "bg-accent/10 text-accent border border-accent/20" 
              : "text-text-secondary hover:text-text-primary hover:bg-black/5"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
