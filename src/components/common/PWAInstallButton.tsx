import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-500/20 transition-colors text-xs font-medium whitespace-nowrap ${
          compact ? 'px-3 py-2 w-full justify-start' : 'px-3.5 py-2'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install FocusFlow</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[#232732] bg-white dark:bg-[#171B23] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1E232E] transition-colors text-xs font-medium whitespace-nowrap ${
            compact ? 'px-3 py-2 w-full justify-start' : 'px-3.5 py-2'
          }`}
        >
          <Share className="w-3.5 h-3.5 shrink-0" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#252A36] bg-white dark:bg-[#13161C] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Install FocusFlow on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install guide"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1E232E]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2.5 text-sm text-gray-600 dark:text-gray-300">
                <li>1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.</li>
                <li>2. Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>3. Tap <strong>Add</strong> to launch FocusFlow like a native app.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-gray-900 dark:bg-violet-600 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-violet-500 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
