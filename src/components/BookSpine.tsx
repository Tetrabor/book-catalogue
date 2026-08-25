import { useSeededStyle, getSeriesColor } from '../hooks/useSeededStyle';
import type { SavedBook } from '../types';

interface Props {
  book: SavedBook;
  isActive?: boolean;
}

export default function BookSpine({ book, isActive = false }: Props) {
  const style = useSeededStyle(book.id);

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        
        // NEW: Flat bottoms! Only the top left and right corners are rounded now.
        borderRadius: '3px 4px 0 0', 
        
        // Slightly tweaked shadow to pull the books inward
        boxShadow: 'inset 3px 0 5px rgba(0,0,0,0.2), inset -1px 0 2px rgba(255,255,255,0.15), 3px 0 6px rgba(0,0,0,0.6)',
        
        padding: book.series ? '28px 4px 15px 4px' : '15px 4px',
        boxSizing: 'border-box',
        
        // NEW: A dark edge at the absolute bottom to firmly plant it on the wood
        borderBottom: '2px solid rgba(0,0,0,0.5)',

        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s',
        
        // NEW: Keeps the book completely grounded on the shelf when it scales up!
        transformOrigin: 'bottom center', 
        transform: isActive ? 'scale(1.08) translateY(-12px)' : 'scale(1) translateY(0)',
        
        zIndex: isActive ? 10 : 1,
        position: 'relative',
        alignSelf: 'flex-end', 
      }}
    >
      {book.series && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: 0,
          right: 0,
          height: '14px',
          backgroundColor: getSeriesColor(book.series),
          boxShadow: '0 2px 3px rgba(0,0,0,0.3), inset 0 2px 2px rgba(255,255,255,0.3)',
          zIndex: 2
        }} />
      )}

      <span
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)', 
          overflow: 'hidden',
          maxHeight: '100%',
          textAlign: 'center', 
          lineHeight: '1.2',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.5px',
          textShadow: '0 1px 2px rgba(0,0,0,0.6)',
        }}
      >
        {book.title}
      </span>
    </div>
  );
}