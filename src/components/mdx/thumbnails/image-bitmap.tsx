export function ImageBitmapThumbnail() {
  return (
    <div aria-hidden="true" className="flex h-full w-full flex-col overflow-hidden border border-(--demo-border) bg-(--demo-bg)">
      <div className="flex items-center justify-between border-b border-(--demo-border) bg-(--demo-bar) px-3 py-2 font-mono text-[10px] text-(--demo-subtle)">
        <span>IMAGE / BITMAP</span>
        <span>01 → 02</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="relative border-r border-(--demo-border) bg-[#17253b] bg-[url('/image-bitmap-sample.svg')] bg-cover bg-center">
          <span className="absolute bottom-2 left-2 bg-[#111214]/75 px-1.5 py-1 font-mono text-[9px] text-white">SOURCE</span>
        </div>
        <div className="relative bg-[#111214] bg-[url('/image-bitmap-thumbnail.png')] bg-contain bg-center bg-no-repeat">
          <span className="absolute bottom-2 left-2 bg-[#111214]/75 px-1.5 py-1 font-mono text-[9px] text-white">SAMPLED DOTS</span>
        </div>
      </div>
    </div>
  );
}
