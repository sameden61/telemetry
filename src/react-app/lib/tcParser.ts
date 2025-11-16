/**
 * Parser for Assetto Corsa .tc telemetry files
 * Format specification: https://gist.github.com/clarkb7/911721ede4f8c9bb1d82abbce3dce7bd
 */

export interface TCHeader {
  user: string;
  track: string;
  trackVariation: string;
  car: string;
  lapTimeMs: number;
  numDatapoints: number;
}

export interface TCDataPoint {
  gear: number;
  position: number;  // 0.0 to 1.0 normalized lap distance
  speed: number;     // km/h
  throttle: number;  // 0.0 to 1.0
  brake: number;     // 0.0 to 1.0
}

export interface TCData {
  header: TCHeader;
  datapoints: TCDataPoint[];
}

export interface TelemetryData {
  distance: number;
  speed: number;
  throttle: number;
  brake: number;
  gear: number;
  rpm: number;
  lateralG: number;
  longitudinalG: number;
  time: number;           // Time in seconds for this segment
  cumulative_time: number; // Cumulative time from start in seconds
  scaled_distance: number; // Normalized distance 0-100 (percentage of lap)
  smoothed_gear: number;   // Smoothed gear (spikes removed)
  smoothed_throttle: number; // Smoothed throttle (gear change artifacts removed)
}

class BinaryReader {
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  readUInt32(): number {
    const value = this.view.getUint32(this.offset, true); // little-endian
    this.offset += 4;
    return value;
  }

  readFloat(): number {
    const value = this.view.getFloat32(this.offset, true); // little-endian
    this.offset += 4;
    return value;
  }

  readVarBytes(): string {
    const size = this.readUInt32();
    if (size === 0) return '';

    const bytes = new Uint8Array(this.view.buffer, this.offset, size);
    this.offset += size;

    // Decode UTF-8
    return new TextDecoder('utf-8').decode(bytes);
  }

  skip(bytes: number): void {
    this.offset += bytes;
  }
}

export function parseTCFile(file: File): Promise<TCData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error('Failed to read file buffer');
        }

        const binReader = new BinaryReader(buffer);

        // Parse header
        binReader.skip(4); // Skip unknown header bytes

        const header: TCHeader = {
          user: binReader.readVarBytes(),
          track: binReader.readVarBytes(),
          car: binReader.readVarBytes(),
          trackVariation: binReader.readVarBytes(),
          lapTimeMs: binReader.readUInt32(),
          numDatapoints: binReader.readUInt32()
        };

        // Parse datapoints
        const datapoints: TCDataPoint[] = [];
        for (let i = 0; i < header.numDatapoints; i++) {
          datapoints.push({
            gear: binReader.readUInt32(),
            position: binReader.readFloat(),
            speed: binReader.readFloat(),
            throttle: binReader.readFloat(),
            brake: binReader.readFloat()
          });
        }

        resolve({ header, datapoints });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function formatLapTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Estimate track length from TC data using lap time and average speed
 * Since TC files have normalized position (0-1) but absolute speed (km/h),
 * we can back-calculate the track length
 */
function estimateTrackLength(tcData: TCData): number {
  // Calculate average speed across the lap
  const totalSpeed = tcData.datapoints.reduce((sum, point) => sum + point.speed, 0);
  const avgSpeed = totalSpeed / tcData.datapoints.length; // km/h

  // Lap time in hours
  const lapTimeHours = (tcData.header.lapTimeMs / 1000) / 3600;

  // Distance = Speed × Time
  const trackLengthKm = avgSpeed * lapTimeHours;

  return trackLengthKm;
}

/**
 * Reconstruct position data from speed when position sensor is corrupted/frozen
 * This keeps ALL telemetry data (even if frozen) and estimates position from speed and time
 * The corrupted flat sections will be visible in the charts, showing where data quality degraded
 */
