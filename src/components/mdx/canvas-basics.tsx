import { CraftFrame } from "@/components/mdx/craft-controls";
import { CanvasBasicsDemo } from "@/components/mdx/canvas-basics-demo";

export function CanvasBasicsDemoFrame() {
  return <CraftFrame label="Canvas basics" meta="Six live stages"><CanvasBasicsDemo /></CraftFrame>;
}

export function CanvasBasicsStep({ step }: { step: number | string }) {
  return <div className="not-prose my-5"><CanvasBasicsDemo initialStep={Number(step)} showControls={false} /></div>;
}
