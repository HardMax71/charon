import { useState } from 'react';
import { processDroppedFiles } from '@/services/fileHandler';
import { FileInput } from '@/types/api';

interface DragDropZoneProps {
  onFilesProcessed: (files: FileInput[]) => void;
}

export const DragDropZone = ({ onFilesProcessed }: DragDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setIsProcessing(true);

    try {
      const files = await processDroppedFiles(e.dataTransfer.items);

      if (files.length === 0) {
        setError('No Python files found');
        setIsProcessing(false);
        return;
      }

      onFilesProcessed(files);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      {isProcessing ? (
        <p className="text-gray-600">Processing files...</p>
      ) : (
        <>
          <p className="text-gray-600 mb-2">
            Drag and drop a project folder here
          </p>
          <p className="text-xs text-gray-400">Max 10MB, Python files only</p>
        </>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
