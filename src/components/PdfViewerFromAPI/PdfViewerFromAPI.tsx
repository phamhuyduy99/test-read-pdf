import React, { useState, useEffect, useCallback, type JSX } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import styles from './PdfViewerWithMockAPI.module.css'; // Import CSS module

import type {
    Document as DocumentType,
    PdfViewerProps,
    PdfViewerState,
    DocumentLoadSuccess,
    ControlButton
} from '../types';

// =============================================
// 📋 CẤU HÌNH PDF.js WORKER - QUAN TRỌNG
// =============================================
/**
 * PDF.js cần một Web Worker để xử lý các tác vụ nặng (parse PDF, render) mà không block UI
 * Worker này chạy trong background thread
 * Nếu không cấu hình, ứng dụng sẽ báo lỗi và không hiển thị được PDF
 */
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// =============================================
// 🌐 CẤU HÌNH API - KẾT NỐI ĐẾN BACKEND
// =============================================
/**
 * Base URL cho mock server (json-server)
 * Trong production, thay đổi thành URL của backend thật
 * Có thể chuyển thành environment variable để dễ quản lý
 */
const API_BASE_URL: string = 'http://localhost:3001';

// =============================================
// 🎯 MAIN COMPONENT - PDF VIEWER VỚI MOCK API
// =============================================
/**
 * Component chính để xem PDF với dữ liệu từ mock API
 * 
 * Tính năng chính:
 * - Hiển thị danh sách documents từ API
 * - Xem nội dung PDF với chuyển trang, zoom
 * - Quản lý state tập trung với TypeScript types
 * - Xử lý lỗi và loading states
 * 
 * @param {PdfViewerProps} props - Props của component
 * @param {string} props.initialDocumentId - ID document để tự động chọn khi load
 * @param {Function} props.onDocumentLoad - Callback khi document load thành công
 * @param {Function} props.onPageChange - Callback khi trang thay đổi
 */
