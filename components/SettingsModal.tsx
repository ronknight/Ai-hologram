
import React, { FC, ReactNode, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { BACKDROP_ORDER, BACKDROP_PRESETS } from './backdropPresets';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Groups related settings so the panel reads as three short lists rather than one long one. */
const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <section className="mb-7 last:mb-0">
    <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-accent/70 mb-3 pb-1.5 border-b border-accent/15">
      {title}
    </h3>
    <div className="space-y-4">{children}</div>
  </section>
);

const Field: FC<{ label: string; htmlFor?: string; help?: string; children: ReactNode }> = ({
  label,
  htmlFor,
  help,
  children,
}) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium mb-2 text-gray-400">{label}</label>
    {children}
    {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
  </div>
);

const inputStyles =
  'w-full min-w-0 px-4 py-2 text-base bg-primary/70 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan focus:border-cyan transition-colors';

const SettingsModal: FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    ollamaUrl,
    setOllamaUrl,
    selectedModel,
    setSelectedModel,
    systemPrompt,
    setSystemPrompt,
    temperature,
    setTemperature,
    triggerWord,
    setTriggerWord,
    backdropTheme,
    setBackdropTheme,
    availableModels,
    refreshModels,
    isModelLoading,
    connectionError,
  } = useSettings();

  const panelRef = useRef<HTMLDivElement>(null);

  // Esc closes the dialog and focus moves into it while open, so keyboard
  // users are not left tabbing through the page behind the overlay.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-primary/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        className="bg-secondary/80 border border-accent/30 rounded-lg shadow-2xl shadow-accent/10 p-4 sm:p-8 w-full max-w-2xl max-h-[90dvh] overflow-y-auto text-gray-200 transform transition-all duration-300 scale-100 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2
            id="settings-title"
            className="text-2xl sm:text-3xl font-bold text-cyan drop-shadow-[0_0_8px_theme(colors.cyan)]"
          >
            Admin Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="shrink-0 -mr-1 -mt-1 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-600/40 transition-colors"
          >
            ✕
          </button>
        </div>

        <Section title="Connection">
          <Field label="Ollama Server URL" htmlFor="ollamaUrl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                id="ollamaUrl"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className={inputStyles}
              />
              <button
                onClick={() => refreshModels()}
                disabled={isModelLoading}
                className="shrink-0 whitespace-nowrap px-4 py-2 bg-accent/80 hover:bg-cyan text-white rounded-md transition-colors flex items-center justify-center disabled:bg-gray-500 disabled:text-gray-300"
              >
                {isModelLoading ? <SpinnerIcon /> : 'Test & Refresh'}
              </button>
            </div>
            {connectionError && <p className="text-red-400 text-sm mt-2">{connectionError}</p>}
          </Field>

          <Field label="AI Model" htmlFor="modelSelect">
            <select
              id="modelSelect"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isModelLoading || availableModels.length === 0}
              className={`${inputStyles} disabled:opacity-50`}
            >
              {availableModels.length > 0 ? (
                availableModels.map((model) => (
                  <option key={model.name} value={model.name}>{model.name}</option>
                ))
              ) : (
                <option>{isModelLoading ? 'Loading models...' : 'No models found'}</option>
              )}
            </select>
          </Field>
        </Section>

        <Section title="Assistant">
          <Field
            label="Trigger Word"
            htmlFor="triggerWord"
            help="The phrase that activates listening. Keep it simple and lowercase."
          >
            <input
              type="text"
              id="triggerWord"
              value={triggerWord}
              onChange={(e) => setTriggerWord(e.target.value.toLowerCase())}
              className={inputStyles}
              placeholder="e.g., hey assistant"
            />
          </Field>

          <Field label="System Prompt" htmlFor="systemPrompt">
            <textarea
              id="systemPrompt"
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className={inputStyles}
            />
          </Field>

          <Field label={`Temperature: ${temperature.toFixed(2)}`} htmlFor="temperature">
            <input
              type="range"
              id="temperature"
              min="0"
              max="2"
              step="0.01"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-primary/70 rounded-lg appearance-none cursor-pointer accent-cyan"
            />
          </Field>
        </Section>

        <Section title="Appearance">
          <Field label="Background">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BACKDROP_ORDER.map((theme) => {
                const preset = BACKDROP_PRESETS[theme];
                const selected = backdropTheme === theme;
                return (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setBackdropTheme(theme)}
                    aria-pressed={selected}
                    className={`flex items-center gap-3 p-2 rounded-md border text-left transition-colors ${
                      selected
                        ? 'border-cyan bg-cyan/10'
                        : 'border-gray-600 hover:border-accent/60 hover:bg-primary/40'
                    }`}
                  >
                    {/* Swatch built from the preset's own colours, so it stays
                        honest if a preset is retuned. */}
                    <span
                      className="w-9 h-9 shrink-0 rounded-md border border-black/40"
                      style={{
                        background: `linear-gradient(160deg, ${preset.swatchFrom}, ${preset.swatchTo})`,
                        boxShadow: `inset 0 0 10px ${preset.glow}66`,
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{preset.label}</span>
                      <span className="block text-xs text-gray-400 truncate">{preset.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
        </Section>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600/80 hover:bg-gray-500/80 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
