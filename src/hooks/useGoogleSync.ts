import { useState, useEffect, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import type { SavedBook, UserProfile } from '../types';

export function useGoogleSync(
  catalogue: SavedBook[],
  setCatalogue: React.Dispatch<React.SetStateAction<SavedBook[]>>
) {
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('Not Connected');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // We use a ref to ensure our sync functions always see the absolute latest catalogue state
  const catRef = useRef<SavedBook[]>(catalogue);
  useEffect(() => { catRef.current = catalogue; }, [catalogue]);

  useEffect(() => {
    const savedToken = localStorage.getItem('google_access_token');
    const tokenExpiry = localStorage.getItem('google_token_expiry');
    const savedSheetId = localStorage.getItem('google_sheet_id');
    const savedProfile = localStorage.getItem('google_user_profile');

    if (savedProfile) setUserProfile(JSON.parse(savedProfile));
    if (savedSheetId) setSheetId(savedSheetId);

    if (savedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      setGoogleToken(savedToken);
      if (savedSheetId) runSmartSync(savedToken, savedSheetId);
    } else if (savedProfile) {
      // UX FIX: Token expired, but keep the profile visually loaded!
      setGoogleToken(null);
      setSyncStatus('Session Expired');
    }
  }, []);

  const handleLogout = () => {
    setGoogleToken(null); setSheetId(null); setUserProfile(null);
    setSyncStatus('Not Connected');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_sheet_id');
    localStorage.removeItem('google_user_profile');
    localStorage.removeItem('catalogue_last_modified');
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleToken(tokenResponse.access_token);
      localStorage.setItem('google_access_token', tokenResponse.access_token);
      localStorage.setItem('google_token_expiry', (Date.now() + 3300000).toString());
      
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();
        setUserProfile({ name: userInfo.name, picture: userInfo.picture });
        localStorage.setItem('google_user_profile', JSON.stringify({ name: userInfo.name, picture: userInfo.picture }));
      } catch (err) {
        console.error("Failed to fetch user profile", err);
      }

      setSyncStatus('Connecting to Drive...');
      await initializeGoogleSheet(tokenResponse.access_token);
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile',
  });

  const initializeGoogleSheet = async (token: string) => {
    try {
      const searchRes = await fetch("https://www.googleapis.com/drive/v3/files?q=name='My Book Catalogue' and trashed=false", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const searchData = await searchRes.json();
      let currentSheetId = '';

      if (searchData.files && searchData.files.length > 0) {
        currentSheetId = searchData.files[0].id;
      } else {
        setSyncStatus('Creating new spreadsheet...');
        const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ properties: { title: "My Book Catalogue" } })
        });
        const createData = await createRes.json();
        currentSheetId = createData.spreadsheetId;

        // Note: Adding LastModified and the Timestamp to M1 and N1
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${currentSheetId}/values/Sheet1!A1:N1?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            values: [["Title", "Author", "ISBN", "Edition", "Print Run", "Company", "Wet Signed", "Location", "Date Added", "Digital Signed", "Price", "Copies", "LastModified", Date.now().toString()]]
          })
        });
      }
      setSheetId(currentSheetId);
      localStorage.setItem('google_sheet_id', currentSheetId);
      await runSmartSync(token, currentSheetId);
    } catch (err) {
      console.error(err);
      setSyncStatus('Connection Error');
    }
  };

  const runSmartSync = async (token: string, sheet: string) => {
    setSyncStatus('Syncing devices...');
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet}/values/Sheet1!A1:N`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();

      const cloudTs = (data.values && data.values[0] && data.values[0][13]) ? parseInt(data.values[0][13]) : 0;
      const localTs = parseInt(localStorage.getItem('catalogue_last_modified') || '0');

      if (cloudTs > localTs) {
        // CLOUD IS NEWER -> Overwrite Local
        if (data.values && data.values.length > 1) {
          const fetchedBooks: SavedBook[] = data.values.slice(1).map((row: any[], index: number) => ({
            id: `google-${cloudTs}-${index}`, 
            title: row[0] || '', author: row[1] || '', isbn: row[2] || 'N/A',
            edition: row[3] || '', printRun: row[4] || '1st', company: row[5] || '',
            isSigned: row[6] === 'Yes', purchaseLocation: row[7] || '',
            dateAdded: row[8] || new Date().toLocaleDateString(),
            isDigitalSigned: row[9] === 'Yes',
            purchasePrice: row[10] || '',
            copiesOwned: parseInt(row[11]) || 1
          }));
          setCatalogue(fetchedBooks);
        } else {
          setCatalogue([]);
        }
        localStorage.setItem('catalogue_last_modified', cloudTs.toString());
        setSyncStatus('Connected & Synced ✓');

      } else if (localTs > cloudTs) {
        // LOCAL IS NEWER -> Overwrite Cloud
        await forcePushToCloud(catRef.current, localTs, token, sheet);
      } else {
        // Perfect Sync
        setSyncStatus('Connected & Synced ✓');
      }
    } catch (err) {
      console.error("Smart Sync Failed", err);
      setSyncStatus('Sync Error');
    }
  };

  const forcePushToCloud = async (cat: SavedBook[], ts: number, tokenOverride?: string, sheetOverride?: string) => {
    const activeToken = tokenOverride || googleToken;
    const activeSheet = sheetOverride || sheetId;
    
    if (!activeToken || !activeSheet) return;
    setSyncStatus('Saving to cloud...');
    
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${activeSheet}/values/Sheet1!A1:N:clear`, { 
        method: "POST", headers: { Authorization: `Bearer ${activeToken}` } 
      });

      const headers = ["Title", "Author", "ISBN", "Edition", "Print Run", "Company", "Wet Signed", "Location", "Date Added", "Digital Signed", "Price", "Copies", "LastModified", ts.toString()];
      const values = [headers];

      cat.forEach(book => {
        values.push([
          book.title, book.author, book.isbn, book.edition, book.printRun, book.company, 
          book.isSigned ? "Yes" : "No", book.purchaseLocation, book.dateAdded,
          book.isDigitalSigned ? "Yes" : "No", book.purchasePrice, book.copiesOwned.toString()
        ]);
      });

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${activeSheet}/values/Sheet1!A1:N?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${activeToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values })
      });
      
      setSyncStatus('Connected & Synced ✓');
    } catch (err) {
      console.error(err);
      setSyncStatus('Sync Error');
    }
  };

  const getOrCreateCoversFolder = async () => {
    if (!googleToken) return null;
    try {
      const searchRes = await fetch("https://www.googleapis.com/drive/v3/files?q=name='Book Catalogue Covers' and mimeType='application/vnd.google-apps.folder' and trashed=false", {
        headers: { Authorization: `Bearer ${googleToken}` }
      });
      const searchData = await searchRes.json();
      
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
      
      const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Book Catalogue Covers",
          mimeType: "application/vnd.google-apps.folder"
        })
      });
      const createData = await createRes.json();
      const folderId = createData.id;

      await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "anyone", role: "reader" })
      });

      return folderId;
    } catch (err) {
      console.error("Failed to setup covers folder", err);
      return null;
    }
  };

  const uploadCustomCover = async (file: File): Promise<string | null> => {
    if (!googleToken) return null;
    
    setSyncStatus('Uploading cover image...');
    const folderId = await getOrCreateCoversFolder();
    if (!folderId) return null;

    try {
      const metadata = {
        name: `cover_${Date.now()}_${file.name}`,
        parents: [folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink", {
        method: "POST",
        headers: { Authorization: `Bearer ${googleToken}` }, 
        body: form
      });
      
      const uploadData = await uploadRes.json();
      setSyncStatus('Connected & Synced ✓');
      
      return uploadData.webContentLink; 
    } catch (err) {
      console.error("Failed to upload custom cover", err);
      setSyncStatus('Upload Error');
      return null;
    }
  };

  return { googleToken, sheetId, syncStatus, userProfile, login, handleLogout, forcePushToCloud, uploadCustomCover, getOrCreateCoversFolder };
}