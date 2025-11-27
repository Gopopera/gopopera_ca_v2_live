// src/stores/cityStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type City =
  | "montreal" | "ottawa" | "gatineau" | "quebec" | "toronto" | "vancouver";

// Allow arbitrary city names as strings, but keep City union for backward compatibility
type CityState = {
  selectedCity: string; // Now accepts any string, defaults to "montreal"
  setCity: (c: string) => void; // Accept any string
  resetCity: () => void;
};

// Single source of truth. Persist to localStorage.
export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      selectedCity: "Canada", // Default to Canada (shows all events)
      setCity: (c: string) => {
        const normalized = c.trim() || "Canada";
        set({ selectedCity: normalized });
      },
      resetCity: () => set({ selectedCity: "Canada" }),
    }),
    { 
      name: "popera:selectedCity",
      // Ensure we have a valid default on rehydration
      onRehydrateStorage: () => (state) => {
        if (state && !state.selectedCity) {
          state.selectedCity = "Canada";
        }
      },
    }
  )
);

// Lightweight selector hooks (avoid accidental re-renders)
export const useSelectedCity = (): string => useCityStore((s) => s.selectedCity);
export const useSetCity = () => useCityStore((s) => s.setCity);
export const resetCity = () => useCityStore.getState().resetCity();
