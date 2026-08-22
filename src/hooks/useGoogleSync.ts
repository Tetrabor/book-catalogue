import { useState, useEffect } from 'react';
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

  // Restore session on load
  useEffect(() => {
    const savedToken = localStorage.getItem('google_access_token');
    const tokenExpiry = localStorage.getItem('google_token_expiry');
    const savedSheetId = localStorage.getItem('google_sheet_id');
    const savedProfile = localStorage.getItem('google_user_profile');

    if (savedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      setGoogleToken(savedToken);
      if (savedProfile) setUserProfile(JSON.parse(savedProfile));
      
      if (savedSheetId) {
        setSheetId(savedSheetId);
        setSyncStatus('Connected & Synced ✓');
        pullFromGoogleSheet(savedToken, savedSheetId);
      }
    } else {
      handleLogout();
    }
  }, []);

  const handleLogout = () => {
    setGoogleToken(null); setSheetId(null); setUserProfile(null);
    setSyncStatus('Not Connected');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_sheet_id');
    localStorage.removeItem('google_user_profile');
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

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${currentSheetId}/values/Sheet1!A1:I1?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            values: [["Title", "Author", "ISBN", "Edition", "Print Run", "Company", "Signed", "Location", "Date Added"]]
          })
        });
      }
      setSheetId(currentSheetId);
      localStorage.setItem('google_sheet_id', currentSheetId);
      setSyncStatus('Connected & Synced ✓');
      await pullFromGoogleSheet(token, currentSheetId);
    } catch (err) {
      console.error(err);
      setSyncStatus('Connection Error');
    }
  };

  const pullFromGoogleSheet = async (token: string, currentSheetId: string) => {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${currentSheetId}/values/Sheet1!A2:I`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.values) {
        const fetchedBooks: SavedBook[] = data.values.map((row: any[], index: number) => ({
          id: `google-${Date.now()}-${index}`,
          title: row[0] || '', author: row[1] || '', isbn: row[2] || 'N/A',
          edition: row[3] || '', printRun: row[4] || '1st', company: row[5] || '',
          isSigned: row[6] === 'Yes', purchaseLocation: row[7] || '',
          dateAdded: row[8] || new Date().toLocaleDateString()
        }));

        setCatalogue(prevCatalogue => {
          const merged = [...prevCatalogue];
          fetchedBooks.forEach(cloudBook => {
            const alreadyExists = merged.some(localBook => localBook.title === cloudBook.title && localBook.isbn === cloudBook.isbn);
            if (!alreadyExists) merged.push(cloudBook);
          });
          return merged;
        });
      }
    } catch (err) { console.error("Failed to pull from Google Sheets", err); }
  };

  const appendToCloud = async (book: SavedBook) => {
    if (!googleToken || !sheetId) return;
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:I1:append?valueInputOption=USER_ENTERED`, {
        method: "POST",
        headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [[ book.title, book.author, book.isbn, book.edition, book.printRun, book.company, book.isSigned ? "Yes" : "No", book.purchaseLocation, book.dateAdded ]]
        })
      });
    } catch (err) { console.error("Failed to append", err); }
  };

  const deleteFromCloud = async (updatedCatalogue: SavedBook[]) => {
    if (!googleToken || !sheetId) return;
    try {
      setSyncStatus('Syncing deletion...');
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A2:I:clear`, {
        method: "POST", headers: { Authorization: `Bearer ${googleToken}` }
      });
      if (updatedCatalogue.length > 0) {
        const values = updatedCatalogue.map(book => [
          book.title, book.author, book.isbn, book.edition, book.printRun, book.company, book.isSigned ? "Yes" : "No", book.purchaseLocation, book.dateAdded
        ]);
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A2:I?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values })
        });
      }
      setSyncStatus('Connected & Synced ✓');
    } catch (err) { console.error("Failed deletion sync", err); }
  };

  return { googleToken, sheetId, syncStatus, userProfile, login, handleLogout, appendToCloud, deleteFromCloud };
}