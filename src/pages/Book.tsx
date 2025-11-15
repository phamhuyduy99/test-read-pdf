import React from 'react';
import PdfViewerTrueFullWidth from '../components/PdfViewerTrueFullWidth/PdfViewerTrueFullWidth';
import type { DocumentTypeFile } from '../types';

const BookV5: React.FC = () => {
    const handleDocumentLoad = (document: DocumentTypeFile) => {
        console.log('Document loaded:', document.fileName);
    };

    const handlePageChange = (pageNumber: number) => {
        console.log('Page changed to:', pageNumber);
    };

    return (
        <div className="App">
            <PdfViewerTrueFullWidth
                initialDocumentId={"1"}
                onDocumentLoad={handleDocumentLoad}
                onPageChange={handlePageChange}
            />
        </div>
    );
};

export default BookV5;