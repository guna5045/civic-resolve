import React, { createContext, useState, useEffect } from 'react';

export const AccessibilityContext = createContext();

export const AccessibilityProvider = ({ children }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Restore preferences from localStorage
  const [textSizeScale, setTextSizeScale] = useState(() => {
    return parseFloat(localStorage.getItem('acc_textSizeScale')) || 1.0;
  });
  const [contrastMode, setContrastMode] = useState(() => {
    return localStorage.getItem('acc_contrastMode') || 'normal'; // 'normal', 'high', 'dark'
  });
  const [lineHeightScale, setLineHeightScale] = useState(() => {
    return localStorage.getItem('acc_lineHeightScale') || 'normal'; // 'normal', 'extra'
  });
  const [textSpacingScale, setTextSpacingScale] = useState(() => {
    return localStorage.getItem('acc_textSpacingScale') || 'normal'; // 'normal', 'extra'
  });
  const [highlightLinks, setHighlightLinks] = useState(() => {
    return localStorage.getItem('acc_highlightLinks') === 'true';
  });

  // Apply settings to document root
  useEffect(() => {
    const root = document.documentElement;

    // 1. Text Size Scaling
    root.style.setProperty('--text-scale', textSizeScale.toString());
    localStorage.setItem('acc_textSizeScale', textSizeScale.toString());

    // 2. Contrast Modes
    root.classList.remove('high-contrast', 'dark-contrast');
    if (contrastMode === 'high') {
      root.classList.add('high-contrast');
    } else if (contrastMode === 'dark') {
      root.classList.add('dark-contrast');
    }
    localStorage.setItem('acc_contrastMode', contrastMode);

    // 3. Line Height
    if (lineHeightScale === 'extra') {
      root.style.setProperty('--line-height-factor', '1.85');
    } else {
      root.style.setProperty('--line-height-factor', '1.5');
    }
    localStorage.setItem('acc_lineHeightScale', lineHeightScale);

    // 4. Letter/Word Spacing
    if (textSpacingScale === 'extra') {
      root.style.setProperty('--letter-spacing', '0.08em');
    } else {
      root.style.setProperty('--letter-spacing', 'normal');
    }
    localStorage.setItem('acc_textSpacingScale', textSpacingScale);

    // 5. Highlight Links
    if (highlightLinks) {
      root.classList.add('highlight-links');
    } else {
      root.classList.remove('highlight-links');
    }
    localStorage.setItem('acc_highlightLinks', highlightLinks.toString());
  }, [textSizeScale, contrastMode, lineHeightScale, textSpacingScale, highlightLinks]);

  // Actions helper
  const increaseText = () => {
    setTextSizeScale((prev) => Math.min(prev + 0.15, 1.3));
  };

  const decreaseText = () => {
    setTextSizeScale((prev) => Math.max(prev - 0.15, 0.7));
  };

  const resetText = () => {
    setTextSizeScale(1.0);
  };

  const resetContrast = () => {
    setContrastMode('normal');
  };

  const resetAll = () => {
    setTextSizeScale(1.0);
    setContrastMode('normal');
    setLineHeightScale('normal');
    setTextSpacingScale('normal');
    setHighlightLinks(false);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        isPanelOpen,
        setIsPanelOpen,
        textSizeScale,
        contrastMode,
        lineHeightScale,
        textSpacingScale,
        highlightLinks,
        setContrastMode,
        setLineHeightScale,
        setTextSpacingScale,
        setHighlightLinks,
        increaseText,
        decreaseText,
        resetText,
        resetContrast,
        resetAll,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};
export default AccessibilityContext;
