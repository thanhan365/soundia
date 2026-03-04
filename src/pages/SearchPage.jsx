import SongList from "../components/SongList";
import HeroSection from "../components/HeroSection";
import { HiSearch } from "react-icons/hi";

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <HeroSection
        icon={HiSearch}
        label="Tìm kiếm"
        title={<>Khám phá <span className="text-neon text-glow">Âm nhạc</span></>}
        description="Nhập từ khóa vào thanh tìm kiếm phía trên để tìm bài hát hoặc nghệ sĩ."
      />
      <SongList />
    </div>
  );
}
