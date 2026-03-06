import HeroSection from "../components/HeroSection";
import { IoRadio } from "react-icons/io5";

export default function RadioPage() {
  return (
    <div className="space-y-8">
      <HeroSection
        icon={IoRadio}
        label="Radio"
        title={<>Nghe <span className="text-neon text-glow">Radio</span></>}
        description="Phát trực tiếp các kênh radio yêu thích. Sắp ra mắt!"
      />
      <div className="text-center py-16">
        <p className="text-4xl mb-3">📻</p>
        <h3 className="text-lg font-semibold text-gray-400">Sắp ra mắt</h3>
        <p className="text-sm text-gray-600 mt-1">Radio sẽ có trong phiên bản tiếp theo</p>
      </div>
    </div>
  );
}
