import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeId = 'ocean' | 'forest' | 'sunset' | 'starry' | 'sakura' | 'amber' | 'custom';
export type BgMode = 'dark' | 'light';

export const THEME_LABELS: Record<ThemeId, string> = {
  ocean: '极夜蓝',
  forest: '翡翠绿',
  sunset: '日落橙',
  starry: '星空紫',
  sakura: '樱花粉',
  amber: '琥珀金',
  custom: '自定义',
};

export const THEME_GRADIENTS: Record<ThemeId, string> = {
  ocean: 'from-cyan-500 to-purple-600',
  forest: 'from-emerald-500 to-teal-600',
  sunset: 'from-orange-500 to-rose-600',
  starry: 'from-indigo-500 to-violet-600',
  sakura: 'from-pink-500 to-fuchsia-600',
  amber: 'from-amber-500 to-yellow-500',
  custom: 'from-grad-from to-grad-to',
};

export interface CustomColors {
  a1: string; // primary accent RGB
  a2: string; // secondary accent RGB
  g1: string; // gradient from RGB
  g2: string; // gradient to RGB
}

const DEFAULT_CUSTOM: CustomColors = {
  a1: '34 211 238',
  a2: '167 139 250',
  g1: '6 182 212',
  g2: '147 51 234',
};

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
  bgMode: BgMode;
  setBgMode: (mode: BgMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'ocean',
  setTheme: () => {},
  customColors: DEFAULT_CUSTOM,
  setCustomColors: () => {},
  bgMode: 'dark',
  setBgMode: () => {},
});

function applyCustomColors(colors: CustomColors) {
  const root = document.documentElement;
  root.style.setProperty('--c-a1', colors.a1);
  root.style.setProperty('--c-a2', colors.a2);
  root.style.setProperty('--c-g1', colors.g1);
  root.style.setProperty('--c-g2', colors.g2);
  root.style.setProperty('--c-lk', colors.g1);
  root.style.setProperty('--c-rg', colors.g1);
  root.style.setProperty('--c-tg', colors.g1);
  root.style.setProperty('--c-ac', colors.g1);
}

function removeCustomColors() {
  const root = document.documentElement;
  root.style.removeProperty('--c-a1');
  root.style.removeProperty('--c-a2');
  root.style.removeProperty('--c-g1');
  root.style.removeProperty('--c-g2');
  root.style.removeProperty('--c-lk');
  root.style.removeProperty('--c-rg');
  root.style.removeProperty('--c-tg');
  root.style.removeProperty('--c-ac');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('ocean');
  const [customColors, setCustomColorsState] = useState<CustomColors>(DEFAULT_CUSTOM);
  const [bgMode, setBgModeState] = useState<BgMode>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('app_theme') as ThemeId | null;
    if (saved && saved in THEME_LABELS) {
      setThemeState(saved);
    }
    const savedCustom = localStorage.getItem('app_theme_custom');
    if (savedCustom) {
      try {
        setCustomColorsState(JSON.parse(savedCustom));
      } catch {}
    }
    const savedBgMode = localStorage.getItem('app_bg_mode') as BgMode | null;
    if (savedBgMode === 'light' || savedBgMode === 'dark') {
      setBgModeState(savedBgMode);
    }
  }, []);

  useEffect(() => {
    if (theme === 'custom') {
      document.documentElement.removeAttribute('data-theme');
      applyCustomColors(customColors);
    } else {
      document.documentElement.setAttribute('data-theme', theme);
      removeCustomColors();
    }
  }, [theme, customColors]);

  useEffect(() => {
    document.documentElement.setAttribute('data-bg-mode', bgMode);
  }, [bgMode]);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    localStorage.setItem('app_theme', t);
  }, []);

  const setCustomColors = useCallback((colors: CustomColors) => {
    setCustomColorsState(colors);
    localStorage.setItem('app_theme_custom', JSON.stringify(colors));
    if (theme === 'custom') {
      applyCustomColors(colors);
    }
  }, [theme]);

  const setBgMode = useCallback((mode: BgMode) => {
    setBgModeState(mode);
    localStorage.setItem('app_bg_mode', mode);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors, bgMode, setBgMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
