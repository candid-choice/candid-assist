/** Human Assist — Surface Context Menu.

Right-click menu for surface items (sidebar or surface frame).
Options: Close, Copy Content, Download.
*/

import type { SurfaceType } from '../../types';

interface SurfaceContextMenuProps {
  onClose: () => void;
  surfaceId: string;
  surfaceType: SurfaceType;
  title: string;
  content?: string;
  onCloseSurface?: (id: string) => void;
  onCopyContent?: (content: string) => void;
  onDownload?: (id: string) => void;
}

export function SurfaceContextMenu({
  onClose,
  surfaceId,
  surfaceType,
  title,
  content,
  onCloseSurface,
  onCopyContent,
  onDownload,
}: SurfaceContextMenuProps) {
  const canCopy = !!content;
  const canDownload = ['browser', 'canvas', 'image', 'screen', 'code-diff'].includes(
    surfaceType,
  );

  return (
    <div style={{ minWidth: 180 }}>
      <div
        style={{
          padding: '8px 12px',
          fontSize: '12px',
          color: '#888',
          borderBottom: '1px solid #2a2a3e',
          marginBottom: '4px',
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      <button
        style={menuButtonStyle(false)}
        onClick={() => {
          onCloseSurface?.(surfaceId);
          onClose();
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = '#2a2a3e';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = 'transparent';
        }}
      >
        <span>Close Surface</span>
        <span style={{ color: '#666', fontSize: '11px' }}>⌘+W</span>
      </button>
      {canCopy && (
        <>
          <div
            style={{
              height: '1px',
              background: '#2a2a3e',
              margin: '4px 12px',
            }}
          />
          <button
            style={menuButtonStyle(false)}
            onClick={() => {
              onCopyContent?.(content || '');
              onClose();
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#2a2a3e';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <span>Copy Content</span>
          </button>
        </>
      )}
      {canDownload && (
        <>
          <div
            style={{
              height: '1px',
              background: '#2a2a3e',
              margin: '4px 12px',
            }}
          />
          <button
            style={menuButtonStyle(false)}
            onClick={() => {
              onDownload?.(surfaceId);
              onClose();
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#2a2a3e';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <span>Download</span>
          </button>
        </>
      )}
    </div>
  );
}

const menuButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 12px',
  background: disabled ? 'transparent' : 'transparent',
  border: 'none',
  borderRadius: '4px',
  color: disabled ? '#555' : '#ddd',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '13px',
  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  textAlign: 'left',
});
