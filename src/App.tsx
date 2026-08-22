import { useState, useEffect } from 'react';
import Scanner from './Scanner';
import { useGoogleLogin } from '@react-oauth/google';

interface SavedBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl?: string;
  edition: string;
  printRun: string;
  company: string;
  isSigned: boolean;
  purchaseLocation: string;
  dateAdded: string;
}

interface UserProfile {
  name: string;
  picture: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'add' | 'catalogue'>('add');
  const [inputMode, setInputMode] = useState<'scanner' | 'manual'>('scanner');
  
  // Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [scannedIsbn, setScannedIsbn] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<{ title: string; author: string; coverUrl?: string } | null>(null);

  const [edition, setEdition] = useState('');
  const [printRun, setPrintRun] = useState('1st');
  const [company, setCompany] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [purchaseLocation, setPurchaseLocation] = useState('');

  // --- GOOGLE SHEETS STATE ---
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('Not Connected');

  const [catalogue, setCatalogue] = useState<SavedBook[]>(() => {
    const saved = localStorage.getItem('personal_book_catalogue');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('personal_book_catalogue', JSON.stringify(catalogue));
  }, [catalogue]);

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
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_token_expiry');
      localStorage.removeItem('google_user_profile');
    }
  }, []);

  const uniqueLocations = Array.from(new Set(catalogue.map(b => b.purchaseLocation).filter(Boolean)));

  // --- GOOGLE SSO & API LOGIC ---
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleToken(tokenResponse.access_token);
      localStorage.setItem('google_access_token', tokenResponse.access_token);
      localStorage.setItem('google_token_expiry', (Date.now() + 3300000).toString());
      
      // Fetch User Profile Data
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

  const handleLogout = () => {
    setGoogleToken(null);
    setSheetId(null);
    setUserProfile(null);
    setSyncStatus('Not Connected');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');
    localStorage.removeItem('google_sheet_id');
    localStorage.removeItem('google_user_profile');
    setIsMenuOpen(false);
  };

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
          title: row[0] || '',
          author: row[1] || '',
          isbn: row[2] || 'N/A',
          edition: row[3] || '',
          printRun: row[4] || '1st',
          company: row[5] || '',
          isSigned: row[6] === 'Yes',
          purchaseLocation: row[7] || '',
          dateAdded: row[8] || new Date().toLocaleDateString()
        }));

        setCatalogue(prevCatalogue => {
          const merged = [...prevCatalogue];
          fetchedBooks.forEach(cloudBook => {
            const alreadyExists = merged.some(localBook => localBook.title === cloudBook.title && localBook.isbn === cloudBook.isbn);
            if (!alreadyExists) {
              merged.push(cloudBook);
            }
          });
          return merged;
        });
      }
    } catch (err) {
      console.error("Failed to pull from Google Sheets", err);
    }
  };

  const appendToGoogleSheet = async (book: SavedBook) => {
    if (!googleToken || !sheetId) return;
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:I1:append?valueInputOption=USER_ENTERED`, {
        method: "POST",
        headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          values: [[
            book.title, book.author, book.isbn, book.edition, 
            book.printRun, book.company, book.isSigned ? "Yes" : "No", 
            book.purchaseLocation, book.dateAdded
          ]]
        })
      });
    } catch (err) {
      console.error("Failed to append to Google Sheets", err);
    }
  };

  const updateCloudCatalogue = async (updatedCatalogue: SavedBook[]) => {
    if (!googleToken || !sheetId) return;
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A2:I:clear`, {
        method: "POST",
        headers: { Authorization: `Bearer ${googleToken}` }
      });

      if (updatedCatalogue.length > 0) {
        const values = updatedCatalogue.map(book => [
          book.title, book.author, book.isbn, book.edition, 
          book.printRun, book.company, book.isSigned ? "Yes" : "No", 
          book.purchaseLocation, book.dateAdded
        ]);

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A2:I?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values })
        });
      }
    } catch (err) {
      console.error("Failed to update Google Sheets deletion", err);
    }
  };

  // --- OPEN LIBRARY API ---
  const fetchBookDetails = async (isbn: string) => {
    setIsLoading(true); setError(null);
    try {
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const data = await response.json();
      const bookKey = `ISBN:${isbn}`;
      if (data[bookKey]) {
        const item = data[bookKey];
        setSelectedBook({
          title: item.title,
          author: item.authors ? item.authors.map((a: any) => a.name).join(', ') : 'Unknown Author',
          coverUrl: item.cover?.medium
        });
        if (item.publishers && item.publishers.length > 0) setCompany(item.publishers[0].name);
      } else setError("Book not found in Open Library. Try manual search.");
    } catch (err) { setError("Network error fetching book details."); } 
    finally { setIsLoading(false); }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setError(null); setSearchResults([]);
    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      if (data.docs && data.docs.length > 0) setSearchResults(data.docs);
      else setError("No matching books found.");
    } catch (err) { setError("Network error during search."); } 
    finally { setIsLoading(false); }
  };

  const selectSearchResult = (book: any) => {
    setSelectedBook({
      title: book.title,
      author: book.author_name ? book.author_name.join(', ') : 'Unknown Author',
      coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : undefined
    });
    setScannedIsbn(book.isbn ? book.isbn[0] : 'N/A');
    if (book.publisher && book.publisher.length > 0) setCompany(book.publisher[0]);
    setSearchResults([]); setSearchQuery('');
  };

  const handleScan = (isbn: string) => {
    setScannedIsbn(isbn);
    fetchBookDetails(isbn);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;

    const newBook: SavedBook = {
      id: Date.now().toString(),
      title: selectedBook.title,
      author: selectedBook.author,
      isbn: scannedIsbn || 'N/A',
      coverUrl: selectedBook.coverUrl,
      edition,
      printRun,
      company,
      isSigned,
      purchaseLocation,
      dateAdded: new Date().toLocaleDateString()
    };

    setCatalogue([newBook, ...catalogue]);
    
    if (googleToken && sheetId) {
      await appendToGoogleSheet(newBook);
    }

    resetForm();
    setActiveTab('catalogue');
  };

  const deleteBook = async (id: string) => {
    const updatedCatalogue = catalogue.filter(b => b.id !== id);
    setCatalogue(updatedCatalogue);
    
    if (googleToken && sheetId) {
      setSyncStatus('Syncing deletion...');
      await updateCloudCatalogue(updatedCatalogue);
      setSyncStatus('Connected & Synced ✓');
    }
  };

  const handleExportCSV = () => {
    if (catalogue.length === 0) return;
    const headers = ['Title', 'Author', 'ISBN', 'Edition', 'Print Run', 'Company', 'Signed', 'Location', 'Date Added'];
    const escapeCSV = (value: string | boolean | undefined) => {
      if (value === null || value === undefined) return '""';
      return `"${String(value).replace(/"/g, '""')}"`;
    };
    const rows = catalogue.map(book => [
      escapeCSV(book.title), escapeCSV(book.author), escapeCSV(book.isbn), escapeCSV(book.edition),
      escapeCSV(book.printRun), escapeCSV(book.company), escapeCSV(book.isSigned ? 'Yes' : 'No'),
      escapeCSV(book.purchaseLocation), escapeCSV(book.dateAdded)
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `book-catalogue-backup-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsMenuOpen(false); // Close menu after exporting
  };

  const resetForm = () => {
    setScannedIsbn(null); setSelectedBook(null); setEdition('');
    setPrintRun('1st'); setCompany(''); setIsSigned(false);
    setPurchaseLocation(''); setError(null); setSearchResults([]);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
      
      {/* HEADER & NAVIGATION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd' }}>
        
        {/* Left Side: Hamburger Icon */}
        <button 
          onClick={() => setIsMenuOpen(true)}
          style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '5px' }}
        >
          ☰
        </button>

        {/* Center: Title */}
        <h1 style={{ margin: 0, fontSize: '20px' }}>Book Catalogue</h1>

        {/* Right Side: Avatar placeholder to keep title centered */}
        <div style={{ width: '32px', height: '32px' }}>
          {userProfile && (
             <img 
               src={userProfile.picture} 
               alt="Profile" 
               style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
             />
          )}
        </div>
      </div>

      {/* SLIDE-OUT MENU OVERLAY */}
      {isMenuOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 
        }}>
          <div style={{ 
            width: '280px', height: '100%', backgroundColor: '#fff', 
            boxShadow: '2px 0 5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' 
          }}>
            {/* Menu Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Settings</h2>
              <button onClick={() => setIsMenuOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Menu Items */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              
              {/* Login / Profile Section */}
              {userProfile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                  <img src={userProfile.picture} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{userProfile.name}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{syncStatus}</p>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => handleGoogleLogin()} 
                  style={{ padding: '12px', backgroundColor: '#4285F4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Sign in with Google
                </button>
              )}

              {/* View Sheets Link */}
              {sheetId && (
                 <a 
                   href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   style={{ padding: '12px', backgroundColor: '#e9ecef', color: '#333', textDecoration: 'none', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', display: 'block' }}
                 >
                   📄 Open Master Spreadsheet
                 </a>
              )}

              {/* Export CSV Button */}
              <button 
                onClick={handleExportCSV}
                style={{ padding: '12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                📥 Export CSV Backup
              </button>
              
            </div>

            {/* Logout Button at Bottom */}
            {userProfile && (
              <div style={{ padding: '20px', borderTop: '1px solid #eee' }}>
                <button 
                  onClick={handleLogout}
                  style={{ width: '100%', padding: '12px', backgroundColor: '#fff', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '20px' }}>
          <button onClick={() => setActiveTab('add')} style={{ flex: 1, padding: '12px', border: 'none', background: activeTab === 'add' ? '#007bff' : 'transparent', color: activeTab === 'add' ? '#fff' : '#333', fontWeight: 'bold', cursor: 'pointer' }}>Add Book</button>
          <button onClick={() => setActiveTab('catalogue')} style={{ flex: 1, padding: '12px', border: 'none', background: activeTab === 'catalogue' ? '#007bff' : 'transparent', color: activeTab === 'catalogue' ? '#fff' : '#333', fontWeight: 'bold', cursor: 'pointer' }}>My Catalogue ({catalogue.length})</button>
        </div>

        {activeTab === 'add' && (
          <div>
            {!selectedBook && (
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <button onClick={() => setInputMode(inputMode === 'scanner' ? 'manual' : 'scanner')} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                  Switch to {inputMode === 'scanner' ? 'Manual Search' : 'Barcode Scanner'}
                </button>
              </div>
            )}

            {!scannedIsbn && !selectedBook && (
              <div>
                {inputMode === 'scanner' ? (
                  <div>
                    <p style={{ textAlign: 'center' }}>Scan a book's ISBN barcode</p>
                    <Scanner onScanSuccess={handleScan} />
                  </div>
                ) : (
                  <form onSubmit={handleManualSearch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by Title, Author, or ISBN..." style={{ padding: '12px', fontSize: '16px' }} required />
                    <button type="submit" style={{ padding: '12px', fontSize: '16px', cursor: 'pointer' }}>Search Open Library</button>
                  </form>
                )}
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              {isLoading && <p style={{ fontWeight: 'bold' }}>Searching database...</p>}
              {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
            </div>

            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <h3>Select your book:</h3>
                {searchResults.map((book, idx) => (
                  <div key={idx} onClick={() => selectSearchResult(book)} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#f9f9f9' }}>
                    <strong>{book.title}</strong>
                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}>{book.author_name ? book.author_name.join(', ') : 'Unknown Author'}</p>
                  </div>
                ))}
              </div>
            )}

            {selectedBook && (
              <form onSubmit={handleSaveBook} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  {selectedBook.coverUrl && <img src={selectedBook.coverUrl} alt="Cover" style={{ height: '90px', borderRadius: '4px' }} />}
                  <div>
                    <h3 style={{ margin: 0 }}>{selectedBook.title}</h3>
                    <p style={{ margin: '5px 0', color: '#666' }}>{selectedBook.author}</p>
                    <small style={{ color: '#888' }}>ISBN: {scannedIsbn}</small>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #eee', width: '100%' }} />

                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Edition:</label>
                  <input type="text" placeholder="e.g. Deluxe Illustrated Edition" value={edition} onChange={(e) => setEdition(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Print Run:</label>
                  <select value={printRun} onChange={(e) => setPrintRun(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                    <option value="1st">1st Printing</option>
                    <option value="2nd">2nd Printing</option>
                    <option value="3rd">3rd Printing</option>
                    <option value="4th+">4th+ Printing</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Company / Publisher:</label>
                  <input type="text" placeholder="e.g. Penguin" value={company} onChange={(e) => setCompany(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Purchase Location:</label>
                  <input type="text" list="locations-list" placeholder="e.g. Powell's Books" value={purchaseLocation} onChange={(e) => setPurchaseLocation(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
                  <datalist id="locations-list">{uniqueLocations.map((loc, i) => <option key={i} value={loc} />)}</datalist>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="signed" checked={isSigned} onChange={(e) => setIsSigned(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                  <label htmlFor="signed" style={{ fontWeight: 'bold', cursor: 'pointer' }}>Wet Print Signature</label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" style={{ flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save to Catalogue</button>
                  <button type="button" onClick={resetForm} style={{ padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'catalogue' && (
          <div>
            {catalogue.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>Your catalogue is empty.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {catalogue.map((book) => {
                  const ebayQuery = `${book.title} ${book.edition} ${book.printRun} printing`.trim();
                  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(ebayQuery)}`;

                  return (
                    <div key={book.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff' }}>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        {book.coverUrl ? (
                          <img src={book.coverUrl} alt="Cover" style={{ height: '100px', borderRadius: '4px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '70px', height: '100px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', color: '#aaa', fontSize: '12px' }}>No Cover</div>
                        )}
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: '0 0 5px 0' }}>{book.title}</h3>
                          <p style={{ margin: '0 0 5px 0', color: '#555' }}>{book.author}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
                            {book.edition && <span style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{book.edition}</span>}
                            <span style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{book.printRun} Print</span>
                            {book.company && <span style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{book.company}</span>}
                            {book.isSigned && <span style={{ background: '#d4edda', color: '#155724', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Signed ✓</span>}
                          </div>
                          {book.purchaseLocation && <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}><strong>Location:</strong> {book.purchaseLocation}</p>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
                        <a href={ebayUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '6px 12px', background: '#e53238', color: '#fff', textDecoration: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>Search on eBay ↗</a>
                        <button onClick={() => deleteBook(book.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}