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

/**
 * Smooth gear and throttle data to remove gear change spikes
 */
const smoothGearChanges = (data) => {
  for (let i = 0; i < data.length; i++) {
    let smoothedGear = data[i].gear;
    let smoothedThrottle = data[i].throttle;

    // Detect gear change spikes: gear drops significantly and returns quickly
    if (i > 0 && i < data.length - 1) {
      const prev = data[i - 1];
      const curr = data[i];
      const next = data[i + 1];

      const scaledDistDelta = next.scaled_distance - prev.scaled_distance;

      // If within 0.15% scaled distance and gear drops then returns
      if (scaledDistDelta < 0.15) {
        const gearDropped = curr.gear < prev.gear && curr.gear < next.gear;
        const gearReturns = Math.abs(next.gear - prev.gear) <= 1;

        if (gearDropped && gearReturns) {
          // Interpolate gear (use previous gear during spike)
          smoothedGear = prev.gear;

          // Also interpolate throttle during gear changes
          smoothedThrottle = (prev.throttle + next.throttle) / 2;
        }
      }
    }

    data[i].smoothed_gear = smoothedGear;
    data[i].smoothed_throttle = smoothedThrottle;
  }
};

export const normalizeTelemetryData = (data) => {
  // First, sort by distance to ensure data is in order
  const sortedData = [...data].sort((a, b) =>
    (parseFloat(a.distance) || 0) - (parseFloat(b.distance) || 0)
  );

  // Calculate max distance for scaling
  const maxDistance = sortedData.length > 0
    ? parseFloat(sortedData[sortedData.length - 1].distance) || 1
    : 1;

  let cumulativeTime = 0;

  const telemetryData = sortedData.map((point, index) => {
    const distance = parseFloat(point.distance) || 0;
    const speed = parseFloat(point.speed) || 0;
    
    // Calculate time for this segment
    let segmentTime = 0;
    if (index > 0) {
      const prevPoint = sortedData[index - 1];
      const prevDistance = parseFloat(prevPoint.distance) || 0;
      const prevSpeed = parseFloat(prevPoint.speed) || 0;
      
      const distanceDelta = distance - prevDistance;
      const avgSpeed = (speed + prevSpeed) / 2;
      
      // Calculate time: time (s) = distance (m) / speed (m/s)
      // Speed is in km/h, so convert: time (s) = (distance (m) / speed (km/h)) * 3.6
      if (avgSpeed > 0) {
        segmentTime = (distanceDelta / avgSpeed) * 3.6;
      }
    }
    
    cumulativeTime += segmentTime;
    
    return {
      distance,
      speed,
      throttle: parseFloat(point.throttle) || 0,
      brake: parseFloat(point.brake) || 0,
      gear: parseInt(point.gear) || 0,
      rpm: parseInt(point.rpm) || 0,
      lateralG: parseFloat(point.lateralG || point.lateral_g) || 0,
      longitudinalG: parseFloat(point.longitudinalG || point.longitudinal_g) || 0,
      time: segmentTime,
      cumulative_time: cumulativeTime,
      scaled_distance: (distance / maxDistance) * 100, // Normalize to 0-100 scale
      smoothed_gear: parseInt(point.gear) || 0, // Will be smoothed below
      smoothed_throttle: parseFloat(point.throttle) || 0 // Will be smoothed below
    };
  });

  // Apply smoothing to remove gear change spikes
  smoothGearChanges(telemetryData);

  return telemetryData;
};
