import React from 'react';
import PdfViewerTrueFullWidth from '../components/PdfViewerFromAPI_v4/PdfViewerFromAPI_v4';

const BookV4: React.FC = () => {
    const handleDocumentLoad = (document: any) => {
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

export default BookV4;