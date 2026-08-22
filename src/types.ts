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
  purchaseLocation: string;
  dateAdded: string;
}

export interface UserProfile {
  name: string;
  picture: string;
}