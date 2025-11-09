import { useState } from 'react';
import { parseCSV, validateTelemetryData, calculateBestLap, normalizeTelemetryData } from '../../lib/csvParser';
import { parseTCFile, validateTCFile, calculateTCLapTime, convertTCToTelemetry } from '../../lib/tcParser';
import { uploadTelemetrySession, uploadTelemetryData } from '../../lib/supabase';
import { calculateCornerAnalysisForSession } from '../../lib/cornerClassifier';

interface CornerThresholds {
  slow: { min: number; max: number };
  medium: { min: number; max: number };
  fast: { min: number; max: number };
}

interface TelemetryUploaderProps {
  userId: string;
  circuitId: string;
  carId: string;
  circuitThresholds: CornerThresholds | null;
}

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function TelemetryUploader({ userId, circuitId, carId, circuitThresholds }: TelemetryUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [fileType, setFileType] = useState<'csv' | 'tc' | null>(null);

  const detectFileType = (fileName: string): 'csv' | 'tc' | null => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'csv') return 'csv';
    if (extension === 'tc') return 'tc';
    return null;
  };

  const uploadFileToR2 = async (file: File, sessionId: string, trackName: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('trackName', trackName);
    formData.append('sessionId', sessionId);

    const response = await fetch(`${API_BASE}/api/upload-file`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to storage');
    }

    const result = await response.json();
    return result.r2Path;
  };

  const handleCSVUpload = async (file: File) => {
    setStatus('Parsing CSV...');
    const rawData = await parseCSV(file);
    validateTelemetryData(rawData);
    const telemetryData = normalizeTelemetryData(rawData);

    setStatus('Calculating lap time...');
    const lapTime = calculateBestLap(telemetryData);

    // Create placeholder session first to get session ID
    setStatus('Creating session...');
    const session = await uploadTelemetrySession(
      userId,
      circuitId,
      carId,
      lapTime,
      file.name,
      'csv',
      null // r2Path will be updated after upload
    );

    setStatus('Uploading to cloud storage...');
    await uploadFileToR2(file, session.id, circuitId);

    setStatus('Uploading telemetry data...');
    await uploadTelemetryData(session.id, telemetryData);

    setStatus('Analyzing corners...');
    await calculateCornerAnalysisForSession(
      session.id,
      circuitId,
      userId,
      carId,
      telemetryData,
      circuitThresholds
    );

    return session;
  };

  const handleTCUpload = async (file: File) => {
    setStatus('Parsing TC file...');
    const tcData = await parseTCFile(file);
    validateTCFile(tcData);

    // Convert TC data to standard telemetry format
    const telemetryData = convertTCToTelemetry(tcData);

    setStatus('Calculating lap time...');
    const lapTime = calculateTCLapTime(tcData);

    // Create placeholder session first to get session ID
    setStatus('Creating session...');
    const session = await uploadTelemetrySession(
      userId,
      circuitId,
      carId,
      lapTime,
      file.name,
      'tc',
      null // r2Path will be updated after upload
    );

    setStatus('Uploading to cloud storage...');
    await uploadFileToR2(file, session.id, circuitId);

    setStatus('Uploading telemetry data...');
    await uploadTelemetryData(session.id, telemetryData);

    setStatus('Analyzing corners...');
    await calculateCornerAnalysisForSession(
      session.id,
      circuitId,
      userId,
      carId,
      telemetryData,
      circuitThresholds
    );

    return session;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus('');

    try {
      // Detect file type
      const detectedType = detectFileType(file.name);
      if (!detectedType) {
        throw new Error('Unsupported file type. Please upload a .csv or .tc file.');
      }

      setFileType(detectedType);

      // Route to appropriate handler
      if (detectedType === 'csv') {
        await handleCSVUpload(file);
      } else if (detectedType === 'tc') {
        await handleTCUpload(file);
      }

      setStatus('Upload complete!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="bg-f1-panel p-6 border border-f1-border">
      <h3 className="text-sm font-bold text-f1-textGray uppercase tracking-wider mb-4">
        Upload Telemetry
      </h3>

      <div className="mb-4">
        <p className="text-xs text-f1-textGray mb-2">
          Supported formats: CSV (Assetto Corsa Content Manager) or TC (Assetto Corsa Telemetry)
        </p>
      </div>

      <input
        type="file"
        accept=".csv,.tc"
        onChange={handleFileUpload}
        disabled={uploading || !userId || !circuitId || !carId}
        className="block w-full text-f1-text file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-f1-red file:text-white hover:file:bg-red-700 file:cursor-pointer cursor-pointer file:uppercase file:tracking-wider file:font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {status && (
        <div className="mt-4 p-3 bg-f1-card border border-f1-border">
          <p className="text-f1-accent text-sm">
            {fileType && (
              <span className="inline-block mr-2 px-2 py-1 bg-f1-red text-white text-xs uppercase font-bold">
                {fileType}
              </span>
            )}
            {status}
          </p>
        </div>
      )}
    </div>
  );
}
