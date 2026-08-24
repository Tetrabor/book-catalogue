import { useState, useEffect } from 'react';
import Scanner from './Scanner';
import SidebarMenu from './components/SidebarMenu';
import BookForm from './components/BookForm';
import CatalogueList from './components/CatalogueList';
import { useGoogleSync } from './hooks/useGoogleSync';
import type { SavedBook } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'add' | 'catalogue'>('add');
  const [inputMode, setInputMode] = useState<'scanner' | 'manual'>('scanner');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [scannedIsbn, setScannedIsbn] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<{ title: string; author: string; coverUrl?: string } | null>(null);

  const [catalogue, setCatalogue] = useState<SavedBook[]>(() => {
    const saved = localStorage.getItem('personal_book_catalogue');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => localStorage.setItem('personal_book_catalogue', JSON.stringify(catalogue)), [catalogue]);

  const uniqueLocations = Array.from(new Set(catalogue.map(b => b.purchaseLocation).filter(Boolean)));
  
  // Notice we added catalogue back to the arguments here!
  const { googleToken, sheetId, syncStatus, userProfile, login, handleLogout, forcePushToCloud, uploadCustomCover } = useGoogleSync(catalogue, setCatalogue);

  // NEW: The universal data wrapper
  const updateCatalogueAndSync = (newCatalogue: SavedBook[]) => {
    const newTimestamp = Date.now();
    localStorage.setItem('catalogue_last_modified', newTimestamp.toString());
    setCatalogue(newCatalogue);
    
    if (googleToken && sheetId) {
      forcePushToCloud(newCatalogue, newTimestamp);
    }
  };

  const handleSaveBook = (bookData: Omit<SavedBook, 'id' | 'dateAdded'>) => {
    const newBook = { ...bookData, id: Date.now().toString(), dateAdded: new Date().toLocaleDateString() };
    updateCatalogueAndSync([newBook, ...catalogue]);
    resetForm(); 
    setActiveTab('catalogue');
  };

  const handleUpdateBook = (updatedBook: SavedBook) => {
    const newCat = catalogue.map(b => b.id === updatedBook.id ? updatedBook : b);
    updateCatalogueAndSync(newCat);
  };

  const handleDeleteBook = (id: string) => {
    const newCat = catalogue.filter(b => b.id !== id);
    updateCatalogueAndSync(newCat);
  };

  const fetchBookDetails = async (isbn: string) => {
    setIsLoading(true); setError(null);
    try {
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const data = await response.json();
      if (data[`ISBN:${isbn}`]) {
        const item = data[`ISBN:${isbn}`];
        setSelectedBook({ title: item.title, author: item.authors ? item.authors.map((a:any) => a.name).join(', ') : 'Unknown Author', coverUrl: item.cover?.medium });
      } else setError("Book not found. Try manual search.");
    } catch (err) { setError("Network error fetching details."); } finally { setIsLoading(false); }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setError(null); setSearchResults([]);
    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await response.json();
      if (data.docs && data.docs.length > 0) setSearchResults(data.docs); else setError("No matching books found.");
    } catch (err) { setError("Network error."); } finally { setIsLoading(false); }
  };

  const selectSearchResult = (book: any) => {
    setSelectedBook({ title: book.title, author: book.author_name ? book.author_name.join(', ') : 'Unknown', coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : undefined });
    setScannedIsbn(book.isbn ? book.isbn[0] : 'N/A');
    setSearchResults([]); setSearchQuery('');
  };

  const resetForm = () => { setScannedIsbn(null); setSelectedBook(null); setError(null); setSearchResults([]); };

  const handleExportCSV = () => {
    if (catalogue.length === 0) return;
    const headers = ['Title', 'Author', 'ISBN', 'Edition', 'Print Run', 'Company', 'Wet Signed', 'Location', 'Date Added', 'Digital Signed', 'Price', 'Copies'];
    const escapeCSV = (value: any) => value == null ? '""' : `"${String(value).replace(/"/g, '""')}"`;
    const rows = catalogue.map(b => [ 
      escapeCSV(b.title), escapeCSV(b.author), escapeCSV(b.isbn), escapeCSV(b.edition), 
      escapeCSV(b.printRun), escapeCSV(b.company), escapeCSV(b.isSigned ? 'Yes' : 'No'), 
      escapeCSV(b.purchaseLocation), escapeCSV(b.dateAdded),
      escapeCSV(b.isDigitalSigned ? 'Yes' : 'No'), escapeCSV(b.purchasePrice), escapeCSV(b.copiesOwned)
    ].join(','));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' }));
    link.setAttribute('download', `book-catalogue-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <SidebarMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} userProfile={userProfile} syncStatus={syncStatus} sheetId={sheetId} googleToken={googleToken} onLogin={() => login()} onLogout={handleLogout} onExport={handleExportCSV} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd' }}>
        <button onClick={() => setIsMenuOpen(true)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '5px' }}>☰</button>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Book Catalogue</h1>
        <div style={{ width: '32px', height: '32px' }}>{userProfile && <img src={userProfile.picture} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}</div>
      </div>

      {/* NEW: Reconnect Banner if token expired */}
      {!googleToken && userProfile && (
        <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '10px', textAlign: 'center', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #ffeeba' }} onClick={() => login()}>
          <strong>Session Expired:</strong> Click here to reconnect to Google Sync.
        </div>
      )}

      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '20px' }}>
          <button onClick={() => setActiveTab('add')} style={{ flex: 1, padding: '12px', border: 'none', background: activeTab === 'add' ? '#007bff' : 'transparent', color: activeTab === 'add' ? '#fff' : '#333', fontWeight: 'bold' }}>Add Book</button>
          <button onClick={() => setActiveTab('catalogue')} style={{ flex: 1, padding: '12px', border: 'none', background: activeTab === 'catalogue' ? '#007bff' : 'transparent', color: activeTab === 'catalogue' ? '#fff' : '#333', fontWeight: 'bold' }}>My Catalogue ({catalogue.length})</button>
        </div>

        {activeTab === 'add' && (
          <div>
            {!selectedBook && (
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <button onClick={() => setInputMode(inputMode === 'scanner' ? 'manual' : 'scanner')} style={{ padding: '8px 16px', cursor: 'pointer' }}>Switch to {inputMode === 'scanner' ? 'Manual Search' : 'Barcode Scanner'}</button>
              </div>
            )}

            {!scannedIsbn && !selectedBook && (
              inputMode === 'scanner' ? (
                <div><p style={{ textAlign: 'center' }}>Scan a book's ISBN barcode</p><Scanner onScanSuccess={(isbn) => { setScannedIsbn(isbn); fetchBookDetails(isbn); }} /></div>
              ) : (
                <form onSubmit={handleManualSearch} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by Title, Author, or ISBN..." style={{ padding: '12px', fontSize: '16px' }} required />
                  <button type="submit" style={{ padding: '12px', fontSize: '16px' }}>Search Open Library</button>
                </form>
              )
            )}

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              {isLoading && <p style={{ fontWeight: 'bold' }}>Searching...</p>}
              {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
            </div>

            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                {searchResults.map((book, idx) => (
                  <div key={idx} onClick={() => selectSearchResult(book)} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#f9f9f9' }}>
                    <strong>{book.title}</strong><p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}>{book.author_name ? book.author_name.join(', ') : 'Unknown Author'}</p>
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
          <CatalogueList catalogue={catalogue} onDelete={handleDeleteBook} onUpdate={handleUpdateBook} uniqueLocations={uniqueLocations} uploadCustomCover={uploadCustomCover} />
        )}
      </div>
    </div>
  );
}