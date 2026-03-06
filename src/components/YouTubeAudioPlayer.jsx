import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const BACKEND_URL = 'http://localhost:5066/api';
const PLAYER_EL_ID = 'yt-audio-player-div';

const YouTubeAudioPlayer = forwardRef(function YouTubeAudioPlayer(
  { onReady, onStateChange, onTimeUpdate, onError },
  ref
) {
  // playerRef sẽ chỉ chứa player thật SAU KHI onReady fire
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const readyRef = useRef(false);
  
  // Lưu callback mới nhất để tránh stale clousure do useEffect chỉ chạy 1 lần
  const callbacksRef = useRef({ onStateChange, onTimeUpdate, onError });
  useEffect(() => {
    callbacksRef.current = { onStateChange, onTimeUpdate, onError };
  }, [onStateChange, onTimeUpdate, onError]);

  // ── Expose controls via ref ──────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    async loadAndPlay(query) {
      // Chờ player thật sự sẵn sàng (readyRef = true sau onReady)
      let waited = 0;
      while (!readyRef.current && waited < 5000) {
        await new Promise(r => setTimeout(r, 200));
        waited += 200;
      }
      if (!readyRef.current || !playerRef.current) {
        console.error('[YT] Player never became ready, aborting');
        onError?.();
        return;
      }

      try {
        console.log('[YT] Fetching videoId for:', query);
        const res = await fetch(
          `${BACKEND_URL}/stream/video-id?query=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { videoId } = await res.json();
        console.log('[YT] Got videoId:', videoId, '— calling loadVideoById...');

        // playerRef.current là e.target từ onReady → có đầy đủ method
        playerRef.current.loadVideoById({ videoId, startSeconds: 0 });

        // Đảm bảo phát sau khi load xong
        setTimeout(() => {
          try { playerRef.current?.playVideo(); } catch (_) {}
        }, 600);

      } catch (err) {
        console.error('[YT] loadAndPlay error:', err.message);
        onError?.();
      }
    },

    play()           { playerRef.current?.playVideo(); },
    pause()          { playerRef.current?.pauseVideo(); },
    seekTo(s)        { playerRef.current?.seekTo(s, true); },
    setVolume(v)     { playerRef.current?.setVolume?.(Math.round(v * 100)); },
    getCurrentTime() { return playerRef.current?.getCurrentTime?.() ?? 0; },
    getDuration()    { return playerRef.current?.getDuration?.() ?? 0; },
    isReady()        { return readyRef.current && !!playerRef.current; },
  }));

  // ── Init YouTube IFrame API ──────────────────────────────────────────────
  useEffect(() => {
    const initPlayer = () => {
      // Tạo player dùng element ID - đây là cách tin cậy nhất
      const ytPlayer = new window.YT.Player(PLAYER_EL_ID, {
        width: '320',
        height: '180',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          mute: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            // QUAN TRỌNG: lưu e.target (YT.Player thật) vào playerRef
            // KHÔNG dùng giá trị từ `new YT.Player()` vì nó là object trước khi init
            playerRef.current = e.target;
            readyRef.current = true;
            console.log('[YT] Player ready ✓ (e.target assigned)');
            onReady?.();
          },
          onStateChange: (e) => {
            callbacksRef.current.onStateChange?.(e.data);

            if (e.data === 1 /* PLAYING */) {
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = setInterval(() => {
                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                  const t = playerRef.current.getCurrentTime() || 0;
                  const d = playerRef.current.getDuration() || 0;
                  callbacksRef.current.onTimeUpdate?.(t, d);
                }
              }, 200); // Tăng tần suất update cho mượt hơn
            } else {
              if (timerRef.current) clearInterval(timerRef.current);
            }
          },
          onError: (e) => {
            console.error('[YT] Player error code:', e.data);
            if (timerRef.current) clearInterval(timerRef.current);
            callbacksRef.current.onError?.();
          },
        },
      });
      // Không lưu ytPlayer vào playerRef ở đây vì nó chưa có method đầy đủ
      // playerRef sẽ được gán trong onReady qua e.target
      void ytPlayer;
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        initPlayer();
      };
    }

    return () => {
      clearInterval(timerRef.current);
      readyRef.current = false;
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  }, []); // eslint-disable-line

  return (
    // Đặt off-screen thay vì dùng opacity/display:none
    // Browsers có thể ngăn autoplay khi element hoàn toàn ẩn
    <div
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '320px',
        height: '180px',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {/* ID cố định để YT.Player khởi tạo đúng element */}
      <div id={PLAYER_EL_ID} />
    </div>
  );
});

export default YouTubeAudioPlayer;
