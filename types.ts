
export interface GenerationState {
  isGenerating: boolean;
  progressMessage: string;
  error: string | null;
}

export type AdaTopic = 'biography' | 'keir' | 'sovereignty';

export interface AdaContent {
  topic: AdaTopic;
  imageUrl: string | null;
  audioBuffer: AudioBuffer | null;
  speechText: string;
  title: string;
  subtitle: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  sidebarQuote: string;
}
