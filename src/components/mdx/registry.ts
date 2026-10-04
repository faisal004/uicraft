import {
  DotMatrixTickerDemo,
  DotMatrixTickerPlayground,
  DotMatrixTickerStep,
  DotMatrixTickerThumbnail,
} from "@/components/mdx/dot-matrix-ticker";
import {
  WorldClockBoardDemo,
  WorldClockBoardPlayground,
  WorldClockBoardStep,
  WorldClockBoardThumbnail,
} from "@/components/mdx/world-clock-board";
import {
  TastefulButtonDemo,
  TastefulButtonPlayground,
  TastefulButtonProgression,
  TastefulButtonStepPreview,
  TastefulButtonThumbnail,
} from "@/components/mdx/tasteful-button-demo";
import {
  WavingFlagDemo,
  WavingFlagPlayground,
  WavingFlagStep,
  WavingFlagThumbnail,
} from "@/components/mdx/waving-flag";
import {
  TextToParticlesDemo,
  TextToParticlesPlayground,
  TextToParticlesStep,
  TextToParticlesThumbnail,
} from "@/components/mdx/text-to-particles";
import { ThanosSnapDemo, ThanosSnapThumbnail } from "@/components/mdx/thanos-snap";

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
  WorldClockBoardPlayground,
  WorldClockBoardStep,
};

export const previewCrafts: Record<string, React.ComponentType> = {
  "tasteful-button": TastefulButtonThumbnail,
  "dot-matrix-ticker": DotMatrixTickerThumbnail,
  "waving-flag": WavingFlagThumbnail,
  "text-to-particles": TextToParticlesThumbnail,
  "thanos-snap": ThanosSnapThumbnail,
  "world-clock-board": WorldClockBoardThumbnail,
};
