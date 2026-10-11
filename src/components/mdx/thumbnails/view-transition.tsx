export function ViewTransitionThumbnail() {
  return (
    <div className="grid w-full max-w-80 grid-cols-[7rem_1fr] items-center gap-5 border border-[#ded8cf] bg-[#f5f2ec] p-4 text-[#292823]">
      <div className="relative aspect-4/5 overflow-hidden rounded-sm bg-[#cc846b] shadow-md">
        <div className="absolute top-1/4 left-[55%] aspect-square w-1/3 rounded-full bg-[#f2d1a5]" />
        <div className="absolute bottom-[-18%] left-[-15%] h-[52%] w-[130%] -rotate-9 rounded-t-[50%] bg-[#a95f50]" />
        <div className="absolute bottom-[-33%] left-[-15%] h-[52%] w-[130%] rotate-12 rounded-t-[50%] bg-[#63483f]" />
        <span className="absolute top-3 left-3 z-10 font-mono text-[8px] font-semibold text-white">FIELD NOTES</span>
        <span className="absolute right-3 bottom-3 z-10 font-mono text-xl font-semibold text-white">01</span>
      </div>
      <div>
        <p className="font-mono text-[9px] text-[#a6563e]">TRAVEL JOURNAL</p>
        <p className="mt-3 text-lg leading-tight font-medium text-balance">Where the light stays longer</p>
        <div className="mt-4 h-px bg-[#d8d0c6]" />
        <p className="mt-2 font-mono text-[9px] text-[#857f75]">01 / THE WEST</p>
      </div>
    </div>
  );
}
