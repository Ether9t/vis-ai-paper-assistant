import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './viewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const Viewer = ({ file, setTextContent, highlightedText }) => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1.0);
  const pageRefs = useRef([]);
  // console.log("highlightedText:", highlightedText); // 检查chat部分中高亮的文本是否传递成功

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5,
    };

    const callback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const pageNumber = parseInt(entry.target.getAttribute('data-page-number'));
          setCurrentPage(pageNumber);
        }
      });
    };

    const observer = new IntersectionObserver(callback, options);
    const pages = pageRefs.current;
    pageRefs.current.forEach((page) => {
      if (page) observer.observe(page);
    });

    return () => {
      if (observer) {
        pages.forEach((page) => {
          if (page) observer.unobserve(page);
        });
      }
    };
  }, [numPages]);

  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  const onDocumentLoadSuccess = async ({ numPages }) => {
    setNumPages(numPages);
    setError(null);

    const extractedText = [];
    const pdf = await pdfjs.getDocument(file).promise;
    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item) => item.str).join(' ');
      const cleanedText = textItems.replace(/\s+/g, ' ').trim();

      extractedText.push(cleanedText);
    }

    const fullText = extractedText.join(' ');

    const referenceIndex = fullText.indexOf('R EFERENCES');
    const finalText =
      referenceIndex !== -1 ? fullText.slice(0, referenceIndex) : fullText;

    setTextContent(finalText);
    setCurrentPage(1);
  };

  const onDocumentLoadError = (err) => {
    setError('Failed to load PDF file.');
  };

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
  };

  const handlePageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      updateCurrentPage();
    }
  };

  const handlePageInputBlur = () => {
    updateCurrentPage();
  };

  const updateCurrentPage = () => {
    const pageNumber = parseInt(pageInputValue, 10);
    if (!isNaN(pageNumber)) {
      const validPageNumber = Math.min(Math.max(pageNumber, 1), numPages);
      setCurrentPage(validPageNumber);
      const pageElement = pageRefs.current[validPageNumber - 1];
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setPageInputValue(currentPage.toString());
    }
  };

  const highlightText = (highlightedText, finalText) => {
    const fullTextTokens = finalText.split(/\s+/);
    const highlightedTokens = highlightedText.split(/\s+/);

    const highlightedSentence = highlightedTokens.map((word, index) => {
      let className = '';

      if (fullTextTokens.includes(word)) {
        className = `ngram`;
      }

      if (!fullTextTokens.includes(word)) {
        className = 'new-word';
      }

      if (/^[A-Z]/.test(word)) {
        className = 'new-entity';
      }

      return (
        <span key={index} className={className}>
          {word}{' '}
        </span>
      );
    });

    return highlightedSentence;
  };


  return (
    <div className="pdf-viewer-container">
      {file &&(
        <div className="controls fixed-controls">
          {/* <span>Page</span> */}
          <input
            type="number"
            value={pageInputValue}
            onChange={(e) => setPageInputValue(e.target.value)}
            onKeyDown={handlePageInputKeyDown}
            onBlur={handlePageInputBlur}
            min="1"
            max={numPages}
          />
          <span>/ {numPages}</span>
          <span className="light-text">&nbsp;|&nbsp;</span>
          {/* <span>Zoom</span> */}
          <button onClick={handleZoomOut}>-</button>
          {/* <span>{Math.round(scale * 100)}%</span> */}
          <button onClick={handleZoomIn}>+</button>
        </div>
      )}

      <div className="pdf-viewer">
        {/* 只有当 file 存在时才渲染 Document 组件，这个用来显示自定义的未上传pdf的提醒 */}
        {file ? (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
          >
            {numPages &&
              Array.from(new Array(numPages), (el, index) => (
                <div
                  key={`page_${index + 1}`}
                  className="pdf-page"
                  data-page-number={index + 1}
                  ref={(el) => (pageRefs.current[index] = el)}
                >
                  <Page pageNumber={index + 1} scale={scale} />
                </div>
              ))}
          </Document>
        ) : (
          <p className="no-pdf-message">No PDF file uploaded</p>
        )}
      </div>
      {highlightedText && (
        <div className="highlighted-text-container">
          <div className="highlighted-summary">
            {highlightText(highlightedText, file ? file : '')}
          </div>
        </div>
      )}
      {error && <p>{error}</p>}
    </div>
  );
};

export default Viewer;