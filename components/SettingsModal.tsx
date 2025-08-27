
import React, { FC } from 'react';
import { useSettings } from '../context/SettingsContext';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    availableModels,
    refreshModels,
    isModelLoading,
    connectionError,
  } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-primary/70 backdrop-blur-md flex items-center justify-center z-50 transition-opacity duration-300" onClick={onClose}>
      <div 
        className="bg-secondary/80 border border-accent/30 rounded-lg shadow-2xl shadow-accent/10 p-8 w-full max-w-2xl text-gray-200 transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold mb-6 text-cyan drop-shadow-[0_0_8px_theme(colors.cyan)]">Admin Settings</h2>
        
        {/* Ollama URL */}
        <div className="mb-6">
          <label htmlFor="ollamaUrl" className="block text-sm font-medium mb-2 text-gray-400">Ollama Server URL</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="ollamaUrl"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              className="w-full px-4 py-2 bg-primary/70 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan focus:border-cyan transition-colors"
            />
            <button
              onClick={() => refreshModels()}
              disabled={isModelLoading}
              className="px-4 py-2 bg-accent/80 hover:bg-cyan text-white rounded-md transition-colors flex items-center justify-center disabled:bg-gray-500 disabled:text-gray-300"
            >
              {isModelLoading ? <SpinnerIcon /> : "Test & Refresh"}
            </button>
          </div>
          {connectionError && <p className="text-red-400 text-sm mt-2">{connectionError}</p>}
        </div>

        {/* Model Selection */}
        <div className="mb-6">
          <label htmlFor="modelSelect" className="block text-sm font-medium mb-2 text-gray-400">AI Model</label>
          <select
            id="modelSelect"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isModelLoading || availableModels.length === 0}
            className="w-full px-3 py-2 bg-primary/70 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan focus:border-cyan transition-colors disabled:opacity-50"
          >
            {availableModels.length > 0 ? (
              availableModels.map(model => (
                <option key={model.name} value={model.name}>{model.name}</option>
              ))
            ) : (
              <option>{isModelLoading ? "Loading models..." : "No models found"}</option>
            )}
          </select>
        </div>
        
        {/* Trigger Word */}
        <div className="mb-6">
          <label htmlFor="triggerWord" className="block text-sm font-medium mb-2 text-gray-400">Trigger Word</label>
          <input
            type="text"
            id="triggerWord"
            value={triggerWord}
            onChange={(e) => setTriggerWord(e.target.value.toLowerCase())}
            className="w-full px-4 py-2 bg-primary/70 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan focus:border-cyan transition-colors"
            placeholder="e.g., hey assistant"
          />
           <p className="text-xs text-gray-500 mt-1">The phrase that activates listening. Keep it simple and lowercase.</p>
        </div>

        {/* System Prompt */}
        <div className="mb-6">
          <label htmlFor="systemPrompt" className="block text-sm font-medium mb-2 text-gray-400">System Prompt</label>
          <textarea
            id="systemPrompt"
            rows={3}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full px-3 py-2 bg-primary/70 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan focus:border-cyan transition-colors"
          />
        </div>

        {/* Temperature */}
        <div className="mb-6">
          <label htmlFor="temperature" className="block text-sm font-medium mb-2 text-gray-400">Temperature: {temperature.toFixed(2)}</label>
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
        </div>

        <div className="flex justify-end">
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