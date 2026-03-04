import HeroSection from "../components/HeroSection";
import { HiSparkles } from "react-icons/hi";
import SongList from "../components/SongList";

export default function NewMusicPage() {
  return (
    <div className="space-y-8">
      <HeroSection
        icon={HiSparkles}
        label="Nhạc mới"
        title={<>Mới phát <span className="text-neon text-glow">Hành</span></>}
        description="Những bài hát mới nhất vừa được phát hành"
      />
      <SongList />
    </div>
  );
}
