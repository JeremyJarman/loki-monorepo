'use client';

import { useState, useRef, useEffect, useId } from 'react';

interface ImageUploadProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  multiple?: boolean;
  maxImages?: number;
  id?: string;
  label?: string;
}

export default function ImageUpload({
  images,
  onImagesChange,
  multiple = false,
  maxImages = 10,
  id,
  label,
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const uniqueId = id || `image-upload-${generatedId.replace(/:/g, '')}`;

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (images.length === 0 && previews.length > 0) {
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
    }
  }, [images.length]);

  const processFiles = (files: File[]) => {
    const filesToAdd = multiple
      ? files.slice(0, maxImages - images.length)
      : files.slice(0, 1);

    if (filesToAdd.length === 0) return;

    const validFiles = filesToAdd.filter((file) => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));

    if (multiple) {
      onImagesChange([...images, ...validFiles]);
      setPreviews([...previews, ...newPreviews]);
    } else {
      onImagesChange(validFiles);
      setPreviews(newPreviews);
    }

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

    URL.revokeObjectURL(previews[index]);

    onImagesChange(newImages);
    setPreviews(newPreviews);
  };

  const isDisabled = multiple && images.length >= maxImages;

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-2">
          {label}
        </label>
      )}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/10'
            : isDisabled
              ? 'border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800/50 opacity-50'
              : 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800/30 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/50'
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
          disabled={isDisabled}
        />
        <div className="flex flex-col items-center">
          <svg
            className={`w-8 h-8 mb-2 ${
              isDragging ? 'text-primary' : 'text-neutral-400 dark:text-neutral-500'
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
          <p
            className={`text-sm font-medium mb-2 ${
              isDragging ? 'text-primary' : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            {isDragging
              ? 'Drop images here'
              : isDisabled
                ? `Maximum ${maxImages} images reached`
                : 'Drag and drop or'}
          </p>
          {!isDisabled && (
            <label
              htmlFor={uniqueId}
              className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isDragging
                  ? 'border-2 border-primary bg-primary/10 text-primary'
                  : 'border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <svg
                className="w-4 h-4"
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
          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            {images.length} image{images.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {multiple && images.length >= maxImages && (
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Maximum {maxImages} images reached
        </p>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 mt-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full aspect-square object-cover rounded-lg border border-neutral-200 dark:border-neutral-600"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
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
