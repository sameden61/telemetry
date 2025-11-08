import { useState } from 'react';
import { parseCSV, validateTelemetryData, calculateBestLap, normalizeTelemetryData } from '../../lib/csvParser';
import { uploadTelemetrySession, uploadTelemetryData } from '../../lib/supabase';
import { calculateCornerAnalysisForSession } from '../../lib/cornerClassifier';

export default function CSVUploader({ userId, circuitId, circuitThresholds }) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus('Parsing CSV...');

    try {
      // Parse CSV
      const rawData = await parseCSV(file);
      validateTelemetryData(rawData);
      const telemetryData = normalizeTelemetryData(rawData);

      setStatus('Calculating lap time...');
      const lapTime = calculateBestLap(telemetryData);

      setStatus('Creating session...');
      const session = await uploadTelemetrySession(
        userId,
        circuitId,
        lapTime,
        file.name
      );

      setStatus('Uploading telemetry data...');
      await uploadTelemetryData(session.id, telemetryData);

      setStatus('Analyzing corners...');
      await calculateCornerAnalysisForSession(
        session.id,
        circuitId,
        userId,
        telemetryData,
        circuitThresholds
      );

      setStatus('Upload complete!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-f1-panel p-6 rounded-lg">
      <h3 className="text-xl font-bold text-f1-text mb-4">Upload Telemetry</h3>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={uploading || !userId || !circuitId}
        className="block w-full text-f1-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-f1-red file:text-white hover:file:bg-red-700 file:cursor-pointer cursor-pointer"
      />
      {status && (
        <p className="mt-4 text-f1-accent">{status}</p>
      )}
    </div>
  );
}
