import type { Document as MockDocument } from '../../mock-server/types';

// Re-export mock document type
export type Document = MockDocument;

export interface PdfViewerProps {
  initialDocumentId?: number;
  onDocumentLoad?: (document: Document) => void;
  onPageChange?: (pageNumber: number) => void;
}

export interface PdfViewerState {
  pdfUrl: string | null;
  documents: Document[];
  selectedDocument: Document | null;
  numPages: number | null;
  pageNumber: number;
  scale: number;
  loading: boolean;
  listLoading: boolean;
  error: string | null;
}

export interface DocumentLoadSuccess {
  numPages: number;
}

export interface PdfWorker {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
}

// Extend Window interface for PDF.js worker
declare global {
  interface Window {
    pdfjsWorker: unknown;
  }
}

export type ControlButtonType = 
  | 'previous' 
  | 'next' 
  | 'zoomIn' 
  | 'zoomOut' 
  | 'reload' 
  | 'refresh';

export interface ControlButton {
  type: ControlButtonType;
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: string;
}