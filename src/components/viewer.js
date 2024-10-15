import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './viewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const Viewer = ({ file }) => {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
    console.log(`Document loaded successfully with ${numPages} pages.`);
  };

  const onDocumentLoadError = (err) => {
    setError('Failed to load PDF file.');
  };

  return (
    <div className="pdf-viewer">
      {file ? (
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <div key={`page_${index + 1}`} className="pdf-page">
              <Page pageNumber={index + 1}/>
            </div>
          ))}
        </Document>
      ) : (
        <p className="no-pdf-message">No PDF file uploaded</p>
      )}
      {error && <p>{error}</p>}
    </div>
  );
};

export default Viewer;