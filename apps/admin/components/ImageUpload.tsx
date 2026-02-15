'use client';

import { useState, useRef, useEffect, useId } from 'react';

interface ImageUploadProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  multiple?: boolean;
  maxImages?: number;
  id?: string;
}

export default function ImageUpload({
  images,
  onImagesChange,
  multiple = false,
  maxImages = 10,
  id,
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const uniqueId = id || `image-upload-${generatedId.replace(/:/g, '')}`;

  // Cleanup preview URLs when component unmounts or images are cleared
  useEffect(() => {
    return () => {
      // Cleanup: revoke all object URLs to prevent memory leaks
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Clear previews when images are cleared externally
  useEffect(() => {
    if (images.length === 0 && previews.length > 0) {
      previews.forEach(url => URL.revokeObjectURL(url));
      setPreviews([]);
    }
  }, [images.length]);

  const processFiles = (files: File[]) => {
    // Limit number of files
    const filesToAdd = multiple 
      ? files.slice(0, maxImages - images.length)
      : files.slice(0, 1);

    if (filesToAdd.length === 0) return;

    // Validate file types
    const validFiles = filesToAdd.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Create previews
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    
    if (multiple) {
      onImagesChange([...images, ...validFiles]);
      setPreviews([...previews, ...newPreviews]);
    } else {
      onImagesChange(validFiles);
      setPreviews(newPreviews);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!(multiple && images.length >= maxImages)) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (multiple && images.length >= maxImages) {
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // Revoke object URLs to prevent memory leaks
    URL.revokeObjectURL(previews[index]);
    
    onImagesChange(newImages);
    setPreviews(newPreviews);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {multiple ? 'Images' : 'Image'} (optional)
      </label>
      
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : multiple && images.length >= maxImages
            ? 'border-gray-200 bg-gray-50 opacity-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          id={uniqueId}
          disabled={multiple && images.length >= maxImages}
        />
        <div className="flex flex-col items-center">
          <svg
            className={`w-6 h-6 mb-1 ${
              isDragging ? 'text-blue-500' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className={`text-xs font-medium mb-1 ${
            isDragging ? 'text-blue-600' : 'text-gray-700'
          }`}>
            {isDragging
              ? 'Drop images here'
              : multiple && images.length >= maxImages
              ? `Maximum ${maxImages} images reached`
              : 'Drag and drop or'}
          </p>
          {!(multiple && images.length >= maxImages) && (
            <label
              htmlFor={uniqueId}
              className={`cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {multiple ? `Browse (${images.length}/${maxImages})` : 'Browse'}
            </label>
          )}
        </div>
        {multiple && images.length > 0 && !isDragging && (
          <p className="mt-2 text-xs text-gray-500">
            {images.length} image{images.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>
      
      {multiple && images.length >= maxImages && (
        <p className="mt-1 text-sm text-gray-500">
          Maximum {maxImages} images reached
        </p>
      )}

      {/* Preview existing images */}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mt-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-md border border-gray-300"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
