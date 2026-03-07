import React from "react";

export default function ArtistSection({ onPlayRandom }) {
  const artists = [
    { id: 1, name: "Sơn Tùng M-TP", avatar: "https://i.scdn.co/image/ab6761610000e5ebb53ad37ea21f79f4175ac2ef", followers: "3.2M" },
    { id: 2, name: "Đen Vâu", avatar: "https://i.scdn.co/image/ab6761610000e5ebeb93701633513b6329e4695e", followers: "2.1M" },
    { id: 3, name: "Hoàng Thùy Linh", avatar: "https://i.scdn.co/image/ab6761610000e5ebd74f80041ebfaecbf1bfdbf7", followers: "1.5M" },
    { id: 4, name: "Tlinh", avatar: "https://i.scdn.co/image/ab6761610000e5eba25e3f16d55de31ce98c2ca8", followers: "850K" },
    { id: 5, name: "MCK", avatar: "https://i.scdn.co/image/ab6761610000e5eb1d2b8b958c2f1f0db9ec614e", followers: "1.1M" },
    { id: 6, name: "HIEUTHUHAI", avatar: "https://i.scdn.co/image/ab6761610000e5ebe6b8015f617696efb2db4e94", followers: "920K" },
  ];

  return (
    <section className="mb-12">
      <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-300 mb-6 drop-shadow-sm">
        Nghệ Sĩ Theo Dõi
      </h2>

      <div className="flex gap-4 md:gap-8 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide md:overflow-visible md:pb-0">
        {artists.map((artist) => (
          <div
            key={artist.id}
            onClick={onPlayRandom}
            className="flex flex-col items-center gap-3 snap-start flex-shrink-0 cursor-pointer group w-28 md:w-36"
          >
            <div className="relative w-24 h-24 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:from-cyan-400 group-hover:to-pink-500 group-hover:shadow-[0_0_25px_rgba(236,72,153,0.4)]">
              <img
                src={artist.avatar}
                alt={artist.name}
                className="w-full h-full object-cover rounded-full border-[3px] border-[#0a0a14] group-hover:border-transparent transition-all duration-500"
              />
              <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 {/* Decorative glow inside */}
              </div>
            </div>
            
            <div className="text-center w-full">
              <h3 className="text-white font-bold text-sm md:text-base truncate group-hover:text-pink-300 transition-colors">
                {artist.name}
              </h3>
              <p className="text-xs text-purple-200/50 mt-1">
                {artist.followers} Quan tâm
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
