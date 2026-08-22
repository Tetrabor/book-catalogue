import { useState } from 'react';
import type { SavedBook } from '../types';

interface BookFormProps {
  selectedBook: { title: string; author: string; coverUrl?: string };
  scannedIsbn: string | null;
  uniqueLocations: string[];
  onSave: (bookData: Omit<SavedBook, 'id' | 'dateAdded'>) => void;
  onCancel: () => void;
}

export default function BookForm({ selectedBook, scannedIsbn, uniqueLocations, onSave, onCancel }: BookFormProps) {
  const [edition, setEdition] = useState('');
  const [printRun, setPrintRun] = useState('1st');
  const [company, setCompany] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [purchaseLocation, setPurchaseLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: selectedBook.title,
      author: selectedBook.author,
      isbn: scannedIsbn || 'N/A',
      coverUrl: selectedBook.coverUrl,
      edition,
      printRun,
      company,
      isSigned,
      purchaseLocation
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
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