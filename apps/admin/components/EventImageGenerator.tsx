'use client';

import { useState, useEffect, useRef } from 'react';

export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  maxWidth?: number;
}

export interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  textElements: TextElement[];
  shapeElements?: Array<{
    id: string;
    type: 'oval' | 'rectangle' | 'circle';
    x: number;
    y: number;
    width: number;
    height: number;
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
  }>;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'template-1',
    name: 'Classic Green',
    width: 600,
    height: 900,
    backgroundColor: '#0e382d',
    textElements: [
      {
        id: 'top-text',
        text: 'WWW.REALLYGREATSITE.COM',
        x: 300,
        y: 50,
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#ffffff',
        textAlign: 'center',
      },
      {
        id: 'date',
        text: '12 MAY 2024',
        x: 300,
        y: 200,
        fontSize: 14,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#ffffff',
        textAlign: 'center',
      },
      {
        id: 'title-line-1',
        text: 'Sunday',
        x: 300,
        y: 350,
        fontSize: 64,
        fontFamily: 'Georgia',
        fontWeight: 'normal',
        fontStyle: 'italic',
        color: '#ffffff',
        textAlign: 'center',
      },
      {
        id: 'title-line-2',
        text: 'Run Club',
        x: 300,
        y: 420,
        fontSize: 64,
        fontFamily: 'Georgia',
        fontWeight: 'normal',
        fontStyle: 'italic',
        color: '#ffffff',
        textAlign: 'center',
      },
      {
        id: 'cta',
        text: 'JOIN US THIS SUNDAY',
        x: 300,
        y: 550,
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#ffffff',
        textAlign: 'center',
      },
      {
        id: 'description',
        text: 'JUST BRING YOURSELF, YOUR WATER AND LET\'S RUN',
        x: 300,
        y: 600,
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#ffffff',
        textAlign: 'center',
        maxWidth: 500,
      },
      {
        id: 'footer',
        text: 'ANY LEVELS WELCOME',
        x: 300,
        y: 800,
        fontSize: 14,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#ffffff',
        textAlign: 'center',
      },
    ],
    shapeElements: [
      {
        id: 'date-oval',
        type: 'oval',
        x: 200,
        y: 180,
        width: 200,
        height: 40,
        strokeColor: '#ffffff',
        strokeWidth: 2,
      },
    ],
  },
  {
    id: 'template-2',
    name: 'Modern Blue',
    width: 600,
    height: 900,
    backgroundColor: '#1a365d',
    textElements: [
      {
        id: 'title',
        text: 'EVENT TITLE',
        x: 300,
        y: 300,
        fontSize: 56,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'normal',
        color: '#ffffff',
        textAlign: 'center',
      },
      {
        id: 'date',
        text: 'MAY 12, 2024',
        x: 300,
        y: 400,
        fontSize: 20,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#a0c4ff',
        textAlign: 'center',
      },
      {
        id: 'description',
        text: 'Join us for an amazing event!',
        x: 300,
        y: 500,
        fontSize: 18,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#ffffff',
        textAlign: 'center',
        maxWidth: 500,
      },
    ],
  },
  {
    id: 'template-3',
    name: 'Elegant Dark',
    width: 600,
    height: 900,
    backgroundColor: '#1a1a1a',
    textElements: [
      {
        id: 'title',
        text: 'EVENT NAME',
        x: 300,
        y: 250,
        fontSize: 48,
        fontFamily: 'Times New Roman',
        fontWeight: 'normal',
        fontStyle: 'italic',
        color: '#f5f5f5',
        textAlign: 'center',
      },
      {
        id: 'subtitle',
        text: 'A Special Evening',
        x: 300,
        y: 320,
        fontSize: 24,
        fontFamily: 'Times New Roman',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#d4af37',
        textAlign: 'center',
      },
      {
        id: 'date',
        text: 'May 12, 2024',
        x: 300,
        y: 400,
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#ffffff',
        textAlign: 'center',
      },
      {
        id: 'description',
        text: 'Join us for an unforgettable experience',
        x: 300,
        y: 500,
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#cccccc',
        textAlign: 'center',
        maxWidth: 450,
      },
    ],
  },
];

