interface Props {
  onDismiss: () => void;
  onOptOut: () => void;
}

const ConsentBanner: React.FC<Props> = ({ onDismiss, onOptOut }) => {
  return (
    <div
      data-testid="consent-banner"
      role="region"
      aria-label="Privacy notice"
      className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 p-4"
    >
      <p className="text-sm text-gray-700 mb-2">
        This app uses privacy-friendly analytics and crash reporting (on by
        default) to improve the experience. No personal data is collected.
      </p>
      <p className="text-sm mb-3">
        <a href="/privacy" className="underline text-gray-800 hover:text-black">
          Privacy policy
        </a>
      </p>
      <div className="flex space-x-2">
        <button
          data-testid="consent-opt-out"
          onClick={onOptOut}
          className="px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
        >
          Opt out
        </button>
        <button
          data-testid="consent-dismiss"
          onClick={onDismiss}
          className="px-3 py-1.5 rounded bg-[#a1b69a] hover:bg-[#8fa88a] text-black text-sm font-medium"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default ConsentBanner;
