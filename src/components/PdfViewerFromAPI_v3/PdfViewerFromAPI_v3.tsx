import React, { useState, useEffect, useCallback, type JSX } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PdfViewerOptimized.scss';
import { API_BASE_URL } from '../../constants';

// =============================================
// 🎯 TYPES & CONFIG
// =============================================
interface ProfessionalPdfViewerProps {
    initialDocumentId?: string;
    onDocumentLoad?: (document: DocumentType) => void;
    onPageChange?: (page: number) => void;
    theme?: 'light' | 'dark' | 'auto';
}

interface DocumentType {
    id: string;
    fileName: string;
    fileSize: number;
    pages: number;
    uploadedAt: string;
    author: string;
    category: string;
    description: string;
    downloadCount: number;
    filename: string;
}

// Cấu hình PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// =============================================
// 🎨 OPTIMIZED PDF VIEWER COMPONENT
// =============================================
const PdfViewerOptimized: React.FC<ProfessionalPdfViewerProps> = ({
    initialDocumentId,
    onDocumentLoad,
    onPageChange,
    theme = 'light'
}) => {
    const [state, setState] = useState({
        pdfUrl: null as string | null,
        documents: [] as DocumentType[],
        selectedDocument: null as DocumentType | null,
        numPages: null as number | null,
        pageNumber: 1,
        scale: 1.0,
        loading: false,
        listLoading: true,
        error: null as string | null,
        sidebarCollapsed: false,
        currentTheme: theme,
        searchQuery: '',
        selectedCategory: 'all'
    });

    const {
        pdfUrl,
        documents,
        selectedDocument,
        numPages,
        pageNumber,
        scale,
        loading,
        listLoading,
        error,
        sidebarCollapsed,
        currentTheme,
        searchQuery,
        selectedCategory
    } = state;

    const updateState = (updates: Partial<typeof state>): void => {
        setState(prev => ({ ...prev, ...updates }));
    };

    // =============================================
    // 📡 API FUNCTIONS
    // =============================================
    const fetchDocuments = useCallback(async (): Promise<void> => {
        updateState({ listLoading: true, error: null });
        try {
            const response = await fetch(`${API_BASE_URL}/documents`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const docs = await response.json();
            updateState({ documents: docs, listLoading: false });

            if (initialDocumentId && docs.length > 0) {
                const initialDoc = docs.find((doc: DocumentType) => doc.id === initialDocumentId);
                if (initialDoc) handleDocumentSelect(initialDoc);
            }
        } catch (err) {
            updateState({ error: 'Failed to load documents', listLoading: false });
        }
    }, [initialDocumentId]);

    const fetchPdf = useCallback(async (document: DocumentType): Promise<void> => {
        if (!document) return;
        updateState({ loading: true, error: null });

        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            updateState({ pdfUrl: null });
        }

        try {
            const response = await fetch(`${API_BASE_URL}/pdfs/${document.filename}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/pdf')) {
                throw new Error('Server response is not a PDF');
            }

            const pdfBlob = await response.blob();
            const objectUrl = URL.createObjectURL(pdfBlob);
            updateState({
                pdfUrl: objectUrl,
                selectedDocument: document,
                pageNumber: 1,
                loading: false
            });
            onDocumentLoad?.(document);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            updateState({ error: `PDF loading error: ${errorMessage}`, loading: false });
        }
    }, [pdfUrl, onDocumentLoad]);

    // =============================================
    // ⚡ EFFECTS
    // =============================================
    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);

    // =============================================
    // 🎮 EVENT HANDLERS
    // =============================================
    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }): void => {
        updateState({ numPages });
    }, []);

    const handleDocumentSelect = (document: DocumentType): void => {
        fetchPdf(document);
    };

    const goToPreviousPage = (): void => {
        const newPage = Math.max(pageNumber - 1, 1);
        updateState({ pageNumber: newPage });
        onPageChange?.(newPage);
    };

    const goToNextPage = (): void => {
        const newPage = Math.min(pageNumber + 1, numPages || 1);
        updateState({ pageNumber: newPage });
        onPageChange?.(newPage);
    };

    const goToFirstPage = (): void => {
        updateState({ pageNumber: 1 });
        onPageChange?.(1);
    };

    const goToLastPage = (): void => {
        updateState({ pageNumber: numPages || 1 });
        onPageChange?.(numPages || 1);
    };

    const zoomIn = (): void => {
        updateState({ scale: scale + 0.2 });
    };

    const zoomOut = (): void => {
        updateState({ scale: Math.max(scale - 0.2, 0.3) });
    };

    const reloadDocument = (): void => {
        if (selectedDocument) fetchPdf(selectedDocument);
    };

    const toggleSidebar = (): void => {
        updateState({ sidebarCollapsed: !sidebarCollapsed });
    };

    const toggleTheme = (): void => {
        updateState({ currentTheme: currentTheme === 'light' ? 'dark' : 'light' });
    };

    // =============================================
    // 🛠️ UTILITIES
    // =============================================
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // const formatDate = (dateString: string): string => {
    //     return new Date(dateString).toLocaleDateString('vi-VN', {
    //         year: 'numeric',
    //         month: 'short',
    //         day: 'numeric'
    //     });
    // };

    // =============================================
    // 🎨 RENDER FUNCTIONS - OPTIMIZED
    // =============================================
    const renderDocumentItem = (doc: DocumentType): JSX.Element => (
        <div
            key={doc.id}
            className={`document-item ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
            onClick={() => handleDocumentSelect(doc)}
        >
            <div className="document-icon">
                <div className="file-type">PDF</div>
            </div>
            <div className="document-content">
                <h4 className="document-title">{doc.fileName}</h4>
                <div className="document-meta">
                    <span className="meta-item">
                        <i className="icon size"></i>
                        {formatFileSize(doc.fileSize)}
                    </span>
                    <span className="meta-item">
                        <i className="icon pages"></i>
                        {doc.pages} pages
                    </span>
                </div>
                <div className="document-footer">
                    <span className="author">{doc.author}</span>
                    <span className="category">{doc.category}</span>
                </div>
            </div>
        </div>
    );

    const renderControlButton = (button: any): JSX.Element => (
        <button
            key={button.type}
            onClick={button.onClick}
            disabled={button.disabled}
            className={`control-btn ${button.type}`}
            title={button.label}
        >
            <i className={`icon ${button.icon}`}></i>
            <span className="btn-label">{button.label}</span>
        </button>
    );

    const renderLoadingState = (): JSX.Element => (
        <div className="pdf-loading-state">
            <div className="loading-spinner"></div>
            <p>Loading PDF document...</p>
        </div>
    );

    const renderErrorState = (): JSX.Element => (
        <div className="pdf-error-state">
            <div className="error-icon">⚠️</div>
            <h3>Unable to Load Document</h3>
            <p>{error}</p>
            <button className="retry-btn" onClick={() => selectedDocument && fetchPdf(selectedDocument)}>
                Try Again
            </button>
        </div>
    );

    const renderEmptyState = (): JSX.Element => (
        <div className="pdf-empty-state">
            <div className="empty-illustration">
                <i className="icon document"></i>
            </div>
            <h3>No Document Selected</h3>
            <p>Choose a document from the sidebar to begin viewing</p>
        </div>
    );

    // 🎯 QUAN TRỌNG: Render PDF với scrolling container
    const renderPdfViewer = (): JSX.Element => (
        <div className="pdf-scroll-container">
            <div className="pdf-content-wrapper">
                <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(error: Error) => {
                        updateState({ error: 'Failed to load PDF content' });
                        console.log(error);
                    }}
                    loading={
                        <div className="pdf-loading">
                            <div className="loading-spinner small"></div>
                            Processing PDF...
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        loading={
                            <div className="page-loading">
                                <div className="loading-spinner small"></div>
                                Rendering page {pageNumber}...
                            </div>
                        }
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="pdf-page"
                    />
                </Document>
            </div>
        </div>
    );

    // Control buttons configuration
    const controlButtons = [
        {
            type: 'first',
            label: 'First',
            disabled: pageNumber <= 1 || loading,
            onClick: goToFirstPage,
            icon: 'first-page'
        },
        {
            type: 'previous',
            label: 'Previous',
            disabled: pageNumber <= 1 || loading,
            onClick: goToPreviousPage,
            icon: 'chevron-left'
        },
        {
            type: 'next',
            label: 'Next',
            disabled: pageNumber >= (numPages || 1) || loading,
            onClick: goToNextPage,
            icon: 'chevron-right'
        },
        {
            type: 'last',
            label: 'Last',
            disabled: pageNumber >= (numPages || 1) || loading,
            onClick: goToLastPage,
            icon: 'last-page'
        },
        {
            type: 'zoomOut',
            label: 'Zoom Out',
            disabled: loading || scale <= 0.3,
            onClick: zoomOut,
            icon: 'zoom-out'
        },
        {
            type: 'zoomIn',
            label: 'Zoom In',
            disabled: loading,
            onClick: zoomIn,
            icon: 'zoom-in'
        },
        {
            type: 'reload',
            label: 'Reload',
            disabled: loading || !selectedDocument,
            onClick: reloadDocument,
            icon: 'refresh'
        }
    ];

    // Filter documents
    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['all', ...new Set(documents.map(doc => doc.category))];

    return (
        <div className={`pdf-viewer-optimized theme-${currentTheme}`}>
            {/* Header */}
            <header className="viewer-header">
                <div className="header-left">
                    <button className="sidebar-toggle" onClick={toggleSidebar}>
                        <i className="icon menu"></i>
                    </button>
                    <h1 className="app-title">PDF Professional Viewer</h1>
                </div>
                <div className="header-right">
                    <button className="theme-toggle" onClick={toggleTheme}>
                        <i className={`icon ${currentTheme === 'light' ? 'moon' : 'sun'}`}></i>
                    </button>
                </div>
            </header>

            <div className="viewer-layout">
                {/* Sidebar */}
                <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                    <div className="sidebar-header">
                        <h2>Documents</h2>
                        <button className="refresh-btn" onClick={fetchDocuments} disabled={listLoading}>
                            <i className={`icon ${listLoading ? 'loading' : 'refresh'}`}></i>
                        </button>
                    </div>

                    {/* Search and Filter */}
                    <div className="sidebar-toolbar">
                        <div className="search-box">
                            <i className="icon search"></i>
                            <input
                                type="text"
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={(e) => updateState({ searchQuery: e.target.value })}
                            />
                        </div>
                        <select
                            className="category-filter"
                            value={selectedCategory}
                            onChange={(e) => updateState({ selectedCategory: e.target.value })}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat === 'all' ? 'All Categories' : cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Document List */}
                    <div className="document-list">
                        {listLoading ? (
                            <div className="loading-list">
                                <div className="loading-spinner small"></div>
                                Loading documents...
                            </div>
                        ) : filteredDocuments.length === 0 ? (
                            <div className="empty-list">
                                <i className="icon search"></i>
                                No documents found
                            </div>
                        ) : (
                            filteredDocuments.map(renderDocumentItem)
                        )}
                    </div>
                </aside>

                {/* 🎯 MAIN CONTENT - CHIẾM TOÀN BỘ CHIỀU RỘNG CÒN LẠI */}
                <main className="main-content-optimized">
                    {/* Document Header - Fixed */}
                    {selectedDocument && (
                        <div className="document-header-fixed">
                            <div className="document-info-compact">
                                <div className="doc-title-section">
                                    <h2 className="doc-title">{selectedDocument.fileName}</h2>
                                    <div className="doc-badges">
                                        <span className="badge author">
                                            <i className="icon user"></i>
                                            {selectedDocument.author}
                                        </span>
                                        <span className="badge category">
                                            <i className="icon folder"></i>
                                            {selectedDocument.category}
                                        </span>
                                        <span className="badge pages">
                                            <i className="icon file"></i>
                                            {pageNumber} / {numPages || '--'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* PDF Controls - Fixed */}
                            <div className="pdf-controls-compact">
                                <div className="controls-group">
                                    <div className="page-navigation">
                                        {controlButtons.slice(0, 4).map(renderControlButton)}
                                    </div>
                                    <div className="zoom-controls">
                                        {controlButtons.slice(4, 6).map(renderControlButton)}
                                        <div className="zoom-level">{Math.round(scale * 100)}%</div>
                                        {controlButtons.slice(6).map(renderControlButton)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🎯 PDF VIEWER AREA - CHỈ CUỘN TRONG VÙNG NÀY */}
                    <div className="pdf-viewer-area">
                        {loading && renderLoadingState()}
                        {error && !loading && renderErrorState()}
                        {!selectedDocument && !loading && !error && renderEmptyState()}
                        {pdfUrl && !loading && !error && renderPdfViewer()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PdfViewerOptimized;