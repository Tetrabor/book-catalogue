import BookSpine from './BookSpine';
import type { SavedBook } from '../types';

interface Props {
  books: SavedBook[];
  activeBookId: string | null;
}

export default function ShelfRow({ books, activeBookId }: Props) {
  return (
    <div style={{
      boxSizing: 'border-box', // Ensures the padding doesn't inflate the 33vh height
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      height: '33vh', 
      minHeight: '220px', 
      
      // We moved the shelf gap to padding so the books sit perfectly on the absolute shelf lip below
      padding: '0 20px 16px 20px', 
      gap: '2px', 
      position: 'relative',
      backgroundColor: 'transparent'
    }}>
      
      {/* 1. Back Wall Shadow (gives depth to the back of the shelf behind the books) */}
      <div style={{
        position: 'absolute', 
        bottom: '16px', 
        left: 0, 
        right: 0, 
        height: '50px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', 
        zIndex: 0
      }} />

      {/* 2. The Physical 3D Shelf Lip (Draws in front to cut off book shadows) */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '16px',
        backgroundColor: '#111A26',
        borderTop: '2px solid rgba(255, 255, 255, 0.08)', // Crisp highlight for the leading edge
        boxShadow: '0 -2px 4px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.6)', // Inner grounding shadow + Outer drop
        zIndex: 2 // Acts as a mask over any bleeding book shadows to prove the lip is in front
      }} />

      {/* 3. The Books */}
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