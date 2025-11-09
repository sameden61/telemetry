import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock Supabase client if credentials are not configured
const createMockClient = () => {
  const mockError = new Error('Supabase not configured. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');

  const mockChain = {
    select: function() { return this; },
    insert: function() { return this; },
    single: function() { return Promise.resolve({ data: null, error: mockError }); },
    order: function() { return Promise.resolve({ data: [], error: mockError }); },
    eq: function() { return this; },
    then: function(resolve) { return resolve({ data: null, error: mockError }); },
  };

  return {
    from: () => mockChain,
  };
};

// Only create real client if both URL and key are provided
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();

// Car management functions
export const addCar = async (name, displayName, manufacturer, category) => {
  const { data, error } = await supabase
    .from('cars')
    .insert({
      name: name.toLowerCase().replace(/\s+/g, '_'),
      display_name: displayName,
      manufacturer,
      category
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAllCars = async () => {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .order('display_name', { ascending: true });

  if (error) throw error;
  return data;
};

// Helper functions
export const uploadTelemetrySession = async (userId, circuitId, carId, lapTime, fileName, fileType = 'csv', r2Path = null) => {
  const { data, error } = await supabase
    .from('telemetry_sessions')
    .insert({
      user_id: userId,
      circuit_id: circuitId,
      car_id: carId,
      lap_time: lapTime,
      file_name: fileName,
      file_type: fileType,
      r2_path: r2Path
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

export const getSessionsByCircuitAndCar = async (circuitId, carId) => {
  const { data, error } = await supabase
    .from('telemetry_sessions')
    .select(`
      *,
      users (name, display_name),
      circuits (name, display_name),
      cars (name, display_name, manufacturer)
    `)
    .eq('circuit_id', circuitId)
    .eq('car_id', carId)
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

export const getCornerAnalysis = async (userId, circuitId, carId) => {
  const { data, error } = await supabase
    .from('corner_analysis')
    .select('*')
    .eq('user_id', userId)
    .eq('circuit_id', circuitId)
    .eq('car_id', carId);

  if (error) throw error;
  return data;
};

export const getAllCornerAnalysis = async () => {
  const { data, error } = await supabase
    .from('corner_analysis')
    .select(`
      *,
      users (name, display_name),
      circuits (name, display_name),
      cars (name, display_name, manufacturer)
    `);

  if (error) throw error;
  return data;
};
