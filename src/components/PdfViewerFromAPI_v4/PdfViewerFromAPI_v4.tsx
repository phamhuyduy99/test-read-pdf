import React, { useState, useEffect, useCallback, type JSX } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PdfViewerTrueFullWidth.scss';
import { API_BASE_URL } from '../../constants';

// =============================================
// 🎯 TYPES & INTERFACES
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

interface ControlButton {
    type: string;
    label: string;
    disabled: boolean;
    onClick: () => void;
    icon: string;
}

// =============================================
// 🔧 CONFIGURATION
// =============================================
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// =============================================
// 🎨 PDF VIEWER TRUE FULL WIDTH COMPONENT
// =============================================
const PdfViewerTrueFullWidth: React.FC<ProfessionalPdfViewerProps> = ({
    initialDocumentId,
    onDocumentLoad,
    onPageChange,
    theme = 'light'
}) => {
    // =============================================
    // 🏪 STATE MANAGEMENT
    // =============================================
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

    const updateState = useCallback((updates: Partial<typeof state>): void => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // =============================================
    // 📡 API FUNCTIONS
    // =============================================
    const fetchDocuments = useCallback(async (): Promise<void> => {
        updateState({ listLoading: true, error: null });
        try {
            console.log('📡 Fetching documents from:', `${API_BASE_URL}/documents`);
            const response = await fetch(`${API_BASE_URL}/documents`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const docs: DocumentType[] = await response.json();
            console.log('✅ Received documents:', docs.length);

            updateState({
                documents: docs,
                listLoading: false
            });

            // Auto-select initial document if provided
            if (initialDocumentId && docs.length > 0) {
                const initialDoc = docs.find(doc => doc.id === initialDocumentId);
                if (initialDoc) {
                    console.log('🎯 Auto-selecting initial document:', initialDoc.fileName);
                    handleDocumentSelect(initialDoc);
                }
            }
        } catch (err) {
            console.error('❌ Error fetching documents:', err);
            updateState({
                error: 'Failed to load documents from server',
                listLoading: false
            });
        }
    }, [initialDocumentId, updateState]);

    const fetchPdf = useCallback(async (document: DocumentType): Promise<void> => {
        if (!document) return;

        updateState({
            loading: true,
            error: null
        });

        // Clean up previous PDF URL to prevent memory leaks
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            updateState({ pdfUrl: null });
        }

        try {
            console.log('📥 Downloading PDF:', document.fileName);
            const response = await fetch(`${API_BASE_URL}/pdfs/${document.filename}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Validate content type
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/pdf')) {
                throw new Error('Server response is not a valid PDF file');
            }

            const pdfBlob = await response.blob();
            console.log('✅ PDF blob received:', {
                size: pdfBlob.size,
                type: pdfBlob.type
            });

            // Create object URL for the PDF blob
            const objectUrl = URL.createObjectURL(pdfBlob);
            updateState({
                pdfUrl: objectUrl,
                selectedDocument: document,
                pageNumber: 1, // Reset to first page
                loading: false
            });

            // Call external callback if provided
            onDocumentLoad?.(document);
            console.log('🎉 PDF loaded successfully');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('❌ Error loading PDF:', errorMessage);
            updateState({
                error: `Failed to load PDF: ${errorMessage}`,
                loading: false
            });
        }
    }, [pdfUrl, onDocumentLoad, updateState]);

    // =============================================
    // ⚡ REACT EFFECTS
    // =============================================
    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    useEffect(() => {
        // Cleanup function to revoke object URLs
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    // =============================================
    // 🎮 EVENT HANDLERS
    // =============================================
    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }): void => {
        console.log(`📄 PDF document loaded: ${numPages} pages`);
        updateState({ numPages });
    }, [updateState]);

    const handleDocumentSelect = useCallback((document: DocumentType): void => {
        console.log('👆 Document selected:', document.fileName);
        fetchPdf(document);
    }, [fetchPdf]);

    const goToPreviousPage = useCallback((): void => {
        const newPage = Math.max(pageNumber - 1, 1);
        updateState({ pageNumber: newPage });
        onPageChange?.(newPage);
    }, [pageNumber, onPageChange, updateState]);

    const goToNextPage = useCallback((): void => {
        const newPage = Math.min(pageNumber + 1, numPages || 1);
        updateState({ pageNumber: newPage });
        onPageChange?.(newPage);
    }, [pageNumber, numPages, onPageChange, updateState]);

    const goToFirstPage = useCallback((): void => {
        updateState({ pageNumber: 1 });
        onPageChange?.(1);
    }, [onPageChange, updateState]);

    const goToLastPage = useCallback((): void => {
        updateState({ pageNumber: numPages || 1 });
        onPageChange?.(numPages || 1);
    }, [numPages, onPageChange, updateState]);

    const zoomIn = useCallback((): void => {
        updateState({ scale: scale + 0.2 });
    }, [scale, updateState]);

    const zoomOut = useCallback((): void => {
        updateState({ scale: Math.max(scale - 0.2, 0.3) });
    }, [scale, updateState]);

    const reloadDocument = useCallback((): void => {
        if (selectedDocument) {
            console.log('🔄 Reloading document:', selectedDocument.fileName);
            fetchPdf(selectedDocument);
        }
    }, [selectedDocument, fetchPdf]);

    const toggleSidebar = useCallback((): void => {
        updateState({ sidebarCollapsed: !sidebarCollapsed });
    }, [sidebarCollapsed, updateState]);

    const toggleTheme = useCallback((): void => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        updateState({ currentTheme: newTheme });
        console.log('🎨 Theme changed to:', newTheme);
    }, [currentTheme, updateState]);

    // =============================================
    // 🛠️ UTILITY FUNCTIONS
    // =============================================
    const formatFileSize = useCallback((bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, []);

    // const formatDate = useCallback((dateString: string): string => {
    //     return new Date(dateString).toLocaleDateString('vi-VN', {
    //         year: 'numeric',
    //         month: 'short',
    //         day: 'numeric'
    //     });
    // }, []);

    // =============================================
    // 🎨 RENDER FUNCTIONS
    // =============================================
    const renderDocumentItem = useCallback((doc: DocumentType): JSX.Element => (
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
                        <i className="icon size">📏</i>
                        {formatFileSize(doc.fileSize)}
                    </span>
                    <span className="meta-item">
                        <i className="icon pages">📄</i>
                        {doc.pages} pages
                    </span>
                </div>
                <div className="document-footer">
                    <span className="author">👤 {doc.author}</span>
                    <span className="category">📁 {doc.category}</span>
                </div>
            </div>
        </div>
    ), [selectedDocument, handleDocumentSelect, formatFileSize]);

    const renderControlButton = useCallback((button: ControlButton): JSX.Element => (
        <button
            key={button.type}
            onClick={button.onClick}
            disabled={button.disabled}
            className={`control-btn ${button.type}`}
            title={button.label}
        >
            <span className="btn-icon">{button.icon}</span>
            <span className="btn-label">{button.label}</span>
        </button>
    ), []);

    const renderLoadingState = useCallback((): JSX.Element => (
        <div className="pdf-loading-state">
            <div className="loading-spinner"></div>
            <p>Loading PDF document...</p>
        </div>
    ), []);

    const renderErrorState = useCallback((): JSX.Element => (
        <div className="pdf-error-state">
            <div className="error-icon">⚠️</div>
            <h3>Unable to Load Document</h3>
            <p>{error}</p>
            <button
                className="retry-btn"
                onClick={() => selectedDocument && fetchPdf(selectedDocument)}
            >
                Try Again
            </button>
        </div>
    ), [error, selectedDocument, fetchPdf]);

    const renderEmptyState = useCallback((): JSX.Element => (
        <div className="pdf-empty-state">
            <div className="empty-illustration">
                <span className="icon document">📄</span>
            </div>
            <h3>No Document Selected</h3>
            <p>Choose a document from the sidebar to begin viewing</p>
        </div>
    ), []);

    // 🎯 PDF VIEWER WITH TRUE FULL WIDTH
    const renderPdfViewer = useCallback((): JSX.Element => (
        <div className="pdf-scroll-container">
            <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(error: Error) => {
                    console.error('❌ PDF load error:', error);
                    updateState({ error: 'Failed to load PDF content' });
                }}
                loading={
                    <div className="pdf-loading">
                        <div className="loading-spinner small"></div>
                        Processing PDF...
                    </div>
                }
                className="pdf-document-fullwidth"
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
                    className="pdf-page-fullwidth"
                />
            </Document>
        </div>
    ), [pdfUrl, pageNumber, scale, onDocumentLoadSuccess, updateState]);

    // =============================================
    // 🎛️ CONTROL BUTTONS CONFIGURATION
    // =============================================
    const controlButtons: ControlButton[] = [
        {
            type: 'first',
            label: 'First',
            disabled: pageNumber <= 1 || loading,
            onClick: goToFirstPage,
            icon: '⏮️'
        },
        {
            type: 'previous',
            label: 'Previous',
            disabled: pageNumber <= 1 || loading,
            onClick: goToPreviousPage,
            icon: '◀️'
        },
        {
            type: 'next',
            label: 'Next',
            disabled: pageNumber >= (numPages || 1) || loading,
            onClick: goToNextPage,
            icon: '▶️'
        },
        {
            type: 'last',
            label: 'Last',
            disabled: pageNumber >= (numPages || 1) || loading,
            onClick: goToLastPage,
            icon: '⏭️'
        },
        {
            type: 'zoomOut',
            label: 'Zoom Out',
            disabled: loading || scale <= 0.3,
            onClick: zoomOut,
            icon: '🔍﹣'
        },
        {
            type: 'zoomIn',
            label: 'Zoom In',
            disabled: loading,
            onClick: zoomIn,
            icon: '🔍﹢'
        },
        {
            type: 'reload',
            label: 'Reload',
            disabled: loading || !selectedDocument,
            onClick: reloadDocument,
            icon: '🔄'
        }
    ];

    // =============================================
    // 🔍 DATA FILTERING
    // =============================================
    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['all', ...new Set(documents.map(doc => doc.category))];

    // =============================================
    // 🖼️ MAIN RENDER
    // =============================================
    return (
        <div className={`pdf-viewer-true-full-width theme-${currentTheme}`}>
            {/* Header */}
            <header className="viewer-header">
                <div className="header-left">
                    <button
                        className="sidebar-toggle"
                        onClick={toggleSidebar}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <span className="icon menu">☰</span>
                    </button>
                    <h1 className="app-title">PDF Professional Viewer</h1>
                </div>
                <div className="header-right">
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} theme`}
                    >
                        <span className={`icon ${currentTheme === 'light' ? 'moon' : 'sun'}`}>
                            {currentTheme === 'light' ? '🌙' : '☀️'}
                        </span>
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <div className="viewer-layout-true-full">
                {/* Sidebar */}
                <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                    <div className="sidebar-header">
                        <h2>Documents</h2>
                        <button
                            className="refresh-btn"
                            onClick={fetchDocuments}
                            disabled={listLoading}
                            title="Refresh documents list"
                        >
                            <span className={`icon ${listLoading ? 'loading' : 'refresh'}`}>
                                {listLoading ? '⏳' : '🔄'}
                            </span>
                        </button>
                    </div>

                    {/* Search and Filter */}
                    <div className="sidebar-toolbar">
                        <div className="search-box">
                            <span className="icon search">🔍</span>
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
                                <span className="icon search">🔍</span>
                                No documents found
                            </div>
                        ) : (
                            filteredDocuments.map(renderDocumentItem)
                        )}
                    </div>
                </aside>

                {/* 🎯 MAIN CONTENT - TRUE FULL WIDTH */}
                <main className="main-content-true-full">
                    {/* Document Header */}
                    {selectedDocument && (
                        <div className="document-header-true-full">
                            <div className="document-info-true-full">
                                <div className="doc-title-section">
                                    <h2 className="doc-title">{selectedDocument.fileName}</h2>
                                    <div className="doc-badges">
                                        <span className="badge author">
                                            <span className="icon user">👤</span>
                                            {selectedDocument.author}
                                        </span>
                                        <span className="badge category">
                                            <span className="icon folder">📁</span>
                                            {selectedDocument.category}
                                        </span>
                                        <span className="badge pages">
                                            <span className="icon file">📄</span>
                                            {pageNumber} / {numPages || '--'}
                                        </span>
                                    </div>
                                </div>
                                {selectedDocument.description && (
                                    <p className="doc-description">{selectedDocument.description}</p>
                                )}
                            </div>

                            {/* PDF Controls */}
                            <div className="pdf-controls-true-full">
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

                    {/* 🎯 PDF VIEWER AREA - TRUE FULL WIDTH */}
                    <div className="pdf-viewer-area-true-full">
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

export default PdfViewerTrueFullWidth;