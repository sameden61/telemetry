import Papa from 'papaparse';

/**
 * Expected CSV format from Assetto Corsa Content Manager:
 * distance,speed,throttle,brake,gear,rpm,lateralG,longitudinalG
 */

export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(results.errors);
        } else {
          resolve(results.data);
        }
      },
      error: (error) => reject(error)
    });
  });
};

export const validateTelemetryData = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No telemetry data found');
  }

  const requiredFields = ['distance', 'speed', 'throttle', 'brake'];
  const firstRow = data[0];

  for (const field of requiredFields) {
    if (!(field in firstRow)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return true;
};

export const calculateBestLap = (data) => {
  // Assumes data is from a single lap
  // Calculate lap time from distance and speed
  if (data.length < 2) return null;

  let lapTime = 0;
  for (let i = 1; i < data.length; i++) {
    const distanceDelta = data[i].distance - data[i - 1].distance;
    const avgSpeed = (data[i].speed + data[i - 1].speed) / 2;
    if (avgSpeed > 0) {
      lapTime += (distanceDelta / avgSpeed) * 3.6; // Convert to seconds
    }
  }

  return lapTime;
};

export const normalizeTelemetryData = (data) => {
  return data.map(point => ({
    distance: parseFloat(point.distance) || 0,
    speed: parseFloat(point.speed) || 0,
    throttle: parseFloat(point.throttle) || 0,
    brake: parseFloat(point.brake) || 0,
    gear: parseInt(point.gear) || 0,
    rpm: parseInt(point.rpm) || 0,
    lateralG: parseFloat(point.lateralG || point.lateral_g) || 0,
    longitudinalG: parseFloat(point.longitudinalG || point.longitudinal_g) || 0
  }));
};