interface EventImageGeneratorProps {
  onImageGenerated?: (imageFile: File) => void;
  initialTemplate?: Template;
}

export default function EventImageGenerator({ onImageGenerated, initialTemplate }: EventImageGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [currentTemplate, setCurrentTemplate] = useState<Template>(
    initialTemplate || DEFAULT_TEMPLATES[0]
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Load saved templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('eventTemplates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTemplates([...DEFAULT_TEMPLATES, ...parsed]);
      } catch (e) {
        console.error('Error loading saved templates:', e);
      }
    }
  }, []);

  // Render canvas
  useEffect(() => {
    renderCanvas();
  }, [currentTemplate]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = currentTemplate.width;
    canvas.height = currentTemplate.height;

    // Clear canvas
    ctx.fillStyle = currentTemplate.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw shapes
    if (currentTemplate.shapeElements) {
      currentTemplate.shapeElements.forEach((shape) => {
        ctx.strokeStyle = shape.strokeColor;
        ctx.lineWidth = shape.strokeWidth;
        if (shape.fillColor) {
          ctx.fillStyle = shape.fillColor;
        }

        if (shape.type === 'oval') {
          ctx.beginPath();
          ctx.ellipse(
            shape.x + shape.width / 2,
            shape.y + shape.height / 2,
            shape.width / 2,
            shape.height / 2,
            0,
            0,
            2 * Math.PI
          );
          if (shape.fillColor) {
            ctx.fill();
          }
          ctx.stroke();
        } else if (shape.type === 'rectangle') {
          if (shape.fillColor) {
            ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
          }
          ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        } else if (shape.type === 'circle') {
          ctx.beginPath();
          ctx.arc(shape.x, shape.y, shape.width / 2, 0, 2 * Math.PI);
          if (shape.fillColor) {
            ctx.fill();
          }
          ctx.stroke();
        }
      });
    }

    // Draw text elements
    currentTemplate.textElements.forEach((element) => {
      ctx.fillStyle = element.color;
      ctx.font = `${element.fontStyle} ${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
      ctx.textAlign = element.textAlign;
      ctx.textBaseline = 'middle';

      const lines = wrapText(ctx, element.text, element.maxWidth || canvas.width);
      const lineHeight = element.fontSize * 1.2;
      const startY = element.y - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, index) => {
        ctx.fillText(line, element.x, startY + index * lineHeight);
      });
    });
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      textElements: prev.textElements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  };

  const updateTemplateProperty = (updates: Partial<Template>) => {
    setCurrentTemplate((prev) => ({ ...prev, ...updates }));
  };

  const addTextElement = () => {
    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      text: 'New Text',
      x: currentTemplate.width / 2,
      y: currentTemplate.height / 2,
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#ffffff',
      textAlign: 'center',
    };
    setCurrentTemplate((prev) => ({
      ...prev,
      textElements: [...prev.textElements, newElement],
    }));
    setSelectedElementId(newElement.id);
  };

  const deleteTextElement = (id: string) => {
    setCurrentTemplate((prev) => ({
      ...prev,
      textElements: prev.textElements.filter((el) => el.id !== id),
    }));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const saveTemplate = () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const templateToSave: Template = {
      ...currentTemplate,
      id: `custom-${Date.now()}`,
      name: newTemplateName,
    };

    const saved = localStorage.getItem('eventTemplates');
    const savedTemplates = saved ? JSON.parse(saved) : [];
    savedTemplates.push(templateToSave);
    localStorage.setItem('eventTemplates', JSON.stringify(savedTemplates));

    setTemplates((prev) => [...prev, templateToSave]);
    setNewTemplateName('');
    setShowTemplateManager(false);
    alert('Template saved successfully!');
  };

  const loadTemplate = (template: Template) => {
    setCurrentTemplate(JSON.parse(JSON.stringify(template))); // Deep copy
    setShowTemplateManager(false);
  };

  const deleteTemplate = (id: string) => {
    if (id.startsWith('template-')) {
      alert('Cannot delete default templates');
      return;
    }

    const saved = localStorage.getItem('eventTemplates');
    if (saved) {
      const savedTemplates = JSON.parse(saved);
      const filtered = savedTemplates.filter((t: Template) => t.id !== id);
      localStorage.setItem('eventTemplates', JSON.stringify(filtered));
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'event-image.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const generateImageFile = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'event-image.png', { type: 'image/png' });
      if (onImageGenerated) {
        onImageGenerated(file);
      }
    }, 'image/png');
  };

  const selectedElement = currentTemplate.textElements.find((el) => el.id === selectedElementId);

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Event Image Generator</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplateManager(!showTemplateManager)}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Templates
            </button>
            <button
              onClick={downloadImage}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Download
            </button>
            <button
              onClick={generateImageFile}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Use Image
            </button>
          </div>
        </div>

        {/* Template Manager */}
        {showTemplateManager && (
          <div className="mb-4 p-4 bg-gray-50 rounded-md border">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Template Manager</h4>
              <button
                onClick={() => setShowTemplateManager(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {templates.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <button
                    onClick={() => loadTemplate(template)}
                    className="flex-1 text-left text-sm hover:text-blue-600"
                  >
                    {template.name}
                  </button>
                  {!template.id.startsWith('template-') && (
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={saveTemplate}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Current
              </button>
            </div>
          </div>
        )}

        {/* Canvas Preview */}
        <div className="mb-4 flex justify-center">
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
            <canvas
              ref={canvasRef}
              className="block"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>

        {/* Template Properties */}
        <div className="mb-4 p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium mb-3">Template Properties</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Background Color</label>
              <input
                type="color"
                value={currentTemplate.backgroundColor}
                onChange={(e) => updateTemplateProperty({ backgroundColor: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Width</label>
              <input
                type="number"
                value={currentTemplate.width}
                onChange={(e) => updateTemplateProperty({ width: parseInt(e.target.value) || 600 })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Height</label>
              <input
                type="number"
                value={currentTemplate.height}
                onChange={(e) => updateTemplateProperty({ height: parseInt(e.target.value) || 900 })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* Text Elements List */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Text Elements</h4>
            <button
              onClick={addTextElement}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Add Text
            </button>
          </div>
          <div className="space-y-2">
            {currentTemplate.textElements.map((element) => (
              <div
                key={element.id}
                className={`p-3 border rounded cursor-pointer ${
                  selectedElementId === element.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onClick={() => setSelectedElementId(element.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{element.text.substring(0, 30)}...</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {element.fontSize}px {element.fontFamily}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTextElement(element.id);
                    }}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Element Editor */}
        {selectedElement && (
          <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <h4 className="font-medium mb-3">Edit Text Element</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Text</label>
                <textarea
                  value={selectedElement.text}
                  onChange={(e) => updateTextElement(selectedElement.id, { text: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Font Size</label>
                <input
                  type="number"
                  value={selectedElement.fontSize}
                  onChange={(e) =>
                    updateTextElement(selectedElement.id, { fontSize: parseInt(e.target.value) || 12 })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Font Family</label>
                <select
                  value={selectedElement.fontFamily}
                  onChange={(e) => updateTextElement(selectedElement.id, { fontFamily: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Helvetica">Helvetica</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Font Weight</label>
                <select
                  value={selectedElement.fontWeight}
                  onChange={(e) => updateTextElement(selectedElement.id, { fontWeight: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="lighter">Lighter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Font Style</label>
                <select
                  value={selectedElement.fontStyle}
                  onChange={(e) => updateTextElement(selectedElement.id, { fontStyle: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Text Color</label>
                <input
                  type="color"
                  value={selectedElement.color}
                  onChange={(e) => updateTextElement(selectedElement.id, { color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">X Position</label>
                <input
                  type="number"
                  value={selectedElement.x}
                  onChange={(e) =>
                    updateTextElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Y Position</label>
                <input
                  type="number"
                  value={selectedElement.y}
                  onChange={(e) =>
                    updateTextElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Text Align</label>
                <select
                  value={selectedElement.textAlign}
                  onChange={(e) =>
                    updateTextElement(selectedElement.id, {
                      textAlign: e.target.value as 'left' | 'center' | 'right',
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Max Width (optional)</label>
                <input
                  type="number"
                  value={selectedElement.maxWidth || ''}
                  onChange={(e) =>
                    updateTextElement(selectedElement.id, {
                      maxWidth: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Auto"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
