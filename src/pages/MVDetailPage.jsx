import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { HiVideoCamera, HiArrowLeft } from "react-icons/hi";
import { FaPlay, FaExpand, FaCompress } from "react-icons/fa";
import api from "../utils/api";

export default function MVDetailPage() {
  const { key } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [mv, setMv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const loadMv = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/songs/nct-video-detail/${key}`);
        if (res.data?.success) {
          setMv(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load MV:", err);
      }
      setLoading(false);
    };
    if (key) loadMv();
  }, [key]);

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const formatDuration = (dur) => {
    if (!dur) return "";
    const m = Math.floor(dur / 60);
    const s = dur % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-neon border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Đang tải MV...</p>
      </div>
    );
  }

  if (!mv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <HiVideoCamera className="text-5xl text-gray-700 mb-3" />
        <p className="text-red-400">Không tìm thấy MV</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-neon hover:text-neon/80">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 md:px-8 mt-4 max-w-5xl mx-auto">
      {/* Video Player */}
      <div className="animate-fade-in-up">
        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/50 aspect-video group">
          {mv.videoUrl ? (
            <video
              ref={videoRef}
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5066'}${mv.videoUrl}`}
              controls
              autoPlay
              className="w-full h-full"
              poster={mv.image}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
              <img src={mv.image} alt={mv.name} className="w-full h-full object-cover opacity-30 absolute inset-0" />
              <div className="relative z-10 text-center">
                <HiVideoCamera className="text-6xl text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Video chưa khả dụng</p>
                <p className="text-gray-500 text-sm mt-2">Không tìm thấy nguồn phát cho MV này</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MV Info */}
      <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{mv.name}</h1>
        <div className="flex items-center gap-3 text-gray-400">
          <span className="text-sm md:text-base">{mv.artistName}</span>
          {mv.duration > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span className="text-sm">{formatDuration(mv.duration)}</span>
            </>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-4">
          <span className="px-3 py-1 rounded-full bg-neon/10 text-neon text-xs font-semibold">
            MV
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs">
            Nhạc Việt
          </span>
        </div>
      </div>

      {/* Back button */}
      <div className="mt-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <HiArrowLeft className="text-lg" />
          Quay lại thư viện
        </button>
      </div>
    </div>
  );
}
