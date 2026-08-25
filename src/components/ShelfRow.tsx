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
      height: '33vh', 
      minHeight: '220px', 
      
      // Changed to a very dark navy/black for the shelf lip
      borderBottom: '16px solid #111A26', 
      boxShadow: '0 6px 12px rgba(0,0,0,0.6)',
      
      padding: '0 20px',
      gap: '2px', 
      position: 'relative',
      backgroundColor: 'transparent'
    }}>
      
      <div style={{
        position: 'absolute', 
        bottom: '16px', 
        left: 0, 
        right: 0, 
        height: '50px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', 
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