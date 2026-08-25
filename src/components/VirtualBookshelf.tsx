import { useRef, useEffect } from 'react';
import { useBookPagination } from '../hooks/useBookPagination';
import ShelfRow from './ShelfRow';
import type { SavedBook } from '../types';

interface Props {
  catalogue: SavedBook[];
  activeBookId: string | null;
}

export default function VirtualBookshelf({ catalogue, activeBookId }: Props) {
  const shelves = useBookPagination(catalogue);
  const shelfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!shelfRef.current) return;
      
      const docScroll = window.scrollY;
      const maxDocScroll = document.documentElement.scrollHeight - window.innerHeight;
      const maxShelfScroll = shelfRef.current.scrollHeight - window.innerHeight;

      // If there are more shelves than the screen can fit, sync the scroll!
      if (maxShelfScroll > 0 && maxDocScroll > 0) {
        const scrollRatio = Math.min(Math.max(docScroll / maxDocScroll, 0), 1);
        shelfRef.current.style.transform = `translateY(-${maxShelfScroll * scrollRatio}px)`;
      } else {
        shelfRef.current.style.transform = `translateY(0px)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger once on load/resize to ensure correct positioning
    const timeoutId = setTimeout(handleScroll, 100);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [shelves]);

  return (
    <div style={{
      position: 'fixed', // Locks to the camera
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: -1, 
      pointerEvents: 'none', 
      overflow: 'hidden',
      backgroundColor: '#1D2A3A', // Core Theme: Ikea Billy Dark Blue
    }}>
      {/* We apply the translate animation to this inner container */}
      <div ref={shelfRef} style={{ width: '100%', willChange: 'transform' }}>
        {shelves.map((shelf, index) => (
          <ShelfRow key={index} books={shelf} activeBookId={activeBookId} />
        ))}

        {/* Guarantee at least 3 shelves for visual consistency */}
        {Array.from({ length: Math.max(0, 3 - shelves.length) }).map((_, i) => (
          <ShelfRow key={`empty-${i}`} books={[]} activeBookId={null} />
        ))}
      </div>
    </div>
  );
}