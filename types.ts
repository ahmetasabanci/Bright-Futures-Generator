
export interface FuturePrediction {
  sector: string;
  technology: string;
}

export interface ExplanationState {
  text: string;
  isLoading: boolean;
  error: string | null;
}
