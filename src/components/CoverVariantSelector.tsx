import { useState, useEffect } from 'react';

interface Props {
  isbn: string;
  onSelectCover: (url: string) => void;
  onCancel: () => void;
}

export default function CoverVariantSelector({ isbn, onSelectCover, onCancel }: Props) {
  const [covers, setCovers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCovers = async () => {
      setIsLoading(true);
      try {
        // 1. Get the abstract "Work ID" from the ISBN
        const bookRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=details`);
        const bookData = await bookRes.json();
        const bookKey = `ISBN:${isbn}`;
        
        if (bookData[bookKey] && bookData[bookKey].details && bookData[bookKey].details.works) {
          const workId = bookData[bookKey].details.works[0].key;
          
          // 2. Fetch all specific editions tied to that Work
          const editionsRes = await fetch(`https://openlibrary.org${workId}/editions.json`);
          const editionsData = await editionsRes.json();
          
          // 3. Extract unique cover IDs
          const coverIds = new Set<number>();
          if (editionsData.entries) {
            editionsData.entries.forEach((edition: any) => {
              if (edition.covers) {
                edition.covers.forEach((c: number) => coverIds.add(c));
              }
            });
          }
          
          // 4. Build standard image URLs for the grid
          const coverUrls = Array.from(coverIds)
            .filter(id => id > 0)
            .map(id => `https://covers.openlibrary.org/b/id/${id}-M.jpg`);
            
          setCovers(coverUrls);
        }
      } catch (err) {
        console.error("Failed to fetch alternative covers", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isbn && isbn !== 'N/A') {
      fetchCovers();
    } else {
      setIsLoading(false);
    }
  }, [isbn]);

  return (
    <div style={{ padding: '15px', backgroundColor: '#f0f4f8', borderRadius: '8px', border: '1px solid #cce5ff', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, color: '#004085' }}>Select Alternative Cover</h4>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#666' }}>✕ Close</button>
      </div>
      
      {isLoading ? (
        <p style={{ margin: 0, fontSize: '14px' }}>Loading variants from Open Library...</p>
      ) : covers.length === 0 ? (
        <p style={{ margin: 0, fontSize: '14px' }}>No alternative covers found in database.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px', maxHeight: '250px', overflowY: 'auto', padding: '5px' }}>
          {covers.map((url, i) => (
            <img 
              key={i} 
              src={url} 
              alt={`Variant ${i}`} 
              onClick={() => onSelectCover(url)}
              style={{ width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer', borderRadius: '4px', border: '2px solid transparent', backgroundColor: '#fff' }}
              onMouseOver={(e) => e.currentTarget.style.border = '2px solid #007bff'}
              onMouseOut={(e) => e.currentTarget.style.border = '2px solid transparent'}
            />
          ))}
        </div>
      )}
    </div>
  );
}