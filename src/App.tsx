import { useState, useEffect } from 'react';
import Scanner from './Scanner';
import SidebarMenu from './components/SidebarMenu';
import BookForm from './components/BookForm';
import CatalogueList from './components/CatalogueList';
import VirtualBookshelf from './components/VirtualBookshelf';
import { useGoogleSync } from './hooks/useGoogleSync';
import type { SavedBook } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'add' | 'catalogue'>('add');
  const [inputMode, setInputMode] = useState<'scanner' | 'manual'>('scanner');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedIsbn, setScannedIsbn] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<{ title: string; author: string; coverUrl?: string } | null>(null);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);

  // RESTORED: Search state variables
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalogue, setCatalogue] = useState<SavedBook[]>(() => {
    const saved = localStorage.getItem('personal_book_catalogue');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => localStorage.setItem('personal_book_catalogue', JSON.stringify(catalogue)), [catalogue]);

  const uniqueLocations = Array.from(new Set(catalogue.map(b => b.purchaseLocation).filter(Boolean)));
  const { googleToken, sheetId, syncStatus, userProfile, login, handleLogout, forcePushToCloud, uploadCustomCover } = useGoogleSync(catalogue, setCatalogue);

  const updateCatalogueAndSync = (newCatalogue: SavedBook[]) => {
    const newTimestamp = Date.now();
    localStorage.setItem('catalogue_last_modified', newTimestamp.toString());
    setCatalogue(newCatalogue);
    if (googleToken && sheetId) forcePushToCloud(newCatalogue, newTimestamp);
  };

  const handleSaveBook = (bookData: Omit<SavedBook, 'id' | 'dateAdded'>) => {
    const newBook = { ...bookData, id: Date.now().toString(), dateAdded: new Date().toLocaleDateString() };
    updateCatalogueAndSync([newBook, ...catalogue]);
    resetForm(); setActiveTab('catalogue');
  };

  const handleUpdateBook = (updatedBook: SavedBook) => updateCatalogueAndSync(catalogue.map(b => b.id === updatedBook.id ? updatedBook : b));
  const handleDeleteBook = (id: string) => updateCatalogueAndSync(catalogue.filter(b => b.id !== id));

  const fetchBookDetails = async (isbn: string) => {
    setIsLoading(true); setError(null);
    try {
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const data = await response.json();
      if (data[`ISBN:${isbn}`]) {
        const item = data[`ISBN:${isbn}`];
        setSelectedBook({ title: item.title, author: item.authors ? item.authors.map((a:any) => a.name).join(', ') : 'Unknown Author', coverUrl: item.cover?.medium });
      } else {
        setError("Book not found. Try manual search.");
      }
    } catch (err) { 
      setError("Network error fetching details."); 
    } finally {
      setIsLoading(false);
    }
  };

  // RESTORED: Fetch up to 5 results and populate the list
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsLoading(true); 
    setError(null); 
    setSearchResults([]);
    
    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      if (data.docs && data.docs.length > 0) {
        setSearchResults(data.docs);
      } else {
        setError("No matching books found.");
      }
    } catch (err) { 
      setError("Network error."); 
    } finally {
      setIsLoading(false);
    }
  };

  // RESTORED: Allow the user to click a specific result
  const selectSearchResult = (book: any) => {
    setSelectedBook({ 
      title: book.title, 
      author: book.author_name ? book.author_name.join(', ') : 'Unknown', 
      coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : undefined 
    });
    setScannedIsbn(book.isbn ? book.isbn[0] : 'N/A');
    setSearchResults([]); 
    setSearchQuery('');
  };

  const resetForm = () => { setScannedIsbn(null); setSelectedBook(null); setSearchQuery(''); setSearchResults([]); setError(null); };

  const handleExportCSV = () => {
    if (catalogue.length === 0) return;
    const headers = ['Title', 'Author', 'ISBN', 'Edition', 'Print Run', 'Company', 'Wet Signed', 'Location', 'Date Added', 'Digital Signed', 'Price', 'Copies'];
    const escapeCSV = (value: any) => value == null ? '""' : `"${String(value).replace(/"/g, '""')}"`;
    const rows = catalogue.map(b => [ escapeCSV(b.title), escapeCSV(b.author), escapeCSV(b.isbn), escapeCSV(b.edition), escapeCSV(b.printRun), escapeCSV(b.company), escapeCSV(b.isSigned ? 'Yes' : 'No'), escapeCSV(b.purchaseLocation), escapeCSV(b.dateAdded), escapeCSV(b.isDigitalSigned ? 'Yes' : 'No'), escapeCSV(b.purchasePrice), escapeCSV(b.copiesOwned) ].join(','));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' }));
    link.setAttribute('download', `book-catalogue-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const glassStyle: React.CSSProperties = {
    backgroundColor: 'rgba(29, 42, 58, 0.80)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#ffffff'
  };

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', position: 'relative' }}>
      <VirtualBookshelf catalogue={catalogue} activeBookId={activeBookId} />
      <SidebarMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} userProfile={userProfile} syncStatus={syncStatus} sheetId={sheetId} googleToken={googleToken} onLogin={() => login()} onLogout={handleLogout} onExport={handleExportCSV} />

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 15px', backgroundColor: 'rgba(29, 42, 58, 0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
          <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px', color: '#fff' }}>☰</button>
          <h1 style={{ margin: 0, fontSize: '18px', letterSpacing: '0.5px' }}>Book Catalogue</h1>
          <div style={{ width: '30px', height: '30px' }}>{userProfile && <img src={userProfile.picture} alt="Profile" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />}</div>
        </div>

        {!googleToken && userProfile && (
          <div style={{ backgroundColor: 'rgba(33, 49, 68, 0.9)', color: '#ffc107', padding: '8px', textAlign: 'center', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)' }} onClick={() => login()}>
            <strong>Session Expired:</strong> Click here to reconnect to Google Sync.
          </div>
        )}

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', marginBottom: '20px', ...glassStyle, padding: '5px' }}>
            <button onClick={() => setActiveTab('add')} style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'add' ? '#007bff' : 'transparent', color: activeTab === 'add' ? '#fff' : '#aaa', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>Add Book</button>
            <button onClick={() => setActiveTab('catalogue')} style={{ flex: 1, padding: '10px', border: 'none', background: activeTab === 'catalogue' ? '#007bff' : 'transparent', color: activeTab === 'catalogue' ? '#fff' : '#aaa', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>My Catalogue ({catalogue.length})</button>
          </div>

          {activeTab === 'add' && (
            <div style={{ ...glassStyle, padding: '20px' }}>
              {!selectedBook && (
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <button onClick={() => setInputMode(inputMode === 'scanner' ? 'manual' : 'scanner')} style={{ padding: '8px 16px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: '#fff' }}>Switch to {inputMode === 'scanner' ? 'Manual Search' : 'Barcode Scanner'}</button>
                </div>
              )}

              {!scannedIsbn && !selectedBook && (
                inputMode === 'scanner' ? (
                  <div><p style={{ textAlign: 'center' }}>Scan a book's ISBN barcode</p><Scanner onScanSuccess={(isbn) => { setScannedIsbn(isbn); fetchBookDetails(isbn); }} /></div>
                ) : (
                  <form onSubmit={handleManualSearch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by Title, Author, or ISBN..." style={{ padding: '12px', fontSize: '16px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: '#fff' }} required />
                    <button type="submit" style={{ padding: '12px', fontSize: '16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Search Open Library</button>
                  </form>
                )
              )}

              {/* RESTORED: Loading, Error, and Search Results List */}
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                {isLoading && <p style={{ fontWeight: 'bold', color: '#4da3ff' }}>Searching...</p>}
                {error && <p style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{error}</p>}
              </div>

              {searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                  {searchResults.map((book, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => selectSearchResult(book)} 
                      style={{ 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        padding: '12px', 
                        borderRadius: '4px', 
                        cursor: 'pointer', 
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)'}
                    >
                      <strong style={{ display: 'block', marginBottom: '4px', color: '#fff' }}>{book.title}</strong>
                      <span style={{ fontSize: '14px', color: '#aaa' }}>{book.author_name ? book.author_name.join(', ') : 'Unknown Author'}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedBook && (
                <BookForm selectedBook={selectedBook} scannedIsbn={scannedIsbn} uniqueLocations={uniqueLocations} uploadCustomCover={uploadCustomCover} onSave={handleSaveBook} onCancel={resetForm} />
              )}
            </div>
          )}

          {activeTab === 'catalogue' && (
            <CatalogueList catalogue={catalogue} onDelete={handleDeleteBook} onUpdate={handleUpdateBook} uniqueLocations={uniqueLocations} uploadCustomCover={uploadCustomCover} setActiveBookId={setActiveBookId} />
          )}
        </div>
      </div>
    </div>
  );
}