// src/stores/cityStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type City =
  | "montreal" | "ottawa" | "gatineau" | "quebec" | "toronto" | "vancouver";

type CityState = {
  selectedCity: City;
  setCity: (c: City) => void;
  resetCity: () => void;
};

// Single source of truth. Persist to localStorage.
export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      selectedCity: "montreal",
      setCity: (c) => set({ selectedCity: c }),
      resetCity: () => set({ selectedCity: "montreal" }),
    }),
    { name: "popera:selectedCity" }
  )
);

// Lightweight selector hooks (avoid accidental re-renders)
export const useSelectedCity = () => useCityStore((s) => s.selectedCity);
export const useSetCity = () => useCityStore((s) => s.setCity);
