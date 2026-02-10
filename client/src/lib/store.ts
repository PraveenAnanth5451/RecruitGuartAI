import { create } from 'zustand';
import { type AnalysisResult } from '@shared/routes';

interface AnalysisState {
  result: AnalysisResult | null;
  setResult: (result: AnalysisResult) => void;
  clearResult: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clearResult: () => set({ result: null }),
}));
