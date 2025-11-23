import { useState } from 'react';
import { processDroppedFiles } from '@/services/fileHandler';
import { FileInput } from '@/types/api';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';

interface DragDropZoneProps {
  onFilesProcessed: (files: FileInput[]) => void;
}

export const DragDropZone = ({ onFilesProcessed }: DragDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loading: isProcessing, execute: processFiles } = useAsyncOperation(
    async (items: DataTransferItemList) => {
      setError(null);
      const files = await processDroppedFiles(items);

      if (files.length === 0) {
        setError('No Python files found');
        return;
      }

      onFilesProcessed(files);
    }
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.items);
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
