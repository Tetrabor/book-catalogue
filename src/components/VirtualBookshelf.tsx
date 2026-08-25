import { useBookPagination } from '../hooks/useBookPagination';
import ShelfRow from './ShelfRow';
import type { SavedBook } from '../types';

interface Props {
  catalogue: SavedBook[];
  activeBookId: string | null;
}

export default function VirtualBookshelf({ catalogue, activeBookId }: Props) {
  // Our math engine handles chopping the massive array into perfectly sized rows!
  const shelves = useBookPagination(catalogue);

  return (
    <div style={{
      position: 'absolute', // Absolutely positioned so it scrolls naturally with the document
      top: 0,
      left: 0,
      right: 0,
      minHeight: '100vh',
      zIndex: -1, // Keep it behind all UI
      pointerEvents: 'none', // Ensure finger swipes and clicks pass right through to the app
      overflow: 'hidden',
      backgroundColor: '#1e140d', // Deep wood/room backing color
    }}>
      
      {/* 1. Render populated shelves */}
      {shelves.map((shelf, index) => (
        <ShelfRow key={index} books={shelf} activeBookId={activeBookId} />
      ))}

      {/* 2. Render empty shelves to fill the screen if the catalogue is small */}
      {Array.from({ length: Math.max(0, 7 - shelves.length) }).map((_, i) => (
        <ShelfRow key={`empty-${i}`} books={[]} activeBookId={null} />
      ))}
      
    </div>
  );
}