import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './viewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const Viewer = ({ file, setTextContent }) => {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = async ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
  
    const extractedText = [];
    const pdf = await pdfjs.getDocument(file).promise;
    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map(item => item.str).join(' ');
      const cleanedText = textItems.replace(/\s+/g, ' ').trim();
  
      extractedText.push(cleanedText);
    }

    const fullText = extractedText.join(' ');

    const referenceIndex = fullText.indexOf('R EFERENCES');
    const finalText = referenceIndex !== -1 ? fullText.slice(0, referenceIndex) : fullText;
  
    setTextContent(finalText);
  };
  
  const onDocumentLoadError = (err) => {
    setError('Failed to load PDF file.');
  };

  return (
    <div className="pdf-viewer">
      {file ? (
        <>
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div key={`page_${index + 1}`} className="pdf-page">
                <Page pageNumber={index + 1} />
              </div>
            ))}
          </Document>
        </>
      ) : (
        <p className="no-pdf-message">No PDF file uploaded</p>
      )}
      {error && <p>{error}</p>}
    </div>
  );
};

export default Viewer;