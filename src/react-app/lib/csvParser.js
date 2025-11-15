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
 * Uses median filtering in a sliding window to remove outliers
 */
const smoothGearChanges = (data) => {
  const windowSize = 5; // Look at 5 points around each point

  for (let i = 0; i < data.length; i++) {
    // Default to original values
    let smoothedGear = data[i].gear;
    let smoothedThrottle = data[i].throttle;

    // Get window of surrounding points
    const startIdx = Math.max(0, i - Math.floor(windowSize / 2));
    const endIdx = Math.min(data.length - 1, i + Math.floor(windowSize / 2));

    // Collect gear values in window
    const gearWindow = [];
    const throttleWindow = [];

    for (let j = startIdx; j <= endIdx; j++) {
      gearWindow.push(data[j].gear);
      throttleWindow.push(data[j].throttle);
    }

    // Use median filter for gear (removes single-point spikes)
    gearWindow.sort((a, b) => a - b);
    const medianIdx = Math.floor(gearWindow.length / 2);
    smoothedGear = gearWindow[medianIdx];

    // For throttle, detect if current point is an outlier
    // If gear changed at this point, interpolate throttle
    if (i > 0 && i < data.length - 1) {
      const gearChanged = data[i].gear !== data[i - 1].gear || data[i].gear !== data[i + 1].gear;
      const isOutlier = Math.abs(data[i].throttle - data[i - 1].throttle) > 0.3 ||
                        Math.abs(data[i].throttle - data[i + 1].throttle) > 0.3;

      if (gearChanged && isOutlier) {
        // Interpolate throttle during gear change
        smoothedThrottle = (data[i - 1].throttle + data[i + 1].throttle) / 2;
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
