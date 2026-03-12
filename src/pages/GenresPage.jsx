import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HeroSection from "../components/HeroSection";
import { HiViewGrid } from "react-icons/hi";
import api from "../utils/api";

// ═══ NCT-style Topics — mỗi topic là 1 playlist key trên NCT ═══
const topics = [
  { name: "Pop Ballad",    nctKey: "YHu8Xj6dFxYJ", gradient: "from-pink-500 to-rose-600",    keyword: "ballad việt" },
  { name: "Remix",         nctKey: "xFQ2g5ZHKFTp",  gradient: "from-purple-600 to-blue-600",  keyword: "remix việt" },
  { name: "V-Rap",         nctKey: "iY1AnIsXedqE",  gradient: "from-violet-500 to-purple-700",keyword: "rap việt" },
  { name: "Tâm Trạng",    zingId: "6C0WOI7D",      gradient: "from-orange-600 to-amber-700",  keyword: "nhạc buồn tâm trạng" },
  { name: "TikTok",        nctKey: "lv0G8HlIW0Vq",  gradient: "from-rose-500 to-pink-600",    keyword: "tiktok trending" },
  { name: "Chill Out",     nctKey: "C6GaVhpbvkI4",  gradient: "from-cyan-500 to-teal-600",    keyword: "lofi chill" },
  { name: "V-Pop",         nctKey: "2JtgoYqhvgHL",  gradient: "from-emerald-500 to-green-600",keyword: "vpop việt" },
  { name: "K-Pop",         nctKey: "ZPOg5wVczPko",  gradient: "from-blue-500 to-indigo-600",  keyword: "kpop" },
  { name: "Acoustic",      nctKey: "dOwhaum9O8W4",  gradient: "from-sky-500 to-blue-600",     keyword: "acoustic indie" },
  { name: "Bolero",        keyword: "bolero trữ tình",                                         gradient: "from-amber-500 to-orange-600" },
  { name: "EDM",           keyword: "edm",                                                      gradient: "from-violet-500 to-blue-500" },
  { name: "US-UK",         keyword: "us uk pop",                                                gradient: "from-green-500 to-teal-500" },
  { name: "R&B / Soul",    keyword: "rnb soul",                                                 gradient: "from-pink-500 to-violet-600" },
  { name: "Rock",          keyword: "rock việt nam",                                             gradient: "from-red-700 to-gray-700" },
  { name: "Nhạc Trung",    zingId: "6C8O0A66",      gradient: "from-red-600 to-amber-500",    keyword: "nhạc hoa lời việt" },
];

// ═══ Nhạc Phim — dùng NCT playlist keys thật ═══
const nhacPhimTopics = [
  { name: "Nhạc Phim Hàn Quốc",  nctKey: "W4QIuNGetV5W", gradient: "from-blue-500 to-purple-600" },
  { name: "Nhạc Phim Việt Nam",   nctKey: "4B0LqWD2zbBE", gradient: "from-red-500 to-orange-500" },
  { name: "Nhạc Phim Hoa Ngữ",    nctKey: "aUpLq2iKZgwx", gradient: "from-red-600 to-amber-500" },
];

