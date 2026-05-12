import { useState, useEffect, useCallback } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function FullscreenManager({ children }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [, setIsLandscape] = useState(true);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
  }, []);

  // Check orientation
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      setShowRotatePrompt(isMobile && !landscape);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isMobile]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        }
        // Try to lock orientation to landscape on mobile
        if (isMobile && (screen.orientation as any)?.lock) {
          try {
            await (screen.orientation as any).lock('landscape');
          } catch (e) {
            // Orientation lock not supported
          }
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.log('Fullscreen error:', err);
    }
  }, [isMobile]);

  return (
    <>
      {/* Rotate prompt overlay */}
      {showRotatePrompt && (
        <div className="fixed inset-0 bg-gray-950 z-[100] flex flex-col items-center justify-center p-6">
          <div className="animate-bounce mb-6">
            <svg className="w-24 h-24 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="2" width="16" height="20" rx="2" className="origin-center animate-pulse" />
              <path d="M12 18h.01" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Rotate Your Device</h2>
            <p className="text-gray-400 text-sm mb-6">
              Please rotate your phone to <b className="text-amber-400">landscape mode</b> for the best gaming experience
            </p>
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <span className="animate-spin-slow">🔄</span>
              <span>Turn sideways to continue</span>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        className="fixed top-2 right-2 z-50 w-10 h-10 rounded-lg bg-gray-800/80 backdrop-blur border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        )}
      </button>

      {children}
    </>
  );
}
