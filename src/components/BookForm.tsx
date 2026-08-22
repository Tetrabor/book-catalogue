import { useState, useEffect } from 'react';
import type { SavedBook } from '../types';
import CoverVariantSelector from './CoverVariantSelector';
import CustomCoverUpload from './CustomCoverUpload';

interface BookFormProps {
  selectedBook: { title: string; author: string; coverUrl?: string };
  scannedIsbn: string | null;
  uniqueLocations: string[];
  uploadCustomCover: (file: File) => Promise<string | null>; // New Prop
  onSave: (bookData: Omit<SavedBook, 'id' | 'dateAdded'>) => void;
  onCancel: () => void;
}

export default function BookForm({ selectedBook, scannedIsbn, uniqueLocations, uploadCustomCover, onSave, onCancel }: BookFormProps) {
  const [edition, setEdition] = useState('');
  const [printRun, setPrintRun] = useState('1st');
  const [company, setCompany] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [purchaseLocation, setPurchaseLocation] = useState('');
  
  // New States for Cover Variants
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | undefined>(selectedBook.coverUrl);
  const [isChangingCover, setIsChangingCover] = useState(false);

  // If a new book is scanned, reset the cover
  useEffect(() => {
    setCurrentCoverUrl(selectedBook.coverUrl);
    setIsChangingCover(false);
  }, [selectedBook]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: selectedBook.title,
      author: selectedBook.author,
      isbn: scannedIsbn || 'N/A',
      coverUrl: currentCoverUrl, // Save the overridden cover!
      edition,
      printRun,
      company,
      isSigned,
      purchaseLocation
    });
  };

  const handleCoverUpdate = (newUrl: string) => {
    setCurrentCoverUrl(newUrl);
    setIsChangingCover(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '90px' }}>
          {currentCoverUrl ? (
            <img src={currentCoverUrl} alt="Cover" style={{ width: '90px', borderRadius: '4px', objectFit: 'cover' }} />
          ) : (
             <div style={{ width: '90px', height: '130px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', color: '#aaa', fontSize: '12px' }}>No Cover</div>
          )}
          <button 
            type="button" 
            onClick={() => setIsChangingCover(!isChangingCover)}
            style={{ marginTop: '8px', fontSize: '11px', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff' }}
          >
            Change Cover
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 5px 0' }}>{selectedBook.title}</h3>
          <p style={{ margin: '0 0 5px 0', color: '#666' }}>{selectedBook.author}</p>
          <small style={{ color: '#888' }}>ISBN: {scannedIsbn}</small>
        </div>
      </div>

      {/* RENDER THE HYBRID TOOLS IF THE USER CLICKS "CHANGE COVER" */}
      {isChangingCover && (
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px' }}>
          <CoverVariantSelector 
            isbn={scannedIsbn || ''} 
            onSelectCover={handleCoverUpdate} 
            onCancel={() => setIsChangingCover(false)} 
          />
          <CustomCoverUpload 
            uploadCustomCover={uploadCustomCover} 
            onCoverUploaded={handleCoverUpdate} 
          />
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid #eee', width: '100%' }} />
      
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input type="checkbox" checked={isSigned} onChange={(e) => setIsSigned(e.target.checked)} style={{ width: '18px', height: '18px' }} />
        <label style={{ fontWeight: 'bold' }}>Wet Print Signature</label>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button type="submit" style={{ flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
        <button type="button" onClick={onCancel} style={{ padding: '12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </form>
  );
}