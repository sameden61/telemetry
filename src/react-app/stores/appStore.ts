import { create } from 'zustand';

interface Circuit {
  id: string;
  name: string;
  display_name: string;
}

interface User {
  id: string;
  name: string;
  display_name: string;
}

interface AppState {
  isAuthenticated: boolean;
  selectedCircuit: Circuit | null;
  selectedSessions: string[];
  circuits: Circuit[];
  users: User[];

  setAuthenticated: (value: boolean) => void;
  setSelectedCircuit: (circuit: Circuit | null) => void;
  setSelectedSessions: (sessions: string[]) => void;
  setCircuits: (circuits: Circuit[]) => void;
  setUsers: (users: User[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
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
