import { forwardRef } from "react";

interface SettingsProps {
  showSettings: boolean;
  flipSpeed: number;
  setFlipSpeed: (speed: number) => void;
  isPreloaded: boolean;
  isPreloading: boolean;
  handlePreloadCards: () => void;
}

export const Settings = forwardRef<HTMLDivElement, SettingsProps>(({
  showSettings,
  flipSpeed,
  setFlipSpeed,
  isPreloaded,
  isPreloading,
  handlePreloadCards
}, ref) => {
  if (!showSettings) return null;

  return (
    <div ref={ref} className="fixed top-20 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-64">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Settings</h3>

      {/* Flip Speed Slider */}
      <div className="space-y-2 mb-4" onClick={(e) => e.stopPropagation()}>
        <label className="block text-sm font-medium text-gray-700">
          Card Flip Speed: {flipSpeed === 0 ? 'Instant' : `${flipSpeed.toFixed(1)}s`}
        </label>
        <input
          type="range"
          min="0"
          max="2.0"
          step="0.1"
          value={flipSpeed}
          onChange={(e) => setFlipSpeed(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Preload Button */}
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handlePreloadCards}
          disabled={isPreloaded || isPreloading}
          className={`w-full px-4 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm font-medium ${
            isPreloaded
              ? 'bg-green-100 text-green-800 cursor-not-allowed'
              : isPreloading
              ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <span>{isPreloaded ? '✅' : isPreloading ? '⏳' : '📥'}</span>
          <span>
            {isPreloaded
              ? 'Cards Downloaded'
              : isPreloading
              ? 'Downloading...'
              : 'Download for Offline'}
          </span>
        </button>

        {isPreloaded && (
          <p className="text-xs text-gray-600 text-center">
            All cards are cached for offline use
          </p>
        )}
      </div>
    </div>
  );
});