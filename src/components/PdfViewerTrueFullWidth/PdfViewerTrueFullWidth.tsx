import React, { useState, useEffect, useCallback, type JSX } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PdfViewerTrueFullWidth.scss';
import { API_BASE_URL } from '../../constants';

// 📦 Import React Icons
import {
    FaFilePdf,
    FaUser,
    FaFolder,
    FaSearch,
    FaUndo,
    FaStepBackward,
    FaStepForward,
    FaFastForward,
    FaFastBackward,
    FaSearchPlus,
    FaSearchMinus,
    FaSun,
    FaMoon,
    FaBars,
    FaFile,
    FaExclamationTriangle,
    FaSpinner,
    FaDatabase,
} from 'react-icons/fa';
import type { DocumentTypeFile } from '../../types';

// =============================================
// 🎯 TYPES & INTERFACES - ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =============================================

/**
 * 🎯 PROPS INTERFACE - ĐỊNH NGHĨA CÁC PROP NHẬN VÀO COMPONENT
 * @param initialDocumentId - ID tài liệu được chọn ban đầu (optional)
 * @param onDocumentLoad - Callback khi tài liệu được tải thành công
 * @param onPageChange - Callback khi số trang thay đổi
 * @param theme - Chủ đề giao diện: light/dark/auto
 */
interface ProfessionalPdfViewerProps {
    initialDocumentId?: string;
    onDocumentLoad?: (document: DocumentTypeFile) => void;
    onPageChange?: (page: number) => void;
    theme?: 'light' | 'dark' | 'auto';
}

/**
 * 🎯 CONTROL BUTTON INTERFACE - ĐỊNH NGHĨA CẤU TRÚC NÚT ĐIỀU KHIỂN
 * @param type - Loại nút (first, previous, next, last, zoomIn, zoomOut, reload)
 * @param label - Nhãn hiển thị
 * @param disabled - Trạng thái vô hiệu hóa
 * @param onClick - Hàm xử lý khi click
 * @param icon - Biểu tượng React Icon
 */
interface ControlButton {
    type: string;
    label: string;
    disabled: boolean;
    onClick: () => void;
    icon: JSX.Element;
}

// =============================================
// 🔧 CONFIGURATION - CẤU HÌNH PDF.JS WORKER
// =============================================

/**
 * 🎯 PDF.JS WORKER CONFIGURATION - CẤU HÌNH QUAN TRỌNG CHO PDF RENDERING
 * - Worker xử lý các tác vụ nặng của PDF trong background thread
 * - Ngăn chặn blocking main thread, cải thiện performance
 * - Sử dụng CDN unpkg để tự động lấy version mới nhất
 */
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// =============================================
// 🎨 PDF VIEWER TRUE FULL WIDTH COMPONENT
// =============================================

/**
 * 🎯 MAIN COMPONENT - PDF VIEWER CHUYÊN NGHIỆP VỚI CHẾ ĐỘ FULL WIDTH
 * - Hỗ trợ xem PDF với chiều rộng tối đa, tận dụng không gian màn hình
 * - Có sidebar quản lý danh sách tài liệu
 * - Hỗ trợ nhiều chức năng: zoom, navigation, search, filter
 * - Responsive design với theme support
 */
