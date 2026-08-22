import type { UserProfile } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  syncStatus: string;
  sheetId: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onExport: () => void;
}

export default function SidebarMenu({ isOpen, onClose, userProfile, syncStatus, sheetId, onLogin, onLogout, onExport }: SidebarProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}>
      <div style={{ width: '280px', height: '100%', backgroundColor: '#fff', boxShadow: '2px 0 5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          {userProfile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
              <img src={userProfile.picture} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{userProfile.name}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{syncStatus}</p>
              </div>
            </div>
          ) : (
            <button onClick={onLogin} style={{ padding: '12px', backgroundColor: '#4285F4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Sign in with Google
            </button>
          )}
          {sheetId && (
            <a href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`} target="_blank" rel="noopener noreferrer" style={{ padding: '12px', backgroundColor: '#e9ecef', color: '#333', textDecoration: 'none', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', display: 'block' }}>
              📄 Open Master Spreadsheet
            </a>
          )}
          <button onClick={() => { onExport(); onClose(); }} style={{ padding: '12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            📥 Export CSV Backup
          </button>
        </div>
        {userProfile && (
          <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
            <button onClick={onLogout} style={{ width: '100%', padding: '12px', backgroundColor: '#fff', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}