function reconstructPositionFromSpeed(datapoints: TCDataPoint[], lapTimeMs: number): TCDataPoint[] {
  if (datapoints.length === 0) return datapoints;

  const positionThreshold = 0.000001;

  // Find where position stops progressing
  let lastValidPosIndex = datapoints.length - 1;
  for (let i = datapoints.length - 1; i > 0; i--) {
    const positionDelta = Math.abs(datapoints[i].position - datapoints[i - 1].position);
    if (positionDelta > positionThreshold) {
      lastValidPosIndex = i;
      break;
    }
  }

  // Check if we have frozen position data
  const hasCorruptedPosition = lastValidPosIndex < datapoints.length - 1;

  if (hasCorruptedPosition) {
    const numCorrupted = datapoints.length - lastValidPosIndex - 1;
    const lastValidPosition = datapoints[lastValidPosIndex].position;
    console.warn(`TC file has corrupted position data: ${numCorrupted} points with frozen position at ${(lastValidPosition * 100).toFixed(2)}%`);
    console.warn(`Reconstructing full lap position from speed data (even if speed is also frozen)...`);

    // Calculate cumulative distance traveled for ALL points using speed
    // Even if speed is frozen, we still use it to estimate distance over time
    const lapTimeSec = lapTimeMs / 1000;
    const avgTimeInterval = lapTimeSec / datapoints.length; // seconds per datapoint

    let cumulativeDistanceKm = 0;
    const reconstructedPoints = datapoints.map((point, index) => {
      if (index > 0) {
        // Calculate distance traveled since last point
        // distance = speed * time, where speed is in km/h and time is in hours
        const avgSpeedKmh = (point.speed + datapoints[index - 1].speed) / 2;
        const timeIntervalHours = avgTimeInterval / 3600;
        const distanceDelta = avgSpeedKmh * timeIntervalHours;
        cumulativeDistanceKm += distanceDelta;
      }

      return {
        ...point,
        position: cumulativeDistanceKm // Temporary: store cumulative distance
      };
    });

    // Rescale all positions to 0-1 range based on total distance traveled
    const totalDistance = reconstructedPoints[reconstructedPoints.length - 1].position;
    if (totalDistance > 0) {
      reconstructedPoints.forEach(point => {
        point.position = point.position / totalDistance;
      });
      console.warn(`Successfully reconstructed position for ${datapoints.length} points (0-100%)`);
      console.warn(`Note: Corrupted sections will show as flat lines in the telemetry charts`);
    }

    return reconstructedPoints;
  }

  // No corruption detected, return original data
  return datapoints;
}

/**
 * Convert TC datapoints to the standardized telemetry format
 * This allows both CSV and TC files to use the same database schema
 */
