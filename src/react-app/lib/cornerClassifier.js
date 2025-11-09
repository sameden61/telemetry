/**
 * Classifies corners based on minimum speed thresholds
 */

export const classifyCorners = (telemetryData, thresholds) => {
  const { slow, medium, fast } = thresholds;

  // Find local minima in speed (corner apexes)
  const corners = [];
  const windowSize = 10; // Look at 10 data points for context

  for (let i = windowSize; i < telemetryData.length - windowSize; i++) {
    const point = telemetryData[i];
    const prevPoints = telemetryData.slice(i - windowSize, i);
    const nextPoints = telemetryData.slice(i + 1, i + windowSize + 1);

    // Check if this is a local minimum
    const isMinimum = prevPoints.every(p => point.speed <= p.speed) &&
                      nextPoints.every(p => point.speed <= p.speed);

    if (isMinimum && point.speed < fast.max) {
      let cornerType;
      if (point.speed <= slow.max) cornerType = 'slow';
      else if (point.speed <= medium.max) cornerType = 'medium';
      else cornerType = 'fast';

      corners.push({
        distance: point.distance,
        apexSpeed: point.speed,
        type: cornerType,
        dataIndex: i
      });
    }
  }

  return corners;
};

export const analyzeCornerPerformance = (telemetryData, corners) => {
  return corners.map(corner => {
    const dataIndex = corner.dataIndex;
    const entryStart = Math.max(0, dataIndex - 30);
    const exitEnd = Math.min(telemetryData.length - 1, dataIndex + 30);

    const entryData = telemetryData.slice(entryStart, dataIndex);
    const exitData = telemetryData.slice(dataIndex, exitEnd);

    const entrySpeed = entryData.length > 0
      ? entryData.reduce((sum, p) => sum + p.speed, 0) / entryData.length
      : 0;

    const exitSpeed = exitData.length > 0
      ? exitData.reduce((sum, p) => sum + p.speed, 0) / exitData.length
      : 0;

    const maxBrakePressure = Math.max(...entryData.map(p => p.brake));

    return {
      ...corner,
      entrySpeed,
      exitSpeed,
      maxBrakePressure
    };
  });
};

export const aggregateCornerStats = (cornerAnalysis, cornerType) => {
  const filtered = cornerAnalysis.filter(c => c.type === cornerType);

  if (filtered.length === 0) {
    return {
      count: 0,
      avgEntrySpeed: 0,
      avgExitSpeed: 0,
      avgApexSpeed: 0,
      avgBrakePressure: 0
    };
  }

  return {
    count: filtered.length,
    avgEntrySpeed: filtered.reduce((sum, c) => sum + c.entrySpeed, 0) / filtered.length,
    avgExitSpeed: filtered.reduce((sum, c) => sum + c.exitSpeed, 0) / filtered.length,
    avgApexSpeed: filtered.reduce((sum, c) => sum + c.apexSpeed, 0) / filtered.length,
    avgBrakePressure: filtered.reduce((sum, c) => sum + c.maxBrakePressure, 0) / filtered.length
  };
};

export const calculateCornerAnalysisForSession = async (sessionId, circuitId, userId, carId, telemetryData, cornerThresholds) => {
  const corners = classifyCorners(telemetryData, cornerThresholds);
  const analysis = analyzeCornerPerformance(telemetryData, corners);

  const stats = {
    slow: aggregateCornerStats(analysis, 'slow'),
    medium: aggregateCornerStats(analysis, 'medium'),
    fast: aggregateCornerStats(analysis, 'fast')
  };

  // Store in corner_analysis table
  const { saveCornerAnalysis } = await import('./api.ts');

  for (const [type, stat] of Object.entries(stats)) {
    await saveCornerAnalysis({
      session_id: sessionId,
      circuit_id: circuitId,
      user_id: userId,
      car_id: carId,
      corner_type: type,
      entry_speed_avg: stat.avgEntrySpeed,
      exit_speed_avg: stat.avgExitSpeed,
      min_speed: stat.avgApexSpeed,
      max_brake_pressure: stat.avgBrakePressure,
      corner_count: stat.count
    });
  }

  return stats;
};
