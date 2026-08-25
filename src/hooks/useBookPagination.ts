import { useState, useEffect } from 'react';
import { getBookThickness } from './useSeededStyle';
import type { SavedBook } from '../types';

export function useBookPagination(catalogue: SavedBook[]) {
  // We store an array of arrays. Each inner array is a single shelf.
  const [shelves, setShelves] = useState<SavedBook[][]>([]);

  useEffect(() => {
    const calculateShelves = () => {
      // Get available screen width, subtracting 40px for padding on the edges
      const containerWidth = window.innerWidth - 40; 
      
      const newShelves: SavedBook[][] = [];
      let currentShelf: SavedBook[] = [];
      let currentWidth = 0;

      catalogue.forEach(book => {
        // Find the exact width of this specific book, plus a 2px gap between books
        const thickness = getBookThickness(book.id) + 2; 

        // If this book pushes us over the edge, save the shelf and start a new one
        if (currentWidth + thickness > containerWidth && currentShelf.length > 0) {
          newShelves.push(currentShelf);
          currentShelf = [book];
          currentWidth = thickness;
        } else {
          // Otherwise, keep adding to the current shelf
          currentShelf.push(book);
          currentWidth += thickness;
        }
      });

      // Push the final partially-filled shelf
      if (currentShelf.length > 0) {
        newShelves.push(currentShelf);
      }

      setShelves(newShelves);
    };

    calculateShelves();
    
    window.addEventListener('resize', calculateShelves);
    return () => window.removeEventListener('resize', calculateShelves);
  }, [catalogue]);

  return shelves;
}