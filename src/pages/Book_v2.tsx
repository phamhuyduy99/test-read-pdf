import React from 'react';
import PdfViewerProfessional from '../components/PdfViewerFromAPI_v2/PdfViewerFromAPI_v2';

const BookV2: React.FC = () => {
    const handleDocumentLoad = (document: any) => {
        console.log('Document loaded:', document.fileName);
    };

    const handlePageChange = (pageNumber: number) => {
        console.log('Page changed to:', pageNumber);
    };

    return (
        <div className="App">
            <PdfViewerProfessional
                initialDocumentId={"1"}
                onDocumentLoad={handleDocumentLoad}
                onPageChange={handlePageChange}
            />
        </div>
    );
};

export default BookV2;