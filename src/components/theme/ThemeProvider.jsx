import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  brandColor: null,
  setBrandColor: () => {},
  brandIntensity: 'suave',
  setBrandIntensity: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [brandColor, setBrandColor] = useState(null);
  const [brandIntensity, setBrandIntensity] = useState('suave');

  // Load from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme');
    const savedBrandColor = localStorage.getItem('app-brand-color');
    const savedBrandIntensity = localStorage.getItem('app-brand-intensity');

    if (savedTheme) setTheme(savedTheme);
    if (savedBrandColor) setBrandColor(savedBrandColor);
    if (savedBrandIntensity) setBrandIntensity(savedBrandIntensity);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'brand');
    
    // Add current theme
    root.classList.add(theme);

    // Apply brand color if theme is brand and color exists
    if (theme === 'brand' && brandColor) {
      applyBrandColor(brandColor, brandIntensity);
    } else {
      // Remove brand color variables
      root.style.removeProperty('--brand-primary');
      root.style.removeProperty('--brand-primary-foreground');
      root.style.removeProperty('--brand-primary-hover');
      root.style.removeProperty('--brand-accent');
      root.style.removeProperty('--brand-accent-foreground');
    }

    // Save to localStorage
    localStorage.setItem('app-theme', theme);
  }, [theme, brandColor, brandIntensity]);

  const applyBrandColor = (color, intensity) => {
    const root = document.documentElement;
    const isDark = theme === 'brand' && root.classList.contains('dark-brand');
    
    // Parse the color
    const hsl = hexToHSL(color);
    if (!hsl) return;

    let { h, s, l } = hsl;

    // Adjust saturation based on intensity
    const intensityMap = {
      'muy-suave': 0.4,
      'suave': 0.55,
      'moderado': 0.7
    };
    const saturationMultiplier = intensityMap[intensity] || 0.55;
    s = Math.min(s * saturationMultiplier, 60);

    // Adjust for light/dark mode
    if (isDark) {
      l = Math.max(45, Math.min(l, 60)); // Darker, more saturated for dark mode
    } else {
      l = Math.max(40, Math.min(l, 55)); // Lighter, less saturated for light mode
    }

    // Apply CSS variables
    root.style.setProperty('--brand-primary', `${h} ${s}% ${l}%`);
    root.style.setProperty('--brand-primary-foreground', '0 0% 100%');
    root.style.setProperty('--brand-primary-hover', `${h} ${s}% ${Math.max(l - 5, 35)}%`);
    
    // Accent (lighter version for backgrounds)
    root.style.setProperty('--brand-accent', `${h} ${Math.min(s * 0.6, 30)}% ${isDark ? 20 : 95}%`);
    root.style.setProperty('--brand-accent-foreground', `${h} ${s}% ${isDark ? 60 : 30}%`);

    // Save to localStorage
    localStorage.setItem('app-brand-color', color);
    localStorage.setItem('app-brand-intensity', intensity);
  };

  const hexToHSL = (hex) => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const value = {
    theme,
    setTheme: (newTheme) => {
      setTheme(newTheme);
      localStorage.setItem('app-theme', newTheme);
    },
    brandColor,
    setBrandColor: (color) => {
      setBrandColor(color);
      if (color) {
        applyBrandColor(color, brandIntensity);
      }
    },
    brandIntensity,
    setBrandIntensity: (intensity) => {
      setBrandIntensity(intensity);
      if (brandColor) {
        applyBrandColor(brandColor, intensity);
      }
    },
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}