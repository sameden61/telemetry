// API client that proxies all database calls through the Worker
const API_BASE = '/api';

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ========== USER API ==========
export const getUsers = () => apiRequest<any[]>('/users');

export const addUser = (name: string, displayName: string) =>
  apiRequest<any>('/users', {
    method: 'POST',
    body: JSON.stringify({ name, display_name: displayName }),
  });

// ========== CIRCUIT API ==========
export const getCircuits = () => apiRequest<any[]>('/circuits');

export const addCircuit = (circuit: any) =>
  apiRequest<any>('/circuits', {
    method: 'POST',
    body: JSON.stringify(circuit),
  });

// ========== CAR API ==========
export const getCars = () => apiRequest<any[]>('/cars');

export const addCar = (name: string, displayName: string, category: string = '') =>
  apiRequest<any>('/cars', {
    method: 'POST',
    body: JSON.stringify({ name, display_name: displayName, category }),
  });

// ========== TELEMETRY SESSION API ==========
export const createTelemetrySession = (
  userId: string,
  circuitId: string,
  carId: string,
  lapTime: number,
  fileName: string,
  fileType: string = 'csv',
  r2Path: string | null = null
) =>
  apiRequest<any>('/telemetry-sessions', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      circuit_id: circuitId,
      car_id: carId,
      lap_time: lapTime,
      file_name: fileName,
      file_type: fileType,
      r2_path: r2Path,
    }),
  });

export const getTelemetrySessions = (filters?: {
  userId?: string;
  circuitId?: string;
  carId?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.userId) params.append('user_id', filters.userId);
  if (filters?.circuitId) params.append('circuit_id', filters.circuitId);
  if (filters?.carId) params.append('car_id', filters.carId);
  
  const query = params.toString();
  return apiRequest<any[]>(`/telemetry-sessions${query ? `?${query}` : ''}`);
};

export const getTelemetrySession = (id: string) =>
  apiRequest<any>(`/telemetry-sessions/${id}`);

export const deleteTelemetrySession = (id: string) =>
  apiRequest<any>(`/telemetry-sessions/${id}`, {
    method: 'DELETE'
  });

// ========== TELEMETRY DATA API ==========
export const uploadTelemetryData = (sessionId: string, telemetryPoints: any[]) =>
  apiRequest<any>('/telemetry-data', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, telemetry_points: telemetryPoints }),
  });

export const getTelemetryData = (sessionId: string) =>
  apiRequest<any[]>(`/telemetry-data/${sessionId}`);

// ========== CORNER ANALYSIS API ==========
export const saveCornerAnalysis = (analysis: any) =>
  apiRequest<any>('/corner-analysis', {
    method: 'POST',
    body: JSON.stringify(analysis),
  });

export const getCornerAnalysis = (filters?: {
  sessionId?: string;
  userId?: string;
  circuitId?: string;
  carId?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.sessionId) params.append('session_id', filters.sessionId);
  if (filters?.userId) params.append('user_id', filters.userId);
  if (filters?.circuitId) params.append('circuit_id', filters.circuitId);
  if (filters?.carId) params.append('car_id', filters.carId);
  
  const query = params.toString();
  return apiRequest<any[]>(`/corner-analysis${query ? `?${query}` : ''}`);
};

// ========== COMPATIBILITY FUNCTIONS (matching old supabase.js API) ==========
export const getSessionsByCircuitAndCar = (circuitId: string, carId: string) =>
  getTelemetrySessions({ circuitId, carId });

export const getAllCornerAnalysis = () => getCornerAnalysis();

