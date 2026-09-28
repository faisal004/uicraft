import { CanvasBasicsDemo } from "@/components/course/canvas-basics-demo";

export function CanvasBasicsStep({ step }: { step: number | string }) {
  return <div className="not-prose my-5"><CanvasBasicsDemo initialStep={Number(step)} /></div>;
}
