import React from 'react';
import PdfViewerWithMockAPI from '../components/PdfViewerFromAPI/PdfViewerFromAPI';

const Book: React.FC = () => {
    const handleDocumentLoad = (document: any) => {
        console.log('Document loaded:', document.fileName);
    };

    const handlePageChange = (pageNumber: number) => {
        console.log('Page changed to:', pageNumber);
    };

    return (
        <div className="App">
            <PdfViewerWithMockAPI
                initialDocumentId={1}
                onDocumentLoad={handleDocumentLoad}
                onPageChange={handlePageChange}
            />
        </div>
    );
};

export default Book;