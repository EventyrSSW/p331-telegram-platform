import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './UnityGame.module.css';

interface LevelCompleteData {
  level: number;
  score: number;
  coins: number;
  timeLeft?: number;
  timerDuration?: number;
}

interface UnityGameProps {
  gameSlug: string;
  levelData?: number;
  levelJson?: string;    // For mahjong-dash: JSON level data with Layers/Stones
  timeLimit?: number;    // For mahjong-dash: timer in seconds
  onLevelComplete?: (data: LevelCompleteData) => void;
  onBack?: () => void;
}

// Games that use the new level format (ReceiveLevelData + ReceiveTimer)
const NEW_FORMAT_GAMES = ['mahjong-dash'];

export const UnityGame: React.FC<UnityGameProps> = ({ gameSlug, levelData, levelJson, timeLimit, onLevelComplete, onBack }) => {
  const usesNewFormat = NEW_FORMAT_GAMES.includes(gameSlug);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const unityInstanceRef = useRef<any>(null);
  const audioContextsRef = useRef<AudioContext[]>([]);
  const onLevelCompleteRef = useRef(onLevelComplete);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onLevelCompleteRef.current = onLevelComplete;
  }, [onLevelComplete]);

  const handleBack = useCallback(async () => {
    // Close all tracked audio contexts
    audioContextsRef.current.forEach(ctx => {
      try {
        ctx.close();
      } catch (e) {
        // Ignore errors
      }
    });
    audioContextsRef.current = [];

    // Quit Unity instance to stop audio and free resources
    if (unityInstanceRef.current) {
      try {
        await unityInstanceRef.current.Quit();
      } catch (e) {
        // Ignore errors
      }
      unityInstanceRef.current = null;
    }

    // Force stop all audio elements
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause();
      audio.src = '';
    });

    onBack?.();
  }, [onBack]);

  useEffect(() => {
    // Track AudioContext instances created by Unity
    const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;

    if (OriginalAudioContext) {
      (window as any).AudioContext = function(...args: any[]) {
        const ctx = new OriginalAudioContext(...args);
        audioContextsRef.current.push(ctx);
        return ctx;
      };
      (window as any).AudioContext.prototype = OriginalAudioContext.prototype;
    }

    const buildUrl = `/games/${gameSlug}/Build`;
    const loaderUrl = `${buildUrl}/${gameSlug}.loader.js`;

    const config = {
      dataUrl: `${buildUrl}/${gameSlug}.data`,
      frameworkUrl: `${buildUrl}/${gameSlug}.framework.js`,
      codeUrl: `${buildUrl}/${gameSlug}.wasm`,
      streamingAssetsUrl: `/games/${gameSlug}/StreamingAssets`,
      companyName: 'vgames',
      productName: 'Mahjong Dash',
      productVersion: '1.14',
    };

    // Set canvas size to fill container
    const updateCanvasSize = () => {
      if (canvasRef.current && containerRef.current) {
        const container = containerRef.current;
        canvasRef.current.width = container.clientWidth;
        canvasRef.current.height = container.clientHeight;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // For OLD format games: Set urlLevelData BEFORE Unity loads
    // For NEW format games (mahjong-dash): Don't set urlLevelData, game waits for setLevelData call
    if (!usesNewFormat) {
      const levelToSet = levelData !== undefined ? levelData.toString() : "5";
      (window as any).urlLevelData = levelToSet;
      console.log('[UnityGame] OLD FORMAT: Setting urlLevelData BEFORE Unity loads:', levelToSet);
    } else {
      console.log('[UnityGame] NEW FORMAT: Game will wait for setLevelData call');
    }

    const script = document.createElement('script');
    script.src = loaderUrl;
    script.onload = () => {
      if (canvasRef.current && (window as any).createUnityInstance) {
        (window as any).createUnityInstance(canvasRef.current, config, (p: number) => {
          setProgress(Math.round(p * 100));
        })
          .then((instance: any) => {
            console.log('[UnityGame] Unity instance created successfully');
            console.log('[UnityGame] gameSlug:', gameSlug, 'usesNewFormat:', usesNewFormat);

            unityInstanceRef.current = instance;
            setIsLoading(false);

            // Store Unity instance globally for level control
            (window as any).unityInstance = instance;

            // Setup setLevelData function based on game format
            if (usesNewFormat) {
              // NEW FORMAT (mahjong-dash): ReceiveLevelData + ReceiveTimer
              (window as any).setLevelData = (jsonData: string, timer?: number) => {
                if (instance) {
                  const timerValue = timer ?? 300;
                  console.log('[UnityGame] NEW FORMAT setLevelData:', { jsonData: jsonData.substring(0, 50) + '...', timer: timerValue });
                  instance.SendMessage('WebGLBridge', 'ReceiveLevelData', jsonData);
                  instance.SendMessage('WebGLBridge', 'ReceiveTimer', timerValue.toString());
                  return true;
                }
                console.error('[UnityGame] Unity instance not ready yet');
                return false;
              };

              // If levelJson provided, send it after Unity is ready
              if (levelJson) {
                const timer = timeLimit ?? 300;
                console.log('[UnityGame] Sending level data after Unity ready:', { timer });
                setTimeout(() => {
                  instance.SendMessage('WebGLBridge', 'ReceiveLevelData', levelJson);
                  instance.SendMessage('WebGLBridge', 'ReceiveTimer', timer.toString());
                }, 1000);
              }
            } else {
              // OLD FORMAT (puzzle-master): SetLevelDataString
              (window as any).setLevelData = (levelDataString: string) => {
                if (instance) {
                  console.log('[UnityGame] OLD FORMAT setLevelData:', levelDataString);
                  instance.SendMessage('WebGLBridge', 'SetLevelDataString', levelDataString);
                  return true;
                }
                console.error('[UnityGame] Unity instance not ready yet');
                return false;
              };
            }

            // Setup level completion callback
            (window as any).onLevelComplete = (data: LevelCompleteData) => {
              console.log('[UnityGame] Level completed:', data);
              onLevelCompleteRef.current?.(data);
            };
          })
          .catch((err: Error) => {
            setError(err.message);
            setIsLoading(false);
          });
      }
    };
    script.onerror = () => {
      setError('Failed to load game');
      setIsLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);

      // Cleanup global Unity references
      (window as any).unityInstance = null;
      (window as any).setLevelData = null;
      (window as any).onLevelComplete = null;
      (window as any).urlLevelData = null;

      // Cleanup localStorage used by new format games
      localStorage.removeItem('levelDataPersistent');
      localStorage.removeItem('timerPersistent');

      // Close all tracked audio contexts
      audioContextsRef.current.forEach(ctx => {
        try {
          ctx.close();
        } catch (e) {
          // Ignore
        }
      });
      audioContextsRef.current = [];

      // Restore original AudioContext
      if (OriginalAudioContext) {
        (window as any).AudioContext = OriginalAudioContext;
      }

      // Cleanup Unity instance on unmount
      if (unityInstanceRef.current) {
        try {
          unityInstanceRef.current.Quit();
        } catch (e) {
          // Ignore
        }
      }

      try {
        document.body.removeChild(script);
      } catch (e) {
        // Script might already be removed
      }
    };
  }, [gameSlug, levelData, levelJson, timeLimit, usesNewFormat, onLevelComplete]);

  return (
    <div ref={containerRef} className={styles.container}>
      {onBack && (
        <button className={styles.backButton} onClick={handleBack}>
          ← Back
        </button>
      )}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.progressText}>Loading... {progress}%</div>
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
      <canvas
        id="unity-canvas"
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={-1}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
