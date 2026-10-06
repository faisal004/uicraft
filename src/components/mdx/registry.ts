import {
  DotMatrixTickerDemo,
  DotMatrixTickerPlayground,
  DotMatrixTickerStep,
} from "@/components/mdx/dot-matrix-ticker";
import {
  WorldClockBitmapOutcome,
  WorldClockBitmapWorkshop,
  WorldClockBoardDemo,
} from "@/components/mdx/world-clock-board";
import {
  TastefulButtonDemo,
  TastefulButtonPlayground,
  TastefulButtonProgression,
  TastefulButtonStepPreview,
} from "@/components/mdx/tasteful-button-demo";
import { WavingFlagDemo, WavingFlagPlayground, WavingFlagStep } from "@/components/mdx/waving-flag";
import {
  TextToParticlesDemo,
  TextToParticlesPlayground,
  TextToParticlesStep,
} from "@/components/mdx/text-to-particles";
import { ThanosSnapDemo } from "@/components/mdx/thanos-snap";
import { WeatherBitmap } from "@/components/mdx/weather-bitmap";
import { DotMatrixTickerThumbnail } from "@/components/mdx/thumbnails/dot-matrix-ticker";
import { TastefulButtonThumbnail } from "@/components/mdx/thumbnails/tasteful-button";
import { TextToParticlesThumbnail } from "@/components/mdx/thumbnails/text-to-particles";
import { ThanosSnapThumbnail } from "@/components/mdx/thumbnails/thanos-snap";
import { WavingFlagThumbnail } from "@/components/mdx/thumbnails/waving-flag";
import { WeatherBitmapThumbnail } from "@/components/mdx/thumbnails/weather-bitmap";
import { WorldClockBoardThumbnail } from "@/components/mdx/thumbnails/world-clock-board";

export const mdxComponents = {
  TastefulButtonDemo,
  TastefulButtonPlayground,
  TastefulButtonProgression,
  TastefulButtonStepPreview,
  DotMatrixTickerDemo,
  DotMatrixTickerPlayground,
  DotMatrixTickerStep,
  WavingFlagDemo,
  WavingFlagPlayground,
  WavingFlagStep,
  TextToParticlesDemo,
  TextToParticlesPlayground,
  TextToParticlesStep,
  ThanosSnapDemo,
  WorldClockBoardDemo,
  WorldClockBitmapWorkshop,
  WorldClockBitmapOutcome,
  WeatherBitmap,
};

export const previewCrafts: Record<string, React.ComponentType> = {
  "tasteful-button": TastefulButtonThumbnail,
  "dot-matrix-ticker": DotMatrixTickerThumbnail,
  "waving-flag": WavingFlagThumbnail,
  "text-to-particles": TextToParticlesThumbnail,
  "thanos-snap": ThanosSnapThumbnail,
  "world-clock-board": WorldClockBoardThumbnail,
  "weather-bitmap": WeatherBitmapThumbnail,
};
