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
  initialData?: SavedBook;
}

export default function BookForm({ selectedBook, scannedIsbn, uniqueLocations, uploadCustomCover, onSave, onCancel, initialData }: BookFormProps) {
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
  const [series, setSeries] = useState(initialData?.series || '');
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | undefined>(initialData?.coverUrl || selectedBook.coverUrl);
  const [isChangingCover, setIsChangingCover] = useState(false);

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
    onSave({ title, author, isbn: isbn || 'N/A', coverUrl: currentCoverUrl, edition, printRun, series, company, isSigned, isDigitalSigned, purchasePrice, copiesOwned, purchaseLocation });
  };

  const handleCoverUpdate = (newUrl: string) => { setCurrentCoverUrl(newUrl); setIsChangingCover(false); };

  // Reusable styling for the dark inputs
  const inputStyle = { width: '100%', padding: '8px', boxSizing: 'border-box' as const, borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' };
  const labelStyle = { fontWeight: 'bold', display: 'block', marginBottom: '5px', fontSize: '13px', color: '#ccc' };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px' }}>
          {currentCoverUrl ? (
            <img src={currentCoverUrl} alt="Cover" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
          ) : (
             <div style={{ width: '100%', height: '150px', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', color: '#aaa', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>No Cover</div>
          )}
          
          <button 
            type="button" 
            onClick={() => setIsChangingCover(!isChangingCover)}
            style={{ marginTop: '10px', fontSize: '12px', padding: '8px 0', cursor: 'pointer', borderRadius: '4px', border: '1px solid #4da3ff', backgroundColor: isChangingCover ? '#4da3ff' : 'transparent', color: isChangingCover ? '#fff' : '#4da3ff', fontWeight: 'bold', width: '100%', transition: 'all 0.2s' }}
          >
            {isChangingCover ? 'Cancel' : 'Change Cover'}
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '5px' }}>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book Title" style={{ ...inputStyle, fontSize: '16px', fontWeight: 'bold' }} required />
          </div>
          <div style={{ marginBottom: '5px' }}>
            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author" style={{ ...inputStyle, fontSize: '14px' }} required />
          </div>
          
          <div style={{ marginTop: '10px' }}>
            <label style={labelStyle}>ISBN:</label>
            <input type="text" value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="Enter ISBN..." style={inputStyle} />
          </div>
        </div>
      </div>

      {isChangingCover && (
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <CoverVariantSelector isbn={isbn} onSelectCover={handleCoverUpdate} onCancel={() => setIsChangingCover(false)} />
          <CustomCoverUpload uploadCustomCover={uploadCustomCover} onCoverUploaded={handleCoverUpdate} />
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', width: '100%' }} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Price (USD):</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ padding: '8px', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', borderRight: 'none', borderRadius: '4px 0 0 4px', color: '#aaa' }}>$</span>
            <input type="number" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00" style={{ ...inputStyle, borderRadius: '0 4px 4px 0' }} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Copies Owned:</label>
          <input type="number" min="1" value={copiesOwned} onChange={(e) => setCopiesOwned(parseInt(e.target.value))} style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Series / Collection (Optional):</label>
        <input 
          type="text" 
          value={series} 
          onChange={(e) => setSeries(e.target.value)} 
          placeholder="e.g. Harry Potter, The Cosmere" 
          style={inputStyle} 
        />
      </div>
      <div>
        <label style={labelStyle}>Edition:</label>
        <input type="text" value={edition} onChange={(e) => setEdition(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Print Run:</label>
        <select value={printRun} onChange={(e) => setPrintRun(e.target.value)} style={inputStyle}>
          <option value="1st">1st Printing</option>
          <option value="2nd">2nd Printing</option>
          <option value="Unknown">Unknown</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Company / Publisher:</label>
        <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Purchase Location:</label>
        <input type="text" list="locations-list" value={purchaseLocation} onChange={(e) => setPurchaseLocation(e.target.value)} style={inputStyle} />
        <datalist id="locations-list">{uniqueLocations.map((loc, i) => <option key={i} value={loc} />)}</datalist>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="checkbox" checked={isSigned} onChange={(e) => setIsSigned(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: '#fff' }}>Wet Print Signature</label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="checkbox" checked={isDigitalSigned} onChange={(e) => setIsDigitalSigned(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: '#fff' }}>Digital Signature</label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button type="submit" style={{ flex: 1, padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {initialData ? 'Update Book' : 'Save New Book'}
        </button>
        <button type="button" onClick={onCancel} style={{ padding: '12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </form>
  );
}