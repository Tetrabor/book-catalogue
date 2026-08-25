import BookSpine from './BookSpine';
import type { SavedBook } from '../types';

interface Props {
  books: SavedBook[];
  activeBookId: string | null;
}

export default function ShelfRow({ books, activeBookId }: Props) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      
      // NEW: 3 shelves fit perfectly on any screen
      height: '33vh', 
      minHeight: '220px', 
      
      borderBottom: '12px solid #4a3320', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
      
      padding: '0 20px',
      gap: '2px', 
      position: 'relative',
      backgroundColor: 'transparent'
    }}>
      
      <div style={{
        position: 'absolute', 
        bottom: '12px', 
        left: 0, 
        right: 0, 
        height: '40px', // Taller shadow for the taller shelves
        background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)', 
        zIndex: 0
      }} />

      {books.map(book => (
        <BookSpine 
          key={book.id} 
          book={book} 
          isActive={activeBookId === book.id} 
        />
      ))}
      
    </div>
  );
}