const PdfViewerWithMockAPI: React.FC<PdfViewerProps> = ({
    initialDocumentId,
    onDocumentLoad,
    onPageChange
}) => {
    // =============================================
    // 🏪 STATE MANAGEMENT - QUẢN LÝ TRẠNG THÁI
    // =============================================
    /**
     * Sử dụng single state object để quản lý tất cả state liên quan
     * Ưu điểm: 
     * - Dễ dàng theo dõi và debug
     * - Tránh được các vấn đề về stale state
     * - Có thể extract thành custom hook nếu cần tái sử dụng
     */
    const [state, setState] = useState<PdfViewerState>({
        pdfUrl: null,           // URL object cho PDF hiện tại (tạo từ URL.createObjectURL)
        documents: [],          // Danh sách documents từ API
        selectedDocument: null, // Document đang được chọn
        numPages: null,         // Tổng số trang của PDF hiện tại
        pageNumber: 1,          // Trang hiện tại đang xem (bắt đầu từ 1)
        scale: 1.0,            // Tỷ lệ zoom (1.0 = 100%)
        loading: false,        // Đang tải PDF file từ server
        listLoading: true,     // Đang tải danh sách documents từ API
        error: null            // Thông báo lỗi nếu có
    });

    // Destructure state để dễ sử dụng trong component
    // Giúp code clean hơn, không cần phải viết state.xxx mỗi lần sử dụng
    const {
        pdfUrl,
        documents,
        selectedDocument,
        numPages,
        pageNumber,
        scale,
        loading,
        listLoading,
        error
    } = state;

    // =============================================
    // 🔧 STATE UPDATE HELPER - TRỢ GIÚP CẬP NHẬT STATE
    // =============================================
    /**
     * Helper function để cập nhật state một cách dễ dàng
     * Thay vì phải viết setState(prev => ({ ...prev, ...updates })) mỗi lần
     * 
     * @param {Partial<PdfViewerState>} updates - Object chứa các state cần cập nhật
     */
    const updateState = (updates: Partial<PdfViewerState>): void => {
        setState(prev => ({ ...prev, ...updates }));
    };

    // =============================================
    // 📡 API FUNCTIONS - CÁC HÀM GỌI API
    // =============================================

    /**
     * Lấy danh sách documents từ mock API
     * - Gọi GET /documents để lấy danh sách
     * - Tự động chọn document đầu tiên nếu có initialDocumentId
     * - Xử lý loading state và error state
     */
    const fetchDocuments = useCallback(async (): Promise<void> => {
        // Reset state trước khi gọi API
        updateState({ listLoading: true, error: null });

        try {
            console.log('📡 Fetching documents list...');
            const response: Response = await fetch(`${API_BASE_URL}/documents`);

            // Kiểm tra HTTP status code
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const docs: DocumentType[] = await response.json();
            console.log('✅ Received documents:', docs.length);
            updateState({ documents: docs, listLoading: false });

            // Tự động chọn document nếu có initialDocumentId
            if (initialDocumentId && docs.length > 0) {
                const initialDoc = docs.find(doc => doc.id === initialDocumentId);
                if (initialDoc) {
                    handleDocumentSelect(initialDoc);
                }
            }
        } catch (err) {
            console.error('❌ Error fetching documents:', err);
            updateState({
                error: 'Không thể tải danh sách documents',
                listLoading: false
            });
        }
    }, [initialDocumentId]); // Chỉ recreate khi initialDocumentId thay đổi

    /**
     * Tải file PDF từ server và tạo URL object để hiển thị
     * - Gọi GET /pdfs/{filename} để lấy file PDF
     * - Tạo Blob URL từ response
     * - Giải phóng URL cũ để tránh memory leak
     * - Xử lý các loại lỗi (network, server, format)
     */
    const fetchPdf = useCallback(async (document: DocumentType): Promise<void> => {
        if (!document) return;

        updateState({ loading: true, error: null });

        // 🔄 QUAN TRỌNG: Giải phóng URL cũ trước khi tạo mới
        // Nếu không sẽ gây memory leak
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            updateState({ pdfUrl: null });
        }

        try {
            console.log(`📡 Downloading PDF: ${document.fileName}`);

            // Gọi API để lấy file PDF
            const response: Response = await fetch(`${API_BASE_URL}/pdfs/${document.filename}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Kiểm tra xem server có trả về PDF thật không
            const contentType: string | null = response.headers.get('content-type');
            if (!contentType?.includes('application/pdf')) {
                throw new Error('Server response is not a PDF');
            }

            // Chuyển response thành Blob object
            const pdfBlob: Blob = await response.blob();
            console.log('✅ Received PDF Blob:', {
                size: pdfBlob.size,
                type: pdfBlob.type
            });

            // Tạo URL object từ Blob - có thể dùng trực tiếp trong thẻ <embed> hoặc <iframe>
            const objectUrl: string = URL.createObjectURL(pdfBlob);
            updateState({
                pdfUrl: objectUrl,
                selectedDocument: document,
                pageNumber: 1, // Reset về trang đầu khi document thay đổi
                loading: false
            });

            // Gọi callback nếu được cung cấp
            onDocumentLoad?.(document);

            console.log('🎉 PDF loaded successfully');
        } catch (err) {
            const errorMessage: string = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('❌ Error loading PDF:', errorMessage);
            updateState({
                error: `Lỗi tải PDF: ${errorMessage}`,
                loading: false
            });
        }
    }, [pdfUrl, onDocumentLoad]); // Phụ thuộc vào pdfUrl và onDocumentLoad

    // =============================================
    // ⚡ REACT EFFECTS - XỬ LÝ SIDE EFFECTS
    // =============================================

    /**
     * Effect chạy khi component mount
     * - Gọi API lấy danh sách documents
     * - Chỉ chạy một lần (dependency array rỗng)
     */
    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]); // fetchDocuments được memoized bằng useCallback

    /**
     * Cleanup effect - QUAN TRỌNG để tránh memory leak
     * - Giải phóng URL object khi component unmount
     * - Nếu không revoke, browser sẽ giữ blob URL mãi mãi
     */
    useEffect(() => {
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]); // Chạy lại khi pdfUrl thay đổi

    // =============================================
    // 🎮 EVENT HANDLERS - XỬ LÝ SỰ KIỆN
    // =============================================

    /**
     * Callback khi PDF document load thành công
     * - Cập nhật tổng số trang
     * - Có thể thêm logic khác (như update UI, analytics, etc.)
     */
    const onDocumentLoadSuccess = useCallback(({ numPages }: DocumentLoadSuccess): void => {
        console.log(`📄 PDF loaded: ${numPages} pages`);
        updateState({ numPages });
    }, []);

    /**
     * Xử lý khi user chọn một document từ list
     * - Gọi API tải PDF
     * - Có thể thêm tracking analytics ở đây
     */
    const handleDocumentSelect = (document: DocumentType): void => {
        console.log('👆 Document selected:', document.fileName);
        fetchPdf(document);
    };

    /**
     * Chuyển đến trang trước
     * - Giới hạn không nhỏ hơn 1
     * - Gọi callback onPageChange nếu có
     */
    const goToPreviousPage = (): void => {
        const newPage: number = Math.max(pageNumber - 1, 1);
        updateState({ pageNumber: newPage });
        onPageChange?.(newPage); // Optional chaining - chỉ gọi nếu tồn tại
    };

    /**
     * Chuyển đến trang tiếp theo
     * - Giới hạn không lớn hơn tổng số trang
     * - Gọi callback onPageChange nếu có
     */
    const goToNextPage = (): void => {
        const newPage: number = Math.min(pageNumber + 1, numPages || 1);
        updateState({ pageNumber: newPage });
        onPageChange?.(newPage);
    };

    /**
     * Phóng to - tăng scale lên 0.2 (20%)
     * Không giới hạn maximum (có thể zoom thoải mái)
     */
    const zoomIn = (): void => {
        updateState({ scale: scale + 0.2 });
    };

    /**
     * Thu nhỏ - giảm scale xuống 0.2 (20%)
     * Giới hạn minimum là 0.3 (30%) để tránh zoom quá nhỏ
     */
    const zoomOut = (): void => {
        updateState({ scale: Math.max(scale - 0.2, 0.3) });
    };

    /**
     * Tải lại document hiện tại
     * - Useful khi PDF bị lỗi hoặc muốn refresh
     */
    const reloadDocument = (): void => {
        if (selectedDocument) {
            fetchPdf(selectedDocument);
        }
    };

    // =============================================
    // 🛠️ UTILITY FUNCTIONS - HÀM TIỆN ÍCH
    // =============================================

    /**
     * Format kích thước file từ bytes sang human readable
     * Ví dụ: 1048576 → "1 MB"
     */
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k: number = 1024;
        const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB'];
        const i: number = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    /**
     * Format date string sang định dạng Việt Nam
     * Ví dụ: "2024-01-15T10:30:00Z" → "15/01/2024"
     */
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    // =============================================
    // 🎛️ CONTROL BUTTONS CONFIG - CẤU HÌNH NÚT ĐIỀU KHIỂN
    // =============================================
    /**
     * Configuration cho các nút điều khiển
     * - Dễ dàng thêm/xóa/sửa các nút
     * - Logic tập trung một chỗ
     */
    const controlButtons: ControlButton[] = [
        {
            type: 'reload',
            label: loading ? 'Đang tải...' : 'Tải lại',
            disabled: loading || !selectedDocument,
            onClick: reloadDocument,
            icon: loading ? '⏳' : '🔄'
        },
        {
            type: 'previous',
            label: 'Trước',
            disabled: pageNumber <= 1 || loading,
            onClick: goToPreviousPage,
            icon: '←'
        },
        {
            type: 'next',
            label: 'Sau',
            disabled: pageNumber >= (numPages || 1) || loading,
            onClick: goToNextPage,
            icon: '→'
        },
        {
            type: 'zoomOut',
            label: 'Thu nhỏ',
            disabled: loading,
            onClick: zoomOut,
            icon: '🔍﹣'
        },
        {
            type: 'zoomIn',
            label: 'Phóng to',
            disabled: loading,
            onClick: zoomIn,
            icon: '🔍﹢'
        }
    ];

    // =============================================
    // 🎨 RENDER HELPER FUNCTIONS - HÀM HỖ TRỢ RENDER
    // =============================================
    // Tách các phần render ra thành các hàm riêng để code dễ đọc và maintain

    /**
     * Render một item trong danh sách documents
     */
    const renderDocumentItem = (doc: DocumentType): JSX.Element => (
        <div
            key={doc.id}
            className={`${styles.documentItem} ${selectedDocument?.id === doc.id ? styles.selected : ''}`}
            onClick={() => handleDocumentSelect(doc)}
        >
            <div className={styles.docIcon}>📄</div>
            <div className={styles.docInfo}>
                <div className={styles.docName}>{doc.fileName}</div>
                <div className={styles.docMeta}>
                    {formatFileSize(doc.fileSize)} • {doc.pages} trang
                </div>
                <div className={styles.docMeta}>
                    {formatDate(doc.uploadedAt)} • {doc.downloadCount} lượt xem
                </div>
            </div>
        </div>
    );

    /**
     * Render một nút điều khiển
     */
    const renderControlButton = (button: ControlButton): JSX.Element => (
        <button
            key={button.type}
            onClick={button.onClick}
            disabled={button.disabled}
            className={`${styles.controlBtn} ${styles[button.type]}`}
            title={button.label}
        >
            {button.icon}
        </button>
    );


    /**
     * Render trạng thái loading
     */
    const renderLoadingState = (): JSX.Element => (
        <div className={styles.loadingState}>
            <div className={styles.spinner}>⏳</div>
            <p>Đang tải PDF từ server...</p>
        </div>
    );

    /**
     * Render trạng thái lỗi
     */
    const renderErrorState = (): JSX.Element => (
        <div className={styles.errorState}>
            <div className={styles.errorIcon}>❌</div>
            <h3>Lỗi khi tải PDF</h3>
            <p>{error}</p>
            <button onClick={() => selectedDocument && fetchPdf(selectedDocument)}>
                Thử lại
            </button>
        </div>
    );

    /**
     * Render khi chưa có document nào được chọn
     */
    const renderEmptyState = (): JSX.Element => (
        <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📄</div>
            <h3>Chưa chọn document</h3>
            <p>Vui lòng chọn một document từ danh sách bên trái để bắt đầu xem</p>
        </div>
    );

    /**
     * Render PDF viewer với react-pdf components
     */
    const renderPdfViewer = (): JSX.Element => (
        <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error: Error) => {
                console.error('❌ Lỗi load PDF document:', error);
                updateState({ error: 'Không thể tải nội dung PDF' });
            }}
            loading={
                <div className={styles.pdfLoading}>
                    ⏳ Đang xử lý PDF...
                </div>
            }
        >
            <Page
                pageNumber={pageNumber}
                scale={scale}
                loading={
                    <div className={styles.pageLoading}>
                        ⏳ Đang render trang {pageNumber}...
                    </div>
                }
                renderTextLayer={true}      // Cho phép select text
                renderAnnotationLayer={true} // Hiển thị annotations (comments, links, etc.)
            />
        </Document>
    );




    // =============================================
    // 🖼️ MAIN RENDER - RENDER CHÍNH
    // =============================================
    return (
        <div className={styles.pdfMockViewer}>
            <div className={styles.layout}>
                {/* ============================================= */}
                {/* 📁 SIDEBAR - DANH SÁCH DOCUMENTS */}
                {/* ============================================= */}
                {/* Sidebar */}
                <div className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>📂 Documents</h2>
                        <button
                            onClick={fetchDocuments}
                            disabled={listLoading}
                            className={styles.refreshBtn}
                            title="Làm mới danh sách"
                        >
                            {listLoading ? '⟳' : '↻'}
                        </button>
                    </div>

                    {/* Conditional rendering cho sidebar content */}
                    {listLoading ? (
                        <div className={styles.loading}>Đang tải danh sách...</div>
                    ) : error ? (
                        <div className={styles.error}>
                            <p>{error}</p>
                            <button onClick={fetchDocuments}>Thử lại</button>
                        </div>
                    ) : (
                        <div className={styles.documentList}>
                            {documents.map(renderDocumentItem)}
                        </div>
                    )}
                </div>

                {/* ============================================= */}
                {/* 📄 MAIN CONTENT - PDF VIEWER */}
                {/* ============================================= */}
                <div className={styles.mainContent}>
                    {/* Header với thông tin document và controls */}
                    {selectedDocument && (
                        <div className={styles.pdfHeader}>
                            <div className={styles.documentInfo}>
                                <h3>{selectedDocument.fileName}</h3>
                                <div className={styles.docDetails}>
                                    <span>👤 {selectedDocument.author}</span>
                                    <span>📁 {selectedDocument.category}</span>
                                    <span>📏 {formatFileSize(selectedDocument.fileSize)}</span>
                                    <span>📅 {formatDate(selectedDocument.uploadedAt)}</span>
                                </div>
                                <p className={styles.docDescription}>{selectedDocument.description}</p>
                            </div>

                            <div className={styles.controls}>
                                <div className={styles.pageInfo}>
                                    Trang {pageNumber} / {numPages || '--'}
                                </div>
                                <div className={styles.zoomInfo}>
                                    {Math.round(scale * 100)}%
                                </div>
                                <div className={styles.controlButtons}>
                                    {controlButtons.map(renderControlButton)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Container hiển thị PDF hoặc các states */}
                    <div className={styles.pdfContainer}>
                        {loading && renderLoadingState()}
                        {error && !loading && renderErrorState()}
                        {!selectedDocument && !loading && !error && renderEmptyState()}
                        {pdfUrl && !loading && !error && renderPdfViewer()}
                    </div>
                </div>
            </div>
        </div>
    );


};

export default PdfViewerWithMockAPI;