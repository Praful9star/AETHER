import { create } from "zustand";
import { FormType } from "./forms";

export interface Star {
  id: string;
  thought: string;
  whisper: string;
  palette: [string, string, string];
  form: FormType;
  energy: number;
  pos: [number, number, number];
  created_at: string;
}

interface AetherState {
  palette: [string, string, string];
  form: FormType;
  energy: number;
  whisper: string;
  thought: string;
  stars: Star[];
  isLoading: boolean;
  soundEnabled: boolean;
  captureModalOpen: boolean;
  activeStarId: string | null;

  setCosmosState: (s: Partial<AetherState>) => void;
  setStars: (stars: Star[]) => void;
  addStar: (star: Star) => void;
  setSoundEnabled: (v: boolean) => void;
  setCaptureModalOpen: (v: boolean) => void;
  setActiveStarId: (id: string | null) => void;
}

export const useAetherStore = create<AetherState>((set) => ({
  palette: ["#0a0020", "#6b21a8", "#e879f9"],
  form: "spiral",
  energy: 0.3,
  whisper: "",
  thought: "",
  stars: [],
  isLoading: false,
  soundEnabled: false,
  captureModalOpen: false,
  activeStarId: null,

  setCosmosState: (s) => set((state) => ({ ...state, ...s })),
  setStars: (stars) => set({ stars }),
  addStar: (star) => set((state) => ({ stars: [...state.stars, star] })),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setCaptureModalOpen: (captureModalOpen) => set({ captureModalOpen }),
  setActiveStarId: (activeStarId) => set({ activeStarId }),
}));
