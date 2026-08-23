import { useState } from 'react';
import type { SavedBook } from '../types';
import BookForm from './BookForm';

interface CatalogueProps {
  catalogue: SavedBook[];
  onDelete: (id: string) => void;
  onUpdate: (book: SavedBook) => void;
  uniqueLocations: string[];
  uploadCustomCover: (file: File) => Promise<string | null>;
}

export default function CatalogueList({ catalogue, onDelete, onUpdate, uniqueLocations, uploadCustomCover }: CatalogueProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (catalogue.length === 0) {
    return <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>Your catalogue is empty.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {catalogue.map((book) => {
        // If this book is being edited, render the inline form!
        if (editingId === book.id) {
          return (
            <div key={book.id} style={{ border: '2px solid #007bff', borderRadius: '8px', padding: '5px', backgroundColor: '#e9f5ff' }}>
              <BookForm 
                selectedBook={{ title: book.title, author: book.author, coverUrl: book.coverUrl }}
                scannedIsbn={book.isbn}
                uniqueLocations={uniqueLocations}
                uploadCustomCover={uploadCustomCover}
                initialData={book} // Pass the existing data
                onSave={(updatedData) => {
                  // Merge the updated fields with the original id and dateAdded
                  onUpdate({ ...updatedData, id: book.id, dateAdded: book.dateAdded });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          );
        }

        // Otherwise, render the standard display card
        const ebayQuery = `${book.title} ${book.edition} ${book.printRun} printing`.trim();
        const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(ebayQuery)}`;

        return (
          <div key={book.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              {book.coverUrl ? (
                <img src={book.coverUrl} alt="Cover" style={{ height: '120px', borderRadius: '4px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '70px', height: '120px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', color: '#aaa', fontSize: '12px' }}>No Cover</div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 5px 0' }}>{book.title}</h3>
                <p style={{ margin: '0 0 5px 0', color: '#555', fontSize: '14px' }}>{book.author}</p>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
                  {book.edition && <span style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{book.edition}</span>}
                  <span style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{book.printRun} Print</span>
                  {book.company && <span style={{ background: '#e9ecef', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{book.company}</span>}
                  
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
                
                <div style={{ display: 'flex', gap: '15px', margin: '8px 0', fontSize: '13px', color: '#444' }}>
                  {book.purchasePrice && <span><strong>Price:</strong> ${book.purchasePrice}</span>}
                  <span><strong>Copies:</strong> {book.copiesOwned || 1}</span>
                </div>
                
                {book.purchaseLocation && <p style={{ margin: '4px 0', fontSize: '13px', color: '#666' }}>Location: {book.purchaseLocation}</p>}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
              <a href={ebayUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '6px 12px', background: '#e53238', color: '#fff', textDecoration: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>Search on eBay ↗</a>
              
              {/* EDIT AND DELETE BUTTONS */}
              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={() => setEditingId(book.id)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                  ✏️ Edit
                </button>
                <button onClick={() => onDelete(book.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}