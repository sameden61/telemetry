import { useState } from 'react';
import { parseCSV, validateTelemetryData, calculateBestLap, normalizeTelemetryData } from '../../lib/csvParser';
import { parseTCFile, validateTCFile, calculateTCLapTime, convertTCToTelemetry } from '../../lib/tcParser';
import { createTelemetrySession, uploadTelemetryData } from '../../lib/api';

interface TelemetryUploaderProps {
  userId: string;
  circuitId: string;
  carId: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function TelemetryUploader({ userId, circuitId, carId }: TelemetryUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [fileType, setFileType] = useState<'csv' | 'tc' | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    if (!lapTime) {
      throw new Error('Could not calculate lap time from telemetry data');
    }

    // Create placeholder session first to get session ID
    setStatus('Creating session...');
    const session = await createTelemetrySession(
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
    const session = await createTelemetrySession(
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

    return session;
  };

  const processFile = async (file: File) => {
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
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await processFile(file);
    e.target.value = ''; // Reset file input
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await processFile(file);
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

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-f1-red bg-f1-card/50'
            : 'border-f1-border hover:border-f1-textGray'
        } ${uploading || !userId || !circuitId || !carId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          accept=".csv,.tc"
          onChange={handleFileUpload}
          disabled={uploading || !userId || !circuitId || !carId}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          id="file-upload"
        />
        <div className="pointer-events-none">
          <svg className="mx-auto h-12 w-12 text-f1-textGray mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-f1-text font-semibold mb-1">
            {isDragging ? 'Drop file here' : 'Drag and drop your file here'}
          </p>
          <p className="text-f1-textGray text-sm mb-2">or</p>
          <label
            htmlFor="file-upload"
            className="inline-block px-4 py-2 bg-f1-red text-white font-semibold uppercase tracking-wider hover:bg-red-700 transition-colors cursor-pointer"
          >
            Browse Files
          </label>
        </div>
      </div>

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
