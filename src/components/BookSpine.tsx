import { useSeededStyle } from '../hooks/useSeededStyle';
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
        borderRadius: '2px 4px 4px 2px',
        boxShadow: 'inset 3px 0 5px rgba(0,0,0,0.3), inset -1px 0 2px rgba(255,255,255,0.2), 2px 0 4px rgba(0,0,0,0.4)',
        padding: '15px 4px', // Extra padding so text doesn't hit the absolute edges
        boxSizing: 'border-box',
        
        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s',
        transform: isActive ? 'scale(1.10) translateY(-15px)' : 'scale(1) translateY(0)',
        zIndex: isActive ? 10 : 1,
        position: 'relative',
        alignSelf: 'flex-end', 
      }}
    >
      <span
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)', 
          
          // NEW: Let the text wrap naturally!
          overflow: 'hidden',
          maxHeight: '100%',
          textAlign: 'center', // Centers the text vertically on the spine
          lineHeight: '1.2',
          
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.5px',
          textShadow: '0 1px 1px rgba(0,0,0,0.3)',
        }}
      >
        {book.title}
      </span>
    </div>
  );
}