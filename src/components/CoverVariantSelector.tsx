import { useState, useEffect } from 'react';

interface Props {
  isbn: string;
  onSelectCover: (url: string) => void;
  onCancel: () => void;
}

export default function CoverVariantSelector({ isbn, onSelectCover, onCancel }: Props) {
  const [covers, setCovers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchCovers = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const searchRes = await fetch(`https://openlibrary.org/search.json?q=${isbn}`);
        const searchData = await searchRes.json();

        if (searchData.docs && searchData.docs.length > 0) {
           const coverIds = new Set<number>();
           
           searchData.docs.forEach((doc: any) => {
             if (doc.cover_i) coverIds.add(doc.cover_i);
             if (doc.seed && Array.isArray(doc.seed)) {
                 doc.seed.forEach((s:string) => {
                     const match = s.match(/\/b\/id\/(\d+)-/);
                     if (match) coverIds.add(parseInt(match[1]));
                 })
             }
           });

           const coverUrls = Array.from(coverIds)
            .filter(id => id > 0)
            .map(id => `https://covers.openlibrary.org/b/id/${id}-M.jpg`);
            
          setCovers(coverUrls);
          if (coverUrls.length === 0) setErrorMsg("No alternative covers found in database.");
        } else {
            setErrorMsg("Could not find variant data for this book.");
        }
      } catch (err) {
        console.error("Failed to fetch alternative covers", err);
        setErrorMsg("Network error fetching covers.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isbn && isbn !== 'N/A' && isbn.length > 5) {
      fetchCovers();
    } else {
      setIsLoading(false);
      setErrorMsg("Requires a valid ISBN to find variants.");
    }
  }, [isbn]);

  return (
    <div style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #dee2e6', marginTop: '10px' }}>
      
      {/* CSS FOR SKELETON ANIMATION */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }
          .skeleton-box {
            width: 100%;
            height: 100px;
            background-color: #cbd5e1;
            border-radius: 4px;
            animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, color: '#333' }}>Alternative Covers</h4>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#666' }}>✕ Close</button>
      </div>
      
      {isLoading ? (
        // --- SKELETON LOADER GRID ---
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px', padding: '5px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-box"></div>
          ))}
        </div>
      ) : errorMsg ? (
        <p style={{ margin: 0, fontSize: '14px', color: '#dc3545' }}>{errorMsg}</p>
      ) : (
        // --- ACTUAL IMAGES GRID ---
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '8px', maxHeight: '250px', overflowY: 'auto', padding: '5px' }}>
          {covers.map((url, i) => (
            <img 
              key={i} 
              src={url} 
              alt={`Variant ${i}`} 
              onClick={() => onSelectCover(url)}
              style={{ width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer', borderRadius: '4px', border: '2px solid transparent', backgroundColor: '#fff', transition: 'border 0.2s ease-in-out' }}
              onMouseOver={(e) => e.currentTarget.style.border = '2px solid #007bff'}
              onMouseOut={(e) => e.currentTarget.style.border = '2px solid transparent'}
            />
          ))}
        </div>
      )}
    </div>
  );
}