const PdfViewerTrueFullWidth: React.FC<ProfessionalPdfViewerProps> = ({
    initialDocumentId,
    onDocumentLoad,
    onPageChange,
    theme = 'light'
}) => {
    // =============================================
    // 🏪 STATE MANAGEMENT - QUẢN LÝ STATE TỐI ƯU
    // =============================================

    /**
     * 🎯 SINGLE STATE OBJECT PATTERN - QUẢN LÝ STATE TRONG MỘT OBJECT DUY NHẤT
     * - Ưu điểm: Dễ quản lý, tránh scattered state, optimize re-render
     * - Tránh stale closure trong useCallback dependencies
     * - Dễ dàng debug và theo dõi state changes
     */
    const [state, setState] = useState({
        pdfUrl: null as string | null,           // 🎯 Object URL cho PDF blob (quan trọng: cần revoke khi unmount)
        documents: [] as DocumentTypeFile[],     // 🎯 Danh sách tất cả documents từ API
        selectedDocument: null as DocumentTypeFile | null, // 🎯 Document đang được chọn
        numPages: null as number | null,         // 🎯 Tổng số trang PDF (lấy từ PDF metadata)
        pageNumber: 1,                           // 🎯 Trang hiện tại (bắt đầu từ 1)
        scale: 1.0,                              // 🎯 Tỉ lệ zoom (1.0 = 100%)
        loading: false,                          // 🎯 Trạng thái loading PDF
        listLoading: true,                       // 🎯 Trạng thái loading danh sách documents
        error: null as string | null,            // 🎯 Thông báo lỗi nếu có
        sidebarCollapsed: false,                 // 🎯 Trạng thái ẩn/hiện sidebar
        currentTheme: theme,                     // 🎯 Chủ đề hiện tại (light/dark)
        searchQuery: '',                         // 🎯 Từ khóa tìm kiếm documents
        selectedCategory: 'all'                  // 🎯 Danh mục được chọn để filter
    });

    // 🎯 DESTRUCTURING STATE - LẤY CÁC GIÁ TRỊ TỪ STATE
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

    /**
     * 🎯 UPDATE STATE HELPER - HÀM HỖ TRỢ CẬP NHẬT STATE BÁN PHẦN
     * - Hoạt động tương tự useState nhưng cho phép update partial state
     * - Tránh việc phải tạo nhiều setState functions
     * - Đảm bảo tính consistency của state object
     */
    const updateState = useCallback((updates: Partial<typeof state>): void => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // =============================================
    // 📡 API FUNCTIONS - XỬ LÝ API CALLS VÀ DATA FETCHING
    // =============================================

    /**
     * 🎯 FETCH DOCUMENTS - LẤY DANH SÁCH DOCUMENTS TỪ SERVER
     * - Gọi API để lấy metadata của tất cả documents
     * - Xử lý auto-select document nếu có initialDocumentId
     * - Error handling chi tiết với user-friendly messages
     */
    const fetchDocuments = useCallback(async (): Promise<void> => {
        updateState({ listLoading: true, error: null });
        try {
            console.log('📡 Fetching documents from:', `${API_BASE_URL}/documents`);
            const response = await fetch(`${API_BASE_URL}/documents`);

            // 🎯 HTTP ERROR HANDLING - KIỂM TRA STATUS CODE
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const docs: DocumentTypeFile[] = await response.json();
            console.log('✅ Received documents:', docs.length);

            updateState({
                documents: docs,
                listLoading: false
            });

            /**
             * 🎯 AUTO-SELECT INITIAL DOCUMENT - TỰ ĐỘNG CHỌN DOCUMENT BAN ĐẦU
             * - Chỉ thực hiện khi có initialDocumentId và danh sách documents không rỗng
             * - Tìm document có ID trùng khớp và gọi handleDocumentSelect
             */
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

    /**
     * 🎯 FETCH PDF - TẢI NỘI DUNG PDF FILE TỪ SERVER
     * - Quan trọng: Xử lý memory management với Object URLs
     * - Validation content type để đảm bảo đúng định dạng PDF
     * - Error handling chi tiết cho nhiều loại lỗi
     */
    const fetchPdf = useCallback(async (document: DocumentTypeFile): Promise<void> => {
        if (!document) return;

        updateState({
            loading: true,
            error: null
        });

        /**
         * 🎯 MEMORY LEAK PREVENTION - NGĂN CHẶN RÒ RỈ BỘ NHỚ
         * - Luôn revoke ObjectURL cũ trước khi tạo mới
         * - ObjectURL là tài nguyên hệ thống, cần được giải phóng
         * - Quan trọng khi component unmount hoặc load PDF mới
         */
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            updateState({ pdfUrl: null });
        }

        try {
            console.log('📥 Downloading PDF:', document.fileName);
            const response = await fetch(`${API_BASE_URL}/pdfs/${document.filename}`);

            // 🎯 HTTP STATUS VALIDATION - KIỂM TRA RESPONSE STATUS
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            /**
             * 🎯 CONTENT TYPE VALIDATION - KIỂM TRA ĐỊNH DẠNG FILE
             * - Đảm bảo server trả về đúng định dạng PDF
             * - Ngăn chặn xử lý file độc hại hoặc không đúng định dạng
             * - Tránh lỗi runtime khi blob không phải PDF
             */
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/pdf')) {
                throw new Error('Server response is not a valid PDF file');
            }

            /**
             * 🎯 BLOB PROCESSING - XỬ LÝ PDF DẠNG BLOB
             * - Sử dụng Blob thay vì base64 để tiết kiệm memory (~33%)
             * - ObjectURL cho phép browser caching và streaming
             * - Hiệu suất tốt hơn với file lớn
             */
            const pdfBlob = await response.blob();
            console.log('✅ PDF blob received:', {
                size: pdfBlob.size,
                type: pdfBlob.type
            });

            // 🎯 CREATE OBJECT URL - TẠO URL CHO PDF BLOB
            const objectUrl = URL.createObjectURL(pdfBlob);
            updateState({
                pdfUrl: objectUrl,
                selectedDocument: document,
                pageNumber: 1, // 🎯 RESET VỀ TRANG ĐẦU TIÊN
                loading: false
            });

            // 🎯 EXTERNAL CALLBACK - GỌI CALLBACK CỦA PARENT COMPONENT
            onDocumentLoad?.(document);
            console.log('🎉 PDF loaded successfully');

        } catch (err) {
            /**
             * 🎯 COMPREHENSIVE ERROR HANDLING - XỬ LÝ LỖI TOÀN DIỆN
             * - Phân loại lỗi: Network, HTTP, Validation, Unknown
             * - Cung cấp thông báo lỗi chi tiết cho người dùng
             * - Cho phép retry với đầy đủ context
             */
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('❌ Error loading PDF:', errorMessage);
            updateState({
                error: `Failed to load PDF: ${errorMessage}`,
                loading: false
            });
        }
    }, [pdfUrl, onDocumentLoad, updateState]);

    // =============================================
    // ⚡ REACT EFFECTS - LIFECYCLE & SIDE EFFECTS
    // =============================================

    /**
     * 🎯 INITIAL DATA FETCH - LẤY DỮ LIỆU KHI COMPONENT MOUNT
     * - Chỉ chạy một lần khi component mounted
     * - Dependency là fetchDocuments (memoized với useCallback)
     */
    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    /**
     * 🎯 CLEANUP EFFECT - DỌN DẸP KHI COMPONENT UNMOUNT
     * - Quan trọng: Revoke ObjectURL để tránh memory leak
     * - ObjectURL là tài nguyên hệ thống cần được release
     */
    useEffect(() => {
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    // =============================================
    // 🎮 EVENT HANDLERS - XỬ LÝ SỰ KIỆN NGƯỜI DÙNG
    // =============================================

    /**
     * 🎯 DOCUMENT LOAD SUCCESS - CALLBACK KHI PDF LOAD THÀNH CÔNG
     * - Nhận metadata từ PDF.js (số trang, thông tin document)
     * - Cập nhật state với tổng số trang
     */
    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }): void => {
        console.log(`📄 PDF document loaded: ${numPages} pages`);
        updateState({ numPages });
    }, [updateState]);

    /**
     * 🎯 DOCUMENT SELECTION - XỬ LÝ KHI NGƯỜI DÙNG CHỌN DOCUMENT
     * - Gọi fetchPdf để tải nội dung PDF
     * - Reset page number về 1 khi chọn document mới
     */
    const handleDocumentSelect = useCallback((document: DocumentTypeFile): void => {
        console.log('👆 Document selected:', document.fileName);
        fetchPdf(document);
    }, [fetchPdf]);

    /**
     * 🎯 PAGE NAVIGATION - ĐIỀU HƯỚNG TRANG
     * - Sử dụng Math.min/Math.max để đảm bảo page number trong valid range
     * - Gọi callback onPageChange để thông báo cho parent component
     */
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

    /**
     * 🎯 ZOOM CONTROLS - ĐIỀU KHIỂN PHÓNG TO/THU NHỎ
     * - Zoom step: 0.2 (20%) cho cảm giác mượt mà
     * - Giới hạn zoom tối thiểu ở 0.3 (30%) để đảm bảo readability
     */
    const zoomIn = useCallback((): void => {
        updateState({ scale: scale + 0.2 });
    }, [scale, updateState]);

    const zoomOut = useCallback((): void => {
        updateState({ scale: Math.max(scale - 0.2, 0.3) });
    }, [scale, updateState]);

    /**
     * 🎯 RELOAD DOCUMENT - TẢI LẠI DOCUMENT HIỆN TẠI
     * - Useful khi có lỗi network hoặc cần refresh content
     */
    const reloadDocument = useCallback((): void => {
        if (selectedDocument) {
            console.log('🔄 Reloading document:', selectedDocument.fileName);
            fetchPdf(selectedDocument);
        }
    }, [selectedDocument, fetchPdf]);

    /**
     * 🎯 UI CONTROLS - ĐIỀU KHIỂN GIAO DIỆN
     * - Toggle sidebar (hiện tại bị disable với return)
     * - Toggle theme giữa light/dark mode
     */
    const toggleSidebar = useCallback((): void => {
        return;
        // updateState({ sidebarCollapsed: !sidebarCollapsed });
    }, [sidebarCollapsed, updateState]);

    const toggleTheme = useCallback((): void => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        updateState({ currentTheme: newTheme });
        console.log('🎨 Theme changed to:', newTheme);
    }, [currentTheme, updateState]);

    // =============================================
    // 🛠️ UTILITY FUNCTIONS - HÀM TIỆN ÍCH
    // =============================================

    /**
     * 🎯 FORMAT FILE SIZE - ĐỊNH DẠNG KÍCH THƯỚC FILE
     * - Chuyển đổi bytes sang các đơn vị phù hợp (KB, MB, GB)
     * - Sử dụng logarit để tính toán đơn vị chính xác
     * - Format số với 2 decimal places
     */
    const formatFileSize = useCallback((bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, []);

    // =============================================
    // 🎨 RENDER FUNCTIONS - CÁC HÀM RENDER COMPONENT
    // =============================================

    /**
     * 🎯 RENDER DOCUMENT ITEM - RENDER MỖI ITEM TRONG DANH SÁCH DOCUMENTS
     * - Hiển thị thông tin document: icon, title, metadata
     * - Highlight document đang được chọn
     * - Format file size và các metadata khác
     */
    const renderDocumentItem = useCallback((doc: DocumentTypeFile): JSX.Element => (
        <div
            key={doc.id}
            className={`document-item ${selectedDocument?.id === doc.id ? 'selected' : ''}`}
            onClick={() => handleDocumentSelect(doc)}
        >
            <div className="document-icon">
                <div className="file-type">
                    <FaFilePdf size={24} color="#e74c3c" />
                </div>
            </div>
            <div className="document-content">
                <h4 className="document-title">{doc.fileName}</h4>
                <div className="document-meta">
                    <span className="meta-item">
                        <FaDatabase size={12} className="icon size" />
                        {formatFileSize(doc.fileSize)}
                    </span>
                    <span className="meta-item">
                        <FaFile size={12} className="icon pages" />
                        {doc.pages} pages
                    </span>
                </div>
                <div className="document-footer">
                    <span className="author">
                        <FaUser size={10} className="icon user" />
                        {doc.author}
                    </span>
                    <span className="category">
                        <FaFolder size={10} className="icon folder" />
                        {doc.category}
                    </span>
                </div>
            </div>
        </div>
    ), [selectedDocument, handleDocumentSelect, formatFileSize]);

    /**
     * 🎯 RENDER CONTROL BUTTON - RENDER NÚT ĐIỀU KHIỂN ĐƠN LẺ
     * - Sử dụng cho tất cả control buttons với config thống nhất
     * - Có tooltip (title) cho accessibility
     * - Disabled state với visual feedback
     */
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

    /**
     * 🎯 RENDER LOADING STATE - HIỂN THỊ KHI ĐANG TẢI PDF
     * - Spinner animation với descriptive text
     * - Cho user biết PDF đang được xử lý
     */
    const renderLoadingState = useCallback((): JSX.Element => (
        <div className="pdf-loading-state">
            <FaSpinner size={32} className="loading-spinner" />
            <p>Loading PDF document...</p>
        </div>
    ), []);

    /**
     * 🎯 RENDER ERROR STATE - HIỂN THỊ KHI CÓ LỖI
     * - Error icon với message chi tiết
     * - Retry button để thử tải lại
     */
    const renderErrorState = useCallback((): JSX.Element => (
        <div className="pdf-error-state">
            <FaExclamationTriangle size={48} color="#e74c3c" className="error-icon" />
            <h3>Unable to Load Document</h3>
            <p>{error}</p>
            <button
                className="retry-btn"
                onClick={() => selectedDocument && fetchPdf(selectedDocument)}
            >
                <FaUndo size={14} style={{ marginRight: '8px' }} />
                Try Again
            </button>
        </div>
    ), [error, selectedDocument, fetchPdf]);

    /**
     * 🎯 RENDER EMPTY STATE - HIỂN THỊ KHI CHƯA CHỌN DOCUMENT
     * - Hướng dẫn user chọn document từ sidebar
     * - Illustration với PDF icon
     */
    const renderEmptyState = useCallback((): JSX.Element => (
        <div className="pdf-empty-state">
            <div className="empty-illustration">
                <FaFilePdf size={64} color="#bdc3c7" className="icon document" />
            </div>
            <h3>No Document Selected</h3>
            <p>Choose a document from the sidebar to begin viewing</p>
        </div>
    ), []);

    /**
     * 🎯 RENDER PDF VIEWER - COMPONENT HIỂN THỊ PDF CHÍNH
     * - Sử dụng react-pdf Document và Page components
     * - TextLayer và AnnotationLayer cho interactive PDF
     * - Full-width styling với responsive container
     * - Error boundary và loading states cho từng phần
     */
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
                        <FaSpinner size={20} className="loading-spinner small" />
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
                            <FaSpinner size={20} className="loading-spinner small" />
                            Rendering page {pageNumber}...
                        </div>
                    }
                    renderTextLayer={true}  // 🎯 CHO PHÉP SELECT TEXT
                    renderAnnotationLayer={true} // 🎯 CHO PHÉP INTERACT VỚI LINKS & ANNOTATIONS
                    className="pdf-page-fullwidth"
                />
            </Document>
        </div>
    ), [pdfUrl, pageNumber, scale, onDocumentLoadSuccess, updateState]);

    // =============================================
    // 🎛️ CONTROL BUTTONS CONFIGURATION - CẤU HÌNH NÚT ĐIỀU KHIỂN
    // =============================================

    /**
     * 🎯 CONTROL BUTTONS CONFIG - CẤU HÌNH TẬP TRUNG CHO TẤT CẢ NÚT ĐIỀU KHIỂN
     * - Declarative approach: Dễ quản lý và mở rộng
     * - Dynamic disabled states dựa trên current state
     * - Unified rendering với renderControlButton function
     */
    const controlButtons: ControlButton[] = [
        {
            type: 'first',
            label: 'First',
            disabled: pageNumber <= 1 || loading, // 🎯 DISABLE KHI Ở TRANG ĐẦU HOẶC ĐANG LOADING
            onClick: goToFirstPage,
            icon: <FaFastBackward size={16} />
        },
        {
            type: 'previous',
            label: 'Previous',
            disabled: pageNumber <= 1 || loading,
            onClick: goToPreviousPage,
            icon: <FaStepBackward size={16} />
        },
        {
            type: 'next',
            label: 'Next',
            disabled: pageNumber >= (numPages || 1) || loading, // 🎯 DISABLE KHI Ở TRANG CUỐI
            onClick: goToNextPage,
            icon: <FaStepForward size={16} />
        },
        {
            type: 'last',
            label: 'Last',
            disabled: pageNumber >= (numPages || 1) || loading,
            onClick: goToLastPage,
            icon: <FaFastForward size={16} />
        },
        {
            type: 'zoomOut',
            label: 'Zoom Out',
            disabled: loading || scale <= 0.3, // 🎯 DISABLE KHI ĐẠT ZOOM MIN
            onClick: zoomOut,
            icon: <FaSearchMinus size={16} />
        },
        {
            type: 'zoomIn',
            label: 'Zoom In',
            disabled: loading, // 🎯 CHỈ DISABLE KHI LOADING, ZOOM KHÔNG GIỚI HẠN MAX
            onClick: zoomIn,
            icon: <FaSearchPlus size={16} />
        },
        {
            type: 'reload',
            label: 'Reload',
            disabled: loading || !selectedDocument, // 🎯 DISABLE KHI KHÔNG CÓ DOCUMENT
            onClick: reloadDocument,
            icon: <FaUndo size={16} />
        }
    ];

    // =============================================
    // 🔍 DATA FILTERING - LỌC VÀ TÌM KIẾM DỮ LIỆU
    // =============================================

    /**
     * 🎯 FILTERED DOCUMENTS - LỌC DANH SÁCH DOCUMENTS THEO SEARCH VÀ CATEGORY
     * - Search: Tìm trong fileName và author (case-insensitive)
     * - Category: Lọc theo category selected
     * - Real-time filtering với search query
     */
    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    /**
     * 🎯 CATEGORIES EXTRACTION - TRÍCH XUẤT DANH MỤC TỪ DOCUMENTS
     * - Sử dụng Set để loại bỏ duplicates
     * - Thêm 'all' option để hiển thị tất cả categories
     */
    const categories = ['all', ...new Set(documents.map(doc => doc.category))];

    // =============================================
    // 🖼️ MAIN RENDER - RENDER CHÍNH CỦA COMPONENT
    // =============================================

    return (
        <div className={`pdf-viewer-true-full-width theme-${currentTheme}`}>
            {/* 🎯 HEADER - THANH TIÊU ĐỀ ỨNG DỤNG */}
            <header className="viewer-header">
                <div className="header-left">
                    <button
                        className="sidebar-toggle"
                        onClick={toggleSidebar}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <FaBars size={18} className="" />
                    </button>
                    <h1 className="app-title">PDF Professional Viewer</h1>
                </div>
                <div className="header-right">
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} theme`}
                    >
                        {currentTheme === 'light' ? (
                            <FaMoon size={16} className="" />
                        ) : (
                            <FaSun size={16} className="" />
                        )}
                    </button>
                </div>
            </header>

            {/* 🎯 MAIN LAYOUT - LAYOUT CHÍNH VỚI SIDEBAR VÀ CONTENT */}
            <div className="viewer-layout-true-full">
                {/* 🎯 SIDEBAR - DANH SÁCH DOCUMENTS VÀ BỘ LỌC */}
                <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                    <div className="sidebar-header">
                        <h2>Documents</h2>
                        <button
                            className="refresh-btn"
                            onClick={fetchDocuments}
                            disabled={listLoading}
                            title="Refresh documents list"
                        >
                            {listLoading ? (
                                <FaSpinner size={16} className="icon loading spin" />
                            ) : (
                                <FaUndo size={16} className="" />
                            )}
                        </button>
                    </div>

                    {/* 🎯 SEARCH AND FILTER - THANH TÌM KIẾM VÀ LỌC */}
                    <div className="sidebar-toolbar">
                        <div className="search-box">
                            <FaSearch size={16} className="absolute top-4 left-4" />
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

                    {/* 🎯 DOCUMENT LIST - DANH SÁCH DOCUMENTS ĐÃ LỌC */}
                    <div className="document-list">
                        {listLoading ? (
                            <div className="loading-list">
                                <FaSpinner size={20} className="loading-spinner small spin" />
                                Loading documents...
                            </div>
                        ) : filteredDocuments.length === 0 ? (
                            <div className="empty-list">
                                <FaSearch size={24} className="icon search" />
                                No documents found
                            </div>
                        ) : (
                            filteredDocuments.map(renderDocumentItem)
                        )}
                    </div>
                </aside>

                {/* 🎯 MAIN CONTENT - NỘI DUNG CHÍNH VỚI CHẾ ĐỘ TRUE FULL WIDTH */}
                <main className="main-content-true-full">
                    {/* 🎯 DOCUMENT HEADER - THÔNG TIN DOCUMENT VÀ ĐIỀU KHIỂN */}
                    {selectedDocument && (
                        <div className="document-header-true-full">
                            <div className="document-info-true-full">
                                <div className="doc-title-section">
                                    <h2 className="doc-title">{selectedDocument.fileName}</h2>
                                    <div className="doc-badges">
                                        <span className="badge author">
                                            <FaUser size={12} className="icon user" />
                                            {selectedDocument.author}
                                        </span>
                                        <span className="badge category">
                                            <FaFolder size={12} className="icon folder" />
                                            {selectedDocument.category}
                                        </span>
                                        <span className="badge pages">
                                            <FaFile size={12} className="icon file" />
                                            {pageNumber} / {numPages || '--'}
                                        </span>
                                    </div>
                                </div>
                                {selectedDocument.description && (
                                    <p className="doc-description">{selectedDocument.description}</p>
                                )}
                            </div>

                            {/* 🎯 PDF CONTROLS - CÁC NÚT ĐIỀU KHIỂN PDF */}
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

                    {/* 🎯 PDF VIEWER AREA - VÙNG HIỂN THỊ PDF TRUE FULL WIDTH */}
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