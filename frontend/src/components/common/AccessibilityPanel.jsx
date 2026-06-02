import React, { useContext, useEffect, useRef } from 'react';
import { AccessibilityContext } from '../../context/AccessibilityContext';
import { LanguageContext } from '../../context/LanguageContext';
import {
  X,
  RotateCcw,
  Plus,
  Minus,
  Accessibility,
  Eye,
  Type,
  AlignLeft,
  MoveHorizontal,
  Link as LinkIcon,
  Check
} from 'lucide-react';

const AccessibilityPanel = () => {
  const {
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
    resetAll
  } = useContext(AccessibilityContext);

  const { t } = useContext(LanguageContext);
  const panelRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPanelOpen) {
        setIsPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, setIsPanelOpen]);

  // Trap focus or auto-focus close button when open
  useEffect(() => {
    if (isPanelOpen && panelRef.current) {
      // Find focusable elements
      const focusable = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]');
      if (focusable.length) {
        focusable[0].focus();
      }
    }
  }, [isPanelOpen]);

  if (!isPanelOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-panel-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setIsPanelOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-out Drawer */}
      <div 
        ref={panelRef}
        className="absolute top-0 right-0 h-full w-80 max-w-full bg-slate-900 border-l border-slate-800 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-[slideIn_0.2s_ease-out] text-slate-100"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <Accessibility className="h-5 w-5" />
              </div>
              <h2 id="accessibility-panel-title" className="text-base font-bold tracking-tight">
                {t('accessibility.title')}
              </h2>
            </div>
            
            <button
              onClick={() => setIsPanelOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
              aria-label={t('accessibility.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Action Items List */}
          <div className="space-y-6">
            {/* 1. Text Sizing */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5" /> {t('accessibility.textSize')}
                </span>
                <span className="text-xs font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded">
                  {Math.round(textSizeScale * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={decreaseText}
                  className="flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800 transition-all active:scale-95"
                  aria-label={t('accessibility.decreaseText')}
                  disabled={textSizeScale <= 0.7}
                >
                  <Minus className="h-3 w-3" /> {t('accessibility.decreaseText').split(' ')[0]}
                </button>
                <button
                  onClick={resetText}
                  className="flex items-center justify-center py-2 text-xs font-medium rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800 transition-all active:scale-95"
                  aria-label={t('accessibility.resetText')}
                >
                  {t('accessibility.resetText').split(' ')[0]}
                </button>
                <button
                  onClick={increaseText}
                  className="flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800 transition-all active:scale-95"
                  aria-label={t('accessibility.increaseText')}
                  disabled={textSizeScale >= 1.3}
                >
                  <Plus className="h-3 w-3" /> {t('accessibility.increaseText').split(' ')[0]}
                </button>
              </div>
            </div>

            {/* 2. Contrast Modes */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> {t('accessibility.contrast')}
              </span>
              <div className="flex flex-col gap-2">
                {[
                  { mode: 'normal', label: t('accessibility.contrastNormal') },
                  { mode: 'high', label: t('accessibility.contrastHigh') },
                  { mode: 'dark', label: t('accessibility.contrastDark') }
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => setContrastMode(item.mode)}
                    className={`flex items-center justify-between px-4 py-2.5 text-xs font-medium rounded-lg border transition-all active:scale-[0.98] ${
                      contrastMode === item.mode
                        ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <span>{item.label}</span>
                    {contrastMode === item.mode && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Text Adjustments (Line Height & Text Spacing) */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <AlignLeft className="h-3.5 w-3.5" /> {t('accessibility.adjustments')}
              </span>
              
              {/* Line Height Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950/20">
                <span className="text-xs text-slate-300">{t('accessibility.lineHeight')}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setLineHeightScale('normal')}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded ${
                      lineHeightScale === 'normal'
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('accessibility.lineHeightNormal')}
                  </button>
                  <button
                    onClick={() => setLineHeightScale('extra')}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded ${
                      lineHeightScale === 'extra'
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('accessibility.lineHeightExtra')}
                  </button>
                </div>
              </div>

              {/* Text Spacing Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950/20">
                <span className="text-xs text-slate-300">{t('accessibility.textSpacing')}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setTextSpacingScale('normal')}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded ${
                      textSpacingScale === 'normal'
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('accessibility.textSpacingNormal')}
                  </button>
                  <button
                    onClick={() => setTextSpacingScale('extra')}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded ${
                      textSpacingScale === 'extra'
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('accessibility.textSpacingExtra')}
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Navigation Support / Visual Aids */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" /> {t('accessibility.visualAids')}
              </span>
              <button
                onClick={() => setHighlightLinks(!highlightLinks)}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-xs font-medium rounded-lg border transition-all active:scale-[0.98] ${
                  highlightLinks
                    ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <span>{t('accessibility.highlightLinks')}</span>
                {highlightLinks && <Check className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Global Reset */}
        <div className="pt-4 border-t border-slate-850 mt-6">
          <button
            onClick={resetAll}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" /> {t('accessibility.reset')}
          </button>
          <span className="block text-[10px] text-slate-500 text-center mt-2">
            {t('accessibility.status')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityPanel;
