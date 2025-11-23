// src/stores/cityStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type City =
  | "montreal" | "ottawa" | "gatineau" | "quebec" | "toronto" | "vancouver";

// Defensive guard: validate and fallback to 'montreal' if invalid
const validateCity = (city: string): City => {
  const validCities: City[] = ['montreal', 'ottawa', 'gatineau', 'quebec', 'toronto', 'vancouver'];
  const normalized = city.toLowerCase().trim() as City;
  return validCities.includes(normalized) ? normalized : 'montreal';
};

type CityState = {
  selectedCity: City; // Strict union type
  setCity: (c: City | string) => void; // Accept string but validate to City
  resetCity: () => void;
};

// Single source of truth. Persist to localStorage.
export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      selectedCity: "montreal",
      setCity: (c: City | string) => {
        const validated = validateCity(c);
        set({ selectedCity: validated });
      },
      resetCity: () => set({ selectedCity: "montreal" }),
    }),
    { 
      name: "popera:selectedCity",
      // Validate persisted value on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.selectedCity = validateCity(state.selectedCity);
        }
      },
    }
  )
);

// Lightweight selector hooks (avoid accidental re-renders)
export const useSelectedCity = (): City => useCityStore((s) => s.selectedCity);
export const useSetCity = () => useCityStore((s) => s.setCity);
export const resetCity = () => useCityStore.getState().resetCity();
