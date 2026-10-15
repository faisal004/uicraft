import { BitmapDevice } from "@/components/bitmap-device";

export function BitmapDeviceThumbnail() {
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden bg-[#dbe5ed] p-3">
      <div className="w-full max-w-44">
        <BitmapDevice />
      </div>
    </div>
  );
}
