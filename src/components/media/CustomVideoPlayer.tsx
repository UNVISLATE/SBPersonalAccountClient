import React, { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import clsx from "clsx";
import styles from "./CustomVideoPlayer.module.scss";

export interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  onExpand?: () => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  poster,
  autoPlay = false,
  loop = false,
  className,
  onExpand,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [pulseVisible, setPulseVisible] = useState(false);
  const [pulseMode, setPulseMode] = useState<"play" | "pause">("play");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);

  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const triggerCenterPulse = useCallback((mode: "play" | "pause") => {
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    setPulseMode(mode);
    setPulseVisible(true);
    if (mode === "play") {
      pulseTimeoutRef.current = setTimeout(() => {
        setPulseVisible(false);
      }, 420);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          triggerCenterPulse("play");
        })
        .catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerCenterPulse("pause");
    }
  }, [triggerCenterPulse]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || isDraggingScrubber) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    videoRef.current.volume = volume;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!scrubberRef.current || !videoRef.current || !duration) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = clickX / rect.width;
    const newTime = percent * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingScrubber(true);
    handleSeek(e);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleSeek(moveEvent);
    };

    const handleMouseUp = () => {
      setIsDraggingScrubber(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 0.5;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (onExpand) {
      onExpand();
      return;
    }
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2400);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const showCenterCircle = !isPlaying || pulseVisible;

  return (
    <div
      ref={containerRef}
      className={clsx(styles.playerContainer, className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        playsInline
        className={styles.video}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Animated Center Play/Pause Circle */}
      <AnimatePresence>
        {showCenterCircle && (
          <motion.button
            key="center-circle-btn"
            type="button"
            className={styles.centerPlayBtn}
            onClick={togglePlay}
            aria-label={isPlaying ? "Пауза" : "Воспроизвести видео"}
            initial={{ opacity: 0, scale: 0.78 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.18 }}
            whileHover={{ scale: 1.09 }}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isPlaying || (pulseVisible && pulseMode === "play") ? (
                <motion.span
                  key="icon-pause"
                  className={styles.centerIconWrap}
                  initial={{ opacity: 0, scale: 0.55, rotate: -25 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.55, rotate: 25 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Pause size={26} />
                </motion.span>
              ) : (
                <motion.span
                  key="icon-play"
                  className={styles.centerIconWrap}
                  initial={{ opacity: 0, scale: 0.55, rotate: 25 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.55, rotate: -25 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Play size={26} className={styles.playIcon} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Controls Bar */}
      <div className={clsx(styles.controlsBar, (showControls || !isPlaying) && styles.visible)}>
        <div
          ref={scrubberRef}
          className={styles.scrubberContainer}
          onMouseDown={handleScrubberMouseDown}
        >
          <div className={styles.scrubberTrack}>
            <div
              className={styles.scrubberFill}
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className={styles.scrubberThumb}
              style={{ left: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.leftControls}>
            <motion.button
              type="button"
              className={styles.controlBtn}
              onClick={togglePlay}
              whileTap={{ scale: 0.88 }}
              aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isPlaying ? (
                  <motion.span
                    key="bar-pause"
                    className={styles.iconAnimSpan}
                    initial={{ opacity: 0, scale: 0.6, rotate: -35 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: 35 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Pause size={18} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="bar-play"
                    className={styles.iconAnimSpan}
                    initial={{ opacity: 0, scale: 0.6, rotate: 35 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: -35 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Play size={18} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <div className={styles.volumeGroup}>
              <button
                type="button"
                className={styles.controlBtn}
                onClick={toggleMute}
                aria-label={isMuted ? "Включить звук" : "Выключить звук"}
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className={styles.volumeSlider}
                aria-label="Громкость"
              />
            </div>

            <span className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className={styles.rightControls}>
            <motion.button
              type="button"
              className={styles.controlBtn}
              onClick={toggleFullscreen}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
              aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isFullscreen ? (
                  <motion.span
                    key="fs-minimize"
                    className={styles.iconAnimSpan}
                    initial={{ opacity: 0, scale: 0.6, rotate: 45 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: -45 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Minimize size={18} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="fs-maximize"
                    className={styles.iconAnimSpan}
                    initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Maximize size={18} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
