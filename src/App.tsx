import { useState, useEffect } from 'react';
import Scanner from './Scanner';

// 1. Data model for a saved book entry
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

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'add' | 'catalogue'>('add');
  const [inputMode, setInputMode] = useState<'scanner' | 'manual'>('scanner');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [scannedIsbn, setScannedIsbn] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Book Base Data
  const [selectedBook, setSelectedBook] = useState<{ title: string; author: string; coverUrl?: string } | null>(null);

  // Custom Form Fields State
  const [edition, setEdition] = useState('');
  const [printRun, setPrintRun] = useState('1st');
  const [company, setCompany] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [purchaseLocation, setPurchaseLocation] = useState('');

  // Permanent Storage State
  const [catalogue, setCatalogue] = useState<SavedBook[]>(() => {
    const saved = localStorage.getItem('personal_book_catalogue');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to LocalStorage whenever the catalogue changes
  useEffect(() => {
    localStorage.setItem('personal_book_catalogue', JSON.stringify(catalogue));
  }, [catalogue]);

  const uniqueLocations = Array.from(new Set(catalogue.map(b => b.purchaseLocation).filter(Boolean)));

  // --- NEW FEATURE: CSV Export ---
  const handleExportCSV = () => {
    if (catalogue.length === 0) return;

    // 1. Define the spreadsheet headers
    const headers = ['Title', 'Author', 'ISBN', 'Edition', 'Print Run', 'Company', 'Signed', 'Location', 'Date Added'];

    // 2. Helper function to escape commas and quotes inside text fields
    const escapeCSV = (value: string | boolean | undefined) => {
      if (value === null || value === undefined) return '""';
      const strValue = String(value);
      // Double up any existing quotes to escape them, then wrap the whole string in quotes
      return `"${strValue.replace(/"/g, '""')}"`;
    };

    // 3. Convert catalogue data into CSV rows
    const rows = catalogue.map(book => [
      escapeCSV(book.title),
      escapeCSV(book.author),
      escapeCSV(book.isbn),
      escapeCSV(book.edition),
      escapeCSV(book.printRun),
      escapeCSV(book.company),
      escapeCSV(book.isSigned ? 'Yes' : 'No'),
      escapeCSV(book.purchaseLocation),
      escapeCSV(book.dateAdded)
    ].join(','));

    // 4. Combine headers and rows with newlines
    const csvContent = [headers.join(','), ...rows].join('\n');

    // 5. Create a downloadable file in the browser
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 6. Trigger the download invisibly
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `book-catalogue-backup-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchBookDetails = async (isbn: string) => {
    setIsLoading(true);
    setError(null);
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
        if (item.publishers && item.publishers.length > 0) {
          setCompany(item.publishers[0].name);
        }
      } else {
        setError("Book not found in Open Library. Try manual search.");
      }
    } catch (err) {
      setError("Network error fetching book details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError("Network error during search.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectSearchResult = (book: any) => {
    setSelectedBook({
      title: book.title,
      author: book.author_name ? book.author_name.join(', ') : 'Unknown Author',
      coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : undefined
    });
    setScannedIsbn(book.isbn ? book.isbn[0] : 'N/A');
    if (book.publisher && book.publisher.length > 0) {
      setCompany(book.publisher[0]);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleScan = (isbn: string) => {
    setScannedIsbn(isbn);
    fetchBookDetails(isbn);
  };

  const handleSaveBook = (e: React.FormEvent) => {
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
    resetForm();
    setActiveTab('catalogue');
  };

  const resetForm = () => {
    setScannedIsbn(null);
    setSelectedBook(null);
    setEdition('');
    setPrintRun('1st');
    setCompany('');
    setIsSigned(false);
    setPurchaseLocation('');
    setError(null);
    setSearchResults([]);
  };

  const deleteBook = (id: string) => {
    setCatalogue(catalogue.filter(b => b.id !== id));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>Book Catalogue</h1>

      <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('add')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: activeTab === 'add' ? '#007bff' : 'transparent',
            color: activeTab === 'add' ? '#fff' : '#333',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Add Book
        </button>
        <button
          onClick={() => setActiveTab('catalogue')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: activeTab === 'catalogue' ? '#007bff' : 'transparent',
            color: activeTab === 'catalogue' ? '#fff' : '#333',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          My Catalogue ({catalogue.length})
        </button>
      </div>

      {activeTab === 'add' && (
        <div>
          {!selectedBook && (
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <button
                onClick={() => setInputMode(inputMode === 'scanner' ? 'manual' : 'scanner')}
                style={{ padding: '8px 16px', cursor: 'pointer' }}
              >
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
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Title, Author, or ISBN..."
                    style={{ padding: '12px', fontSize: '16px' }}
                    required
                  />
                  <button type="submit" style={{ padding: '12px', fontSize: '16px', cursor: 'pointer' }}>
                    Search Open Library
                  </button>
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
                <div
                  key={idx}
                  onClick={() => selectSearchResult(book)}
                  style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#f9f9f9' }}
                >
                  <strong>{book.title}</strong>
                  <p style={{ margin: '4px 0', fontSize: '14px', color: '#555' }}>
                    {book.author_name ? book.author_name.join(', ') : 'Unknown Author'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {selectedBook && (
            <form onSubmit={handleSaveBook} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                {selectedBook.coverUrl && (
                  <img src={selectedBook.coverUrl} alt="Cover" style={{ height: '90px', borderRadius: '4px' }} />
                )}
                <div>
                  <h3 style={{ margin: 0 }}>{selectedBook.title}</h3>
                  <p style={{ margin: '5px 0', color: '#666' }}>{selectedBook.author}</p>
                  <small style={{ color: '#888' }}>ISBN: {scannedIsbn}</small>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #eee', width: '100%' }} />

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Edition:</label>
                <input
                  type="text"
                  placeholder="e.g. Deluxe Illustrated Edition, Hardcover"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Print Run:</label>
                <select
                  value={printRun}
                  onChange={(e) => setPrintRun(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="1st">1st Printing</option>
                  <option value="2nd">2nd Printing</option>
                  <option value="3rd">3rd Printing</option>
                  <option value="4th+">4th+ Printing</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Company / Publisher:</label>
                <input
                  type="text"
                  placeholder="e.g. Allen & Unwin, Penguin, HarperCollins"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Purchase Location:</label>
                <input
                  type="text"
                  list="locations-list"
                  placeholder="e.g. Powell's Books, Estate Sale, Thrift Books"
                  value={purchaseLocation}
                  onChange={(e) => setPurchaseLocation(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
                <datalist id="locations-list">
                  {uniqueLocations.map((loc, i) => (
                    <option key={i} value={loc} />
                  ))}
                </datalist>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="signed"
                  checked={isSigned}
                  onChange={(e) => setIsSigned(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="signed" style={{ fontWeight: 'bold', cursor: 'pointer' }}>
                  Wet Print Signature (Signed by Author)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Save to Catalogue
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{ padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'catalogue' && (
        <div>
          {catalogue.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
              Your catalogue is empty. Use the "Add Book" tab to scan or search for books!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* EXPORT BUTTON */}
              <button 
                onClick={handleExportCSV}
                style={{
                  padding: '10px', 
                  backgroundColor: '#17a2b8', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  marginBottom: '10px'
                }}
              >
                📥 Export Catalogue Backup (CSV)
              </button>

              {catalogue.map((book) => {
                const ebayQuery = `${book.title} ${book.edition} ${book.printRun} printing`.trim();
                const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(ebayQuery)}`;

                return (
                  <div key={book.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt="Cover" style={{ height: '100px', borderRadius: '4px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '70px', height: '100px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', color: '#aaa', fontSize: '12px' }}>
                          No Cover
                        </div>
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

                        {book.purchaseLocation && (
                          <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>
                            <strong>Location:</strong> {book.purchaseLocation}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
                      <a
                        href={ebayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          background: '#e53238',
                          color: '#fff',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: 'bold'
                        }}
                      >
                        Search on eBay ↗
                      </a>

                      <button
                        onClick={() => deleteBook(book.id)}
                        style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Delete Entry
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}