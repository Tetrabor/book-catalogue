import { useState, useEffect } from 'react';
import { getBookThickness } from './useSeededStyle';
import type { SavedBook } from '../types';

export function useBookPagination(catalogue: SavedBook[]) {
  const [shelves, setShelves] = useState<SavedBook[][]>([]);

  useEffect(() => {
    const calculateShelves = () => {
      const containerWidth = window.innerWidth - 40; 
      
      // NEW: Sort the books! Series books group together, non-series go to the end.
      const sortedCatalogue = [...catalogue].sort((a, b) => {
        if (a.series && b.series) {
          const cmp = a.series.localeCompare(b.series);
          // If they are in the same series, optionally sort by title inside it
          if (cmp === 0) return a.title.localeCompare(b.title);
          return cmp;
        } else if (a.series) {
          return -1; // Push series books to the front
        } else if (b.series) {
          return 1;
        }
        return 0; // Maintain natural order for non-series
      });

      const newShelves: SavedBook[][] = [];
      let currentShelf: SavedBook[] = [];
      let currentWidth = 0;

      sortedCatalogue.forEach(book => {
        const thickness = getBookThickness(book.id) + 2; 

        if (currentWidth + thickness > containerWidth && currentShelf.length > 0) {
          newShelves.push(currentShelf);
          currentShelf = [book];
          currentWidth = thickness;
        } else {
          currentShelf.push(book);
          currentWidth += thickness;
        }
      });

      if (currentShelf.length > 0) newShelves.push(currentShelf);
      setShelves(newShelves);
    };

    calculateShelves();
    
    window.addEventListener('resize', calculateShelves);
    return () => window.removeEventListener('resize', calculateShelves);
  }, [catalogue]);

  return shelves;
}