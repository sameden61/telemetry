import { create } from 'zustand';

export const useAppStore = create((set) => ({
  isAuthenticated: false,
  selectedCircuit: null,
  selectedSessions: [],
  circuits: [],
  users: [],

  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setSelectedCircuit: (circuit) => set({ selectedCircuit: circuit }),
  setSelectedSessions: (sessions) => set({ selectedSessions: sessions }),
  setCircuits: (circuits) => set({ circuits }),
  setUsers: (users) => set({ users }),
}));
