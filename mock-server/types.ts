export interface Document {
  id: number;
  fileName: string;
  originalName: string;
  filename: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  description: string;
  category: string;
  author: string;
  pages: number;
  downloadCount: number;
}

export interface Category {
  id: number;
  name: string;
  documentCount: number;
}

export interface Database {
  documents: Document[];
  categories: Category[];
}

export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}