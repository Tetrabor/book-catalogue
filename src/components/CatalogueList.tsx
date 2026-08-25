import { useState, useEffect } from 'react';
import type { SavedBook } from '../types';
import BookForm from './BookForm';

interface CatalogueProps {
  catalogue: SavedBook[];
  onDelete: (id: string) => void;
  onUpdate: (book: SavedBook) => void;
  uniqueLocations: string[];
  uploadCustomCover: (file: File) => Promise<string | null>;
  setActiveBookId: (id: string | null) => void;
}

export default function CatalogueList({ catalogue, onDelete, onUpdate, uniqueLocations, uploadCustomCover, setActiveBookId }: CatalogueProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('data-book-id');
          if (id) setActiveBookId(id);
        }
      });
    }, { rootMargin: '-49% 0px -49% 0px' });

    const elements = document.querySelectorAll('.catalogue-card');
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [catalogue, viewMode, searchFilter, setActiveBookId]);

  if (catalogue.length === 0) {
    return <p style={{ textAlign: 'center', color: '#ccc', marginTop: '40px' }}>Your catalogue is empty.</p>;
  }

  const filteredCatalogue = catalogue.filter((book) => {
    const term = searchFilter.toLowerCase();
    return book.title.toLowerCase().includes(term) || book.author.toLowerCase().includes(term) || book.isbn.toLowerCase().includes(term);
  });

  const cardStyle: React.CSSProperties = {
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px', 
    backgroundColor: 'rgba(29, 42, 58, 0.85)', 
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
    color: '#fff'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* Dark Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'rgba(29, 42, 58, 0.85)', backdropFilter: 'blur(12px)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <input type="text" placeholder="Filter by title, author, or ISBN..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '14px' }} />
        <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
          <button onClick={() => setViewMode('card')} style={{ padding: '8px 12px', border: 'none', background: viewMode === 'card' ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Cards</button>
          <button onClick={() => setViewMode('list')} style={{ padding: '8px 12px', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.2)', background: viewMode === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>List</button>
        </div>
      </div>

      {filteredCatalogue.map((book) => {
        if (editingId === book.id) {
          return (
            <div key={book.id} style={{ border: '1px solid #007bff', borderRadius: '8px', padding: '5px', backgroundColor: 'rgba(29, 42, 58, 0.95)' }}>
              <BookForm selectedBook={{ title: book.title, author: book.author, coverUrl: book.coverUrl }} scannedIsbn={book.isbn} uniqueLocations={uniqueLocations} uploadCustomCover={uploadCustomCover} initialData={book} onSave={(updatedData) => { onUpdate({ ...updatedData, id: book.id, dateAdded: book.dateAdded }); setEditingId(null); }} onCancel={() => setEditingId(null)} />
            </div>
          );
        }

        const ebayQuery = `${book.title} ${book.edition} ${book.printRun} printing`.trim();
        const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(ebayQuery)}`;

        if (viewMode === 'list') {
          return (
            <div key={book.id} className="catalogue-card" data-book-id={book.id} onMouseEnter={() => setActiveBookId(book.id)} onMouseLeave={() => setActiveBookId(null)} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '15px', padding: '10px' }}>
              {book.coverUrl ? (
                <img src={book.coverUrl} alt="Cover" style={{ height: '50px', width: '35px', borderRadius: '2px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '35px', height: '50px', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', color: '#aaa', fontSize: '9px' }}>N/A</div>
              )}
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</h4>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#aaa', alignItems: 'center' }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{book.author}</span>
                  <span>•</span><span>{book.edition || 'Std Ed.'}</span>
                  {book.isSigned && <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>✍️ Wet</span>}
                  {book.isDigitalSigned && <span style={{ color: '#ccc', fontWeight: 'bold' }}>✍️ Dig</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setEditingId(book.id)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
                <button onClick={() => onDelete(book.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
              </div>
            </div>
          );
        }

        return (
          <div key={book.id} className="catalogue-card" data-book-id={book.id} onMouseEnter={() => setActiveBookId(book.id)} onMouseLeave={() => setActiveBookId(null)} style={{ ...cardStyle, padding: '15px' }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              {book.coverUrl ? (
                <img src={book.coverUrl} alt="Cover" style={{ height: '120px', borderRadius: '4px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '70px', height: '120px', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', color: '#aaa', fontSize: '12px' }}>No Cover</div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 5px 0' }}>{book.title}</h3>
                <p style={{ margin: '0 0 5px 0', color: '#aaa', fontSize: '14px' }}>{book.author}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
                  {book.edition && <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{book.edition}</span>}
                  <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{book.printRun} Print</span>
                  {book.company && <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{book.company}</span>}
                  
                  {/* RESTORED: Wet & Digital Signatures for Card View */}
                  {book.isSigned && (
                    <span style={{ background: 'linear-gradient(135deg, #FFDF00 0%, #D4AF37 100%)', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', textShadow: '0 1px 1px rgba(255,255,255,0.5)' }}>
                      Wet Signed ✓
                    </span>
                  )}
                  {book.isDigitalSigned && (
                    <span style={{ background: 'linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)', color: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #aaa' }}>
                      Digital Signed ✓
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '15px', margin: '8px 0', fontSize: '13px', color: '#ccc' }}>
                  {book.purchasePrice && <span><strong>Price:</strong> ${book.purchasePrice}</span>}
                  <span><strong>Copies:</strong> {book.copiesOwned || 1}</span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <a href={ebayUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '6px 12px', background: '#dc3545', color: '#fff', textDecoration: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>Search on eBay ↗</a>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => setEditingId(book.id)} style={{ background: 'none', border: 'none', color: '#4da3ff', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>✏️ Edit</button>
                <button onClick={() => onDelete(book.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>🗑️ Delete</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}