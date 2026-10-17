import { AsciiWaveField } from "@/components/mdx/ascii-wave-field";

export function AsciiWaveFieldThumbnail() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <AsciiWaveField layer="ascii" cellSize={16} speed={0} />
    </div>
  );
}
