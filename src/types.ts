export interface SavedBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl?: string;
  edition: string;
  printRun: string;
  company: string;
  isSigned: boolean;
  isDigitalSigned: boolean;
  purchasePrice: string;
  copiesOwned: number;
  purchaseLocation: string;
  dateAdded: string;
  series?: string; // NEW FIELD
}

export interface UserProfile {
  name: string;
  picture: string;
}