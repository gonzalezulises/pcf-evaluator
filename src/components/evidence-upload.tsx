'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, Image, File, Loader2 } from 'lucide-react';

interface EvidenceFile {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  blob_url: string;
  uploaded_by_name: string;
  created_at: string;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  'application/pdf': FileText,
  'image/jpeg': Image,
  'image/png': Image,
  'image/webp': Image,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceUpload({
  entryId,
  readOnly = false,
}: {
  entryId: number;
  readOnly?: boolean;
}) {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/evidence?entry_id=${entryId}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch {
      // Silently fail for file listing
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entry_id', String(entryId));

      const res = await fetch('/api/evidence', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al subir archivo');
        return;
      }

      await fetchFiles();
    } catch {
      setError('Error de conexión al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (evidenceId: number) => {
    try {
      const res = await fetch(`/api/evidence/${evidenceId}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== evidenceId));
      }
    } catch {
      setError('Error al eliminar archivo');
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) uploadFile(droppedFile);
    },
    [entryId]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) uploadFile(selectedFile);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground py-2">Cargando archivos...</div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      {!readOnly && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
          }`}
          onClick={() => document.getElementById(`file-input-${entryId}`)?.click()}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Subiendo...
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Arrastra un archivo o haz clic
              </p>
              <p className="text-xs text-muted-foreground/60">
                PDF, imágenes, Office, CSV — máx 10MB
              </p>
            </div>
          )}
          <input
            id={`file-input-${entryId}`}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx,.txt,.csv"
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => {
            const Icon = FILE_ICONS[file.file_type] || File;
            return (
              <div
                key={file.id}
                className="flex items-center gap-2 p-2 rounded border text-sm group"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={file.blob_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate hover:underline text-xs"
                  title={file.file_name}
                >
                  {file.file_name}
                </a>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatFileSize(file.file_size)}
                </span>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => deleteFile(file.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {files.length === 0 && !readOnly && (
        <p className="text-xs text-muted-foreground">Sin archivos de evidencia</p>
      )}
    </div>
  );
}