export default function GenresPage() {
  const navigate = useNavigate();
  const [topicCovers, setTopicCovers] = useState({});
  const [nhacPhimData, setNhacPhimData] = useState({});

  useEffect(() => {
    let mounted = true;

    // Fetch topic covers — topics with nctKey use playlist detail, others use playlist search
    const fetchTopicCovers = async () => {
      const promises = topics.map(async (t) => {
        try {
          if (t.nctKey) {
            const res = await api.get(`/songs/nct-playlist-detail/${t.nctKey}`);
            if (res?.data?.success && res.data.data?.image) {
              return { id: t.nctKey, cover: res.data.data.image };
            }
          } else {
            // Search for playlist by keyword
            const res = await api.get(`/songs/nct-search-playlists?keyword=${encodeURIComponent(t.keyword)}&limit=1`);
            if (res?.data?.success && res.data.data?.length > 0) {
              return { id: t.keyword, cover: res.data.data[0].image || "" };
            }
          }
        } catch { /* skip */ }
        return { id: t.nctKey || t.keyword, cover: "" };
      });
      const results = await Promise.all(promises);
      if (mounted) {
        const coverMap = {};
        results.forEach(r => { if (r.cover) coverMap[r.id] = r.cover; });
        setTopicCovers(coverMap);
      }
    };

    // Fetch Nhạc Phim covers from NCT playlist detail
    const fetchNhacPhim = async () => {
      const promises = nhacPhimTopics.map(async (t) => {
        try {
          const res = await api.get(`/songs/nct-playlist-detail/${t.nctKey}`);
          if (res?.data?.success && res.data.data) {
            return { key: t.nctKey, image: res.data.data.image, totalSongs: res.data.data.totalSongs };
          }
        } catch { /* skip */ }
        return { key: t.nctKey, image: "", totalSongs: 0 };
      });
      const results = await Promise.all(promises);
      if (mounted) {
        const dataMap = {};
        results.forEach(r => { dataMap[r.key] = r; });
        setNhacPhimData(dataMap);
      }
    };

    fetchTopicCovers();
    fetchNhacPhim();
    return () => { mounted = false; };
  }, []);

  const handleTopicClick = async (topic) => {
    const cover = topicCovers[topic.nctKey || topic.keyword] || "";
    const params = new URLSearchParams({
      name: topic.name,
      gradient: topic.gradient,
      cover,
    });

    if (topic.nctKey) {
      params.set("nctKey", topic.nctKey);
    } else if (topic.zingId) {
      params.set("zingId", topic.zingId);
    } else {
      // Search NCT for a playlist matching this genre keyword
      try {
        const res = await api.get(`/songs/nct-search-playlists?keyword=${encodeURIComponent(topic.keyword)}&limit=1`);
        if (res?.data?.success && res.data.data?.length > 0) {
          const pl = res.data.data[0];
          params.set("nctKey", pl.key);
          if (pl.image && !cover) params.set("cover", pl.image);
        } else {
          params.set("q", topic.keyword); // fallback
        }
      } catch {
        params.set("q", topic.keyword); // fallback
      }
    }
    navigate(`/suggested-playlist?${params.toString()}`);
  };

  const handleNhacPhimClick = (topic) => {
    const data = nhacPhimData[topic.nctKey] || {};
    const params = new URLSearchParams({
      name: topic.name,
      gradient: topic.gradient,
      nctKey: topic.nctKey,
      cover: data.image || "",
    });
    navigate(`/suggested-playlist?${params.toString()}`);
  };

  return (
    <div className="space-y-8 sm:space-y-10 pb-32">
      <HeroSection
        icon={HiViewGrid}
        label="Thể loại"
        title={<>Khám phá <span className="text-neon text-glow">Thể loại</span></>}
        description="Duyệt nhạc theo thể loại yêu thích của bạn"
      />

      {/* ═══ Topics Grid — NCT style ═══ */}
      <section>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Topics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {topics.map((t) => (
            <TopicCard
              key={t.name}
              topic={t}
              cover={topicCovers[t.nctKey || t.keyword]}
              onClick={() => handleTopicClick(t)}
            />
          ))}
        </div>
      </section>

      {/* ═══ Nhạc Phim Section ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🎬</span>
          <h2 className="text-lg sm:text-xl font-bold text-white">Nhạc Phim</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {nhacPhimTopics.map((t) => (
            <TopicCard
              key={t.name}
              topic={t}
              cover={nhacPhimData[t.nctKey]?.image}
              onClick={() => handleNhacPhimClick(t)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ═══ TopicCard — NCT Topics style ═══
function TopicCard({ topic, cover, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl aspect-[16/10] text-left transition-all duration-300 hover:scale-[1.03] active:scale-95 hover:shadow-2xl hover:shadow-black/30"
    >
      {/* Gradient base */}
      <div className={`absolute inset-0 bg-gradient-to-br ${topic.gradient}`} />

      {/* Cover art — NCT style: right-aligned cropped image */}
      {cover && (
        <div className="absolute right-0 top-0 bottom-0 w-[60%] overflow-hidden">
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-all duration-500 group-hover:scale-110"
          />
          {/* Gradient fade from left */}
          <div className={`absolute inset-0 bg-gradient-to-r ${topic.gradient.split(' ')[0]} to-transparent`} />
        </div>
      )}

      {/* Bottom shadow for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* Genre name */}
      <div className="relative h-full flex items-end p-3 sm:p-4">
        <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white drop-shadow-lg">{topic.name}</h3>
      </div>
    </button>
  );
}
