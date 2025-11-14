import React from 'react';
import PdfViewerOptimized from '../components/PdfViewerFromAPI_v3/PdfViewerFromAPI_v3';

const BookV3: React.FC = () => {
    const handleDocumentLoad = (document: any) => {
        console.log('Document loaded:', document.fileName);
    };

    const handlePageChange = (pageNumber: number) => {
        console.log('Page changed to:', pageNumber);
    };

    return (
        <div className="App">
            <PdfViewerOptimized
                initialDocumentId={"1"}
                onDocumentLoad={handleDocumentLoad}
                onPageChange={handlePageChange}
            />
        </div>
    );
};

export default BookV3;