/** Human Assist — Drag & Drop.

Handles file attachments (desktop → composer) and surface reordering.
Uses the HTML5 Drag API with a custom drop zone overlay.

Usage:
  const { dragState, handleDragStart, handleDragEnd } = useDragAndDrop({
    onDropFiles: (files) => console.log(files),
    onDropItems: (ids) => console.log(ids),
  })
*/

import { useState, useCallback, useEffect, useRef } from 'react';

// ── Drop Zone ───────────────────────────────────────────────────────────────

interface DropZoneState {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useDropZone(options?: {
  onDropFiles?: (files: FileList) => void;
  onDropUrls?: (urls: string[]) => void;
  onDropText?: (text: string) => void;
}) {
  const [dragState, setDragState] = useState<DropZoneState>({
    active: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer?.dropEffect;

      // Show drop zone when dragging over window
      if (!dragState.active) {
        setDragState({
          active: true,
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragState((prev) => ({ ...prev, active: false }));

      // Files (image, text, etc.)
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        optionsRef.current?.onDropFiles?.(e.dataTransfer.files);
        return;
      }

      // URLs
      const urls = e.dataTransfer?.getData('text/uri-list')?.split('\n') || [];
      const validUrls = urls.filter((u) => u.trim().length > 0);
      if (validUrls.length > 0) {
        optionsRef.current?.onDropUrls?.(validUrls);
        return;
      }

      // Plain text
      const text = e.dataTransfer?.getData('text/plain');
      if (text) {
        optionsRef.current?.onDropText?.(text);
      }
    };

    const handleDragEnd = () => {
      setDragState((prev) => ({ ...prev, active: false }));
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragend', handleDragEnd);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  return dragState;
}

// ── Render ──────────────────────────────────────────────────────────────────

export function DropZoneOverlay({
  state,
  onDismiss,
}: {
  state: DropZoneState;
  onDismiss: () => void;
}) {
  if (!state.active) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(108, 99, 255, 0.08)',
        border: '2px dashed #6c63ff',
        borderRadius: '8px',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        backdropFilter: 'blur(4px)',
      }}
      onPointerDown={onDismiss}
    >
      <div
        style={{
          background: '#1e1e2e',
          padding: '20px 40px',
          borderRadius: '12px',
          border: '1px solid #333',
          color: '#ddd',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          fontSize: '16px',
          fontWeight: 600,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
        }}
      >
        Drop files or text here
      </div>
    </div>
  );
}

// ── Composer File Drop ──────────────────────────────────────────────────────

interface ComposerDropTargetProps {
  onFilesSelected: (files: File[]) => void;
}

export function ComposerDropTarget({ onFilesSelected }: ComposerDropTargetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only leave if we're actually leaving the element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesSelected(Array.from(e.dataTransfer.files));
      }
    },
    [onFilesSelected],
  );

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(Array.from(e.target.files));
      }
      e.target.value = '';
    },
    [onFilesSelected],
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <button
          style={{
            background: isDragging ? 'var(--ha-primary)' : 'var(--ha-titlebar-bg)',
            border: isDragging
              ? '1px solid var(--ha-primary)'
              : '1px solid oklch(0.371 0 0)',
            borderRadius: '6px',
            color: '#ddd',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={handleBrowse}
          onMouseEnter={(e) => {
            if (!isDragging) {
              e.currentTarget.style.background = '#3a3a4e';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDragging) {
              e.currentTarget.style.background = 'var(--ha-titlebar-bg)';
            }
          }}
        >
          📎 Attach
        </button>
        {isDragging && (
          <span style={{ fontSize: '12px', color: 'var(--ha-primary)' }}>
            Drop files here
          </span>
        )}
      </div>
    </>
  );
}