export function convertTCToTelemetry(tcData: TCData, trackLengthKm?: number): TelemetryData[] {
  // If track length not provided, estimate it from the data
  if (!trackLengthKm) {
    trackLengthKm = estimateTrackLength(tcData);
  }
  // First, sort by position to ensure data is in order (should already be sorted, but just to be safe)
  let sortedDatapoints = [...tcData.datapoints].sort((a, b) => a.position - b.position);

  // Detect and reconstruct position from speed when position sensor is corrupted
  sortedDatapoints = reconstructPositionFromSpeed(sortedDatapoints, tcData.header.lapTimeMs);

  let cumulativeTime = 0;

  const telemetryData = sortedDatapoints.map((point, index) => {
    // Calculate distance - if track length is known, use it, otherwise use normalized position
    const distance = trackLengthKm
      ? point.position * trackLengthKm * 1000 // Convert to meters
      : point.position * 1000; // Normalized distance

    // Calculate time for this segment
    let segmentTime = 0;
    if (index > 0) {
      const prevPoint = sortedDatapoints[index - 1];
      const prevDistance = trackLengthKm
        ? prevPoint.position * trackLengthKm * 1000
        : prevPoint.position * 1000;

      const distanceDelta = distance - prevDistance;

      // Average speed between this point and previous point
      const avgSpeed = (point.speed + prevPoint.speed) / 2;

      // Calculate time: time (s) = distance (m) / speed (m/s)
      // Speed is in km/h, so convert to m/s by dividing by 3.6
      // Or equivalently: time (s) = (distance (m) / speed (km/h)) * 3.6
      if (avgSpeed > 0) {
        segmentTime = (distanceDelta / avgSpeed) * 3.6;
      }
    }

    cumulativeTime += segmentTime;

    return {
      distance,
      speed: point.speed,
      throttle: point.throttle,
      brake: point.brake,
      gear: point.gear - 1, // AC uses 1-based gear indexing, we use 0-based
      rpm: 0, // TC files don't include RPM data
      lateralG: 0, // TC files don't include G-force data
      longitudinalG: 0,
      time: segmentTime,
      cumulative_time: cumulativeTime,
      scaled_distance: point.position * 100, // Normalize to 0-100 scale
      smoothed_gear: point.gear - 1, // Will be smoothed below
      smoothed_throttle: point.throttle // Will be smoothed below
    };
  });

  // Apply smoothing to remove gear change spikes
  smoothGearChanges(telemetryData);

  // Scale cumulative_time to match actual lap time
  // This ensures the final cumulative_time exactly equals the lap time from the TC file
  const actualLapTime = tcData.header.lapTimeMs / 1000; // Convert to seconds
  const calculatedFinalTime = telemetryData[telemetryData.length - 1]?.cumulative_time || actualLapTime;

  if (calculatedFinalTime > 0 && Math.abs(calculatedFinalTime - actualLapTime) > 0.1) {
    // If there's a significant difference, scale all cumulative times proportionally
    const scaleFactor = actualLapTime / calculatedFinalTime;
    telemetryData.forEach(point => {
      point.time *= scaleFactor;
      point.cumulative_time *= scaleFactor;
    });
  }

  return telemetryData;
}

/**
 * Validate that a file is a valid .tc file by checking its header
 */
export function validateTCFile(tcData: TCData): boolean {
  if (!tcData.header.user || !tcData.header.track || !tcData.header.car) {
    throw new Error('Invalid TC file: Missing header information');
  }

  if (tcData.header.numDatapoints !== tcData.datapoints.length) {
    throw new Error(`Invalid TC file: Expected ${tcData.header.numDatapoints} datapoints, found ${tcData.datapoints.length}`);
  }

  if (tcData.datapoints.length === 0) {
    throw new Error('Invalid TC file: No telemetry data found');
  }

  return true;
}

/**
 * Smooth gear and throttle data to remove gear change spikes
 * Uses median filtering in a sliding window to remove outliers
 */
function smoothGearChanges(data: TelemetryData[]): void {
  const windowSize = 5; // Look at 5 points around each point

  for (let i = 0; i < data.length; i++) {
    // Default to original values
    let smoothedGear = data[i].gear;
    let smoothedThrottle = data[i].throttle;

    // Get window of surrounding points
    const startIdx = Math.max(0, i - Math.floor(windowSize / 2));
    const endIdx = Math.min(data.length - 1, i + Math.floor(windowSize / 2));

    // Collect gear values in window
    const gearWindow: number[] = [];
    const throttleWindow: number[] = [];

    for (let j = startIdx; j <= endIdx; j++) {
      gearWindow.push(data[j].gear);
      throttleWindow.push(data[j].throttle);
    }

    // Use median filter for gear (removes single-point spikes)
    gearWindow.sort((a, b) => a - b);
    const medianIdx = Math.floor(gearWindow.length / 2);
    smoothedGear = gearWindow[medianIdx];

    // Only smooth throttle if gear was adjusted (gear spike detected)
    if (smoothedGear !== data[i].gear) {
      // Gear was smoothed, so also smooth throttle at this point
      throttleWindow.sort((a, b) => a - b);
      smoothedThrottle = throttleWindow[medianIdx];
    }
    // Otherwise keep original throttle value

    data[i].smoothed_gear = smoothedGear;
    data[i].smoothed_throttle = smoothedThrottle;
  }
}

/**
 * Calculate lap time from TC data
 */
export function calculateTCLapTime(tcData: TCData): number {
  // TC files include lap time in milliseconds, convert to seconds
  return tcData.header.lapTimeMs / 1000;
}
