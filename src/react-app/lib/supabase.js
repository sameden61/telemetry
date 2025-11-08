import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions
export const uploadTelemetrySession = async (userId, circuitId, lapTime, fileName) => {
  const { data, error } = await supabase
    .from('telemetry_sessions')
    .insert({
      user_id: userId,
      circuit_id: circuitId,
      lap_time: lapTime,
      file_name: fileName
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const uploadTelemetryData = async (sessionId, telemetryPoints) => {
  const dataToInsert = telemetryPoints.map((point, index) => ({
    session_id: sessionId,
    distance: point.distance,
    speed: point.speed,
    throttle: point.throttle,
    brake: point.brake,
    gear: point.gear,
    rpm: point.rpm,
    lateral_g: point.lateralG,
    longitudinal_g: point.longitudinalG,
    data_index: index
  }));

  // Insert in batches of 1000
  const batchSize = 1000;
  for (let i = 0; i < dataToInsert.length; i += batchSize) {
    const batch = dataToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('telemetry_data').insert(batch);
    if (error) throw error;
  }
};

export const getSessionsByCircuit = async (circuitId) => {
  const { data, error } = await supabase
    .from('telemetry_sessions')
    .select(`
      *,
      users (name, display_name),
      circuits (name, display_name)
    `)
    .eq('circuit_id', circuitId)
    .order('lap_time', { ascending: true });

  if (error) throw error;
  return data;
};

export const getTelemetryData = async (sessionId) => {
  const { data, error } = await supabase
    .from('telemetry_data')
    .select('*')
    .eq('session_id', sessionId)
    .order('data_index', { ascending: true });

  if (error) throw error;
  return data;
};

export const getCornerAnalysis = async (userId, circuitId) => {
  const { data, error } = await supabase
    .from('corner_analysis')
    .select('*')
    .eq('user_id', userId)
    .eq('circuit_id', circuitId);

  if (error) throw error;
  return data;
};

export const getAllCornerAnalysis = async () => {
  const { data, error } = await supabase
    .from('corner_analysis')
    .select(`
      *,
      users (name, display_name),
      circuits (name, display_name)
    `);

  if (error) throw error;
  return data;
};
