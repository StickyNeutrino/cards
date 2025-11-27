interface PreloadProgressProps {
  current: number;
  total: number;
  isVisible: boolean;
}

export function PreloadProgress({ current, total, isVisible }: PreloadProgressProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 border border-gray-200" >
      <div className="flex items-center space-x-3">
        <div className="text-sm text-gray-600 font-medium">
          {'Downloading cards...'}
        </div>
        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300 ease-out"
            style={{ width: `${total === 0 ? 0 : (current / total) * 100}%` }}
          />
        </div>
        <div className="text-xs text-gray-500">
          {current}/{total}
        </div>
      </div>
    </div>
  );
}