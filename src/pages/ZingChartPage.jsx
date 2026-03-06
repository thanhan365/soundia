import HeroSection from "../components/HeroSection";
import { HiChartBar } from "react-icons/hi";

export default function ZingChartPage() {
  return (
    <div className="space-y-8">
      <HeroSection
        icon={HiChartBar}
        label="ZingChart"
        title={<>Bảng xếp hạng <span className="text-neon text-glow">Âm nhạc</span></>}
        description="Top bài hát thịnh hành nhất. Sắp ra mắt!"
      />
      <div className="text-center py-16">
        <p className="text-4xl mb-3">📊</p>
        <h3 className="text-lg font-semibold text-gray-400">Sắp ra mắt</h3>
        <p className="text-sm text-gray-600 mt-1">Bảng xếp hạng sẽ có trong phiên bản tiếp theo</p>
      </div>
    </div>
  );
}
