import { forwardRef, useState, useEffect } from "react";

interface SettingsProps {
   showSettings: boolean;
   flipSpeed: string;
   setFlipSpeed: (speed: string) => void;
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
  const [analyticsConsent, setAnalyticsConsent] = useState(localStorage.getItem('analyticsConsent') !== 'false');
  const [crashReportingConsent, setCrashReportingConsent] = useState(localStorage.getItem('crashReportingConsent') !== 'false');

  useEffect(() => {
    const handleConsentChange = () => {
      setAnalyticsConsent(localStorage.getItem('analyticsConsent') !== 'false');
      setCrashReportingConsent(localStorage.getItem('crashReportingConsent') !== 'false');
    };

    window.addEventListener('consentChanged', handleConsentChange);
    return () => window.removeEventListener('consentChanged', handleConsentChange);
  }, []);

  if (!showSettings) return null;

  return (
    <div ref={ref} className="fixed top-20 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-64">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Settings</h3>

      {/* Flip Speed Slider */}
      <div className="space-y-2 mb-4" onClick={(e) => e.stopPropagation()}>
        <label className="block text-sm font-medium text-gray-700">
          Card Flip Speed: {parseFloat(flipSpeed) === 0 ? 'Instant' : `${parseFloat(flipSpeed).toFixed(1)}s`}
        </label>
        <input
          type="range"
          min="0"
          max="2.0"
          step="0.1"
          value={flipSpeed}
          onInput={(e) => setFlipSpeed(parseFloat(e.target.value).toFixed(1))}
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

      {/* Privacy Preferences */}
      <div className="space-y-2 mt-4" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-md font-semibold mb-2 text-gray-800">Privacy Preferences</h4>
        <div className="flex items-center space-x-2">
          <input
            id="analytics-checkbox"
            type="checkbox"
            checked={analyticsConsent}
            onChange={(e) => {
              const checked = e.target.checked;
              setAnalyticsConsent(checked);
              localStorage.setItem('analyticsConsent', checked.toString());
            }}
          />
          <label htmlFor="analytics-checkbox" className="text-sm font-medium text-gray-700">
            Enable Analytics Tracking
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            id="crash-checkbox"
            type="checkbox"
            checked={crashReportingConsent}
            onChange={(e) => {
              const checked = e.target.checked;
              setCrashReportingConsent(checked);
              localStorage.setItem('crashReportingConsent', checked.toString());
            }}
          />
          <label htmlFor="crash-checkbox" className="text-sm font-medium text-gray-700">
            Enable Crash Reporting
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Analytics and crash reporting are on by default. See our{' '}
          <a href="/privacy" className="underline">privacy policy</a>.
        </p>
      </div>

      <p className="text-xs text-gray-400 pt-3 text-center" data-testid="build-version">
        Build: {import.meta.env.VITE_BUILD_SHA || 'dev'}
      </p>
      <p className="text-xs text-gray-400 pb-1 text-center">
        <a
          href="https://github.com/StickyNeutrino/cards"
          className="underline hover:text-gray-600"
          rel="noopener noreferrer"
        >
          Source
        </a>
      </p>
    </div>
  );
});