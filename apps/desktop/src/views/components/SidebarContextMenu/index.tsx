/** Human Assist — Sidebar Context Menu.

Right-click menu for session items in the sidebar.
Options: Copy Session ID, Archive, Delete.
*/

interface SidebarSession {
  id: string;
  title: string;
  status: 'active' | 'archived' | 'waiting';
  updatedAt: string;
  surfaceCount: number;
  archived?: boolean;
}

interface SidebarContextMenuProps {
  session: SidebarSession;
  onClose: () => void;
  onCopyId?: () => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function SidebarContextMenu({
  session,
  onClose,
  onCopyId,
  onArchive,
  onDelete,
}: SidebarContextMenuProps) {
  return (
    <div style={{ minWidth: 160 }}>
      <div
        style={{
          padding: '8px 12px',
          fontSize: '12px',
          color: '#888',
          borderBottom: '1px solid #2a2a3e',
          marginBottom: '4px',
          fontWeight: 600,
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {session.title || 'Untitled'}
      </div>
      <button
        style={menuButtonStyle(false)}
        onClick={() => {
          onCopyId?.();
          onClose();
        }}
        onHover={(e) => (e.currentTarget.style.background = '#2a2a3e')}
        onLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span>Copy ID</span>
      </button>
      <button
        style={menuButtonStyle(session.archived)}
        onClick={() => {
          onArchive?.(session.id);
          onClose();
        }}
        onHover={(e) => (e.currentTarget.style.background = '#2a2a3e')}
        onLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span>{session.archived ? 'Restore' : 'Archive'}</span>
      </button>
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
          onDelete?.(session.id);
          onClose();
        }}
        onHover={(e) => (e.currentTarget.style.background = '#2a2a3e')}
        onLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <span>Delete</span>
        <span style={{ color: '#f87171' }}>Delete</span>
      </button>
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
