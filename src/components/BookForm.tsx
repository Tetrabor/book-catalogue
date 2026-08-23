import { useState, useEffect } from 'react';
import type { SavedBook } from '../types';
import CoverVariantSelector from './CoverVariantSelector';
import CustomCoverUpload from './CustomCoverUpload';

interface BookFormProps {
  selectedBook: { title: string; author: string; coverUrl?: string };
  scannedIsbn: string | null;
  uniqueLocations: string[];
  uploadCustomCover: (file: File) => Promise<string | null>;
  onSave: (bookData: Omit<SavedBook, 'id' | 'dateAdded'>) => void;
  onCancel: () => void;
  initialData?: SavedBook; // NEW: Used when editing an existing book
}

export default function BookForm({ selectedBook, scannedIsbn, uniqueLocations, uploadCustomCover, onSave, onCancel, initialData }: BookFormProps) {
  // Use initialData if it exists (edit mode), otherwise use the scanned/selected data (add mode)
  const [title, setTitle] = useState(initialData?.title || selectedBook.title);
  const [author, setAuthor] = useState(initialData?.author || selectedBook.author);
  const [isbn, setIsbn] = useState(initialData?.isbn || (scannedIsbn && scannedIsbn !== 'N/A' ? scannedIsbn : ''));
  const [edition, setEdition] = useState(initialData?.edition || '');
  const [printRun, setPrintRun] = useState(initialData?.printRun || '1st');
  const [company, setCompany] = useState(initialData?.company || '');
  const [isSigned, setIsSigned] = useState(initialData?.isSigned || false);
  const [isDigitalSigned, setIsDigitalSigned] = useState(initialData?.isDigitalSigned || false);
  const [purchasePrice, setPurchasePrice] = useState(initialData?.purchasePrice || '');
  const [copiesOwned, setCopiesOwned] = useState<number>(initialData?.copiesOwned || 1);
  const [purchaseLocation, setPurchaseLocation] = useState(initialData?.purchaseLocation || '');
  
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | undefined>(initialData?.coverUrl || selectedBook.coverUrl);
  const [isChangingCover, setIsChangingCover] = useState(false);

  // If the user scans a DIFFERENT book while the form is open, reset the fields
  useEffect(() => {
    if (!initialData) {
      setTitle(selectedBook.title);
      setAuthor(selectedBook.author);
      setCurrentCoverUrl(selectedBook.coverUrl);
      setIsChangingCover(false);
      setIsbn(scannedIsbn && scannedIsbn !== 'N/A' ? scannedIsbn : '');
    }
  }, [selectedBook, scannedIsbn, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      author,
      isbn: isbn || 'N/A',
      coverUrl: currentCoverUrl, 
      edition,
      printRun,
      company,
      isSigned,
      isDigitalSigned,
      purchasePrice,
      copiesOwned,
      purchaseLocation
    });
  };

  const handleCoverUpdate = (newUrl: string) => {
    setCurrentCoverUrl(newUrl);
    setIsChangingCover(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#fff' }}>
      
      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px' }}>
          {currentCoverUrl ? (
            <img src={currentCoverUrl} alt="Cover" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
          ) : (
             <div style={{ width: '100%', height: '150px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', color: '#aaa', fontSize: '12px' }}>No Cover</div>
          )}
          
          <button 
            type="button" 
            onClick={() => setIsChangingCover(!isChangingCover)}
            style={{ marginTop: '10px', fontSize: '12px', padding: '8px 0', cursor: 'pointer', borderRadius: '4px', border: '1px solid #007bff', backgroundColor: isChangingCover ? '#007bff' : '#f8f9fa', color: isChangingCover ? '#fff' : '#007bff', fontWeight: 'bold', width: '100%', transition: 'all 0.2s' }}
          >
            {isChangingCover ? 'Cancel' : 'Change Cover'}
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '5px' }}>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book Title" style={{ width: '100%', padding: '6px', fontSize: '16px', fontWeight: 'bold', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} required />
          </div>
          <div style={{ marginBottom: '5px' }}>
            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author" style={{ width: '100%', padding: '6px', fontSize: '14px', color: '#555', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} required />
          </div>
          
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '3px' }}>ISBN:</label>
            <input type="text" value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="Enter ISBN..." style={{ width: '100%', padding: '6px', fontSize: '13px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>
        </div>
      </div>

      {isChangingCover && (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', backgroundColor: '#fafafa' }}>
          <CoverVariantSelector isbn={isbn} onSelectCover={handleCoverUpdate} onCancel={() => setIsChangingCover(false)} />
          <CustomCoverUpload uploadCustomCover={uploadCustomCover} onCoverUploaded={handleCoverUpdate} />
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid #eee', width: '100%' }} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '14px' }}>Price (USD):</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ padding: '8px', backgroundColor: '#eee', border: '1px solid #ccc', borderRight: 'none', borderRadius: '4px 0 0 4px' }}>$</span>
            <input type="number" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '0 4px 4px 0', border: '1px solid #ccc' }} />
          </div>
        </div>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '14px' }}>Copies Owned:</label>
          <input type="number" min="1" value={copiesOwned} onChange={(e) => setCopiesOwned(parseInt(e.target.value))} style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Edition:</label>
        <input type="text" value={edition} onChange={(e) => setEdition(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Print Run:</label>
        <select value={printRun} onChange={(e) => setPrintRun(e.target.value)} style={{ width: '100%', padding: '8px' }}>
          <option value="1st">1st Printing</option>
          <option value="2nd">2nd Printing</option>
          <option value="Unknown">Unknown</option>
        </select>
      </div>
      <div>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Company / Publisher:</label>
        <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Purchase Location:</label>
        <input type="text" list="locations-list" value={purchaseLocation} onChange={(e) => setPurchaseLocation(e.target.value)} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
        <datalist id="locations-list">{uniqueLocations.map((loc, i) => <option key={i} value={loc} />)}</datalist>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '4px', border: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="checkbox" checked={isSigned} onChange={(e) => setIsSigned(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          <label style={{ fontWeight: 'bold', cursor: 'pointer' }}>Wet Print Signature</label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="checkbox" checked={isDigitalSigned} onChange={(e) => setIsDigitalSigned(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          <label style={{ fontWeight: 'bold', cursor: 'pointer' }}>Digital Signature</label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button type="submit" style={{ flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {initialData ? 'Update Book' : 'Save New Book'}
        </button>
        <button type="button" onClick={onCancel} style={{ padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </form>
  );
}