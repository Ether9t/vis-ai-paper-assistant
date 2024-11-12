import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [currentPage, setCurrentPage] = useState(1); // 设置初始页数是1
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

  const loadTextContent = useCallback(async () => {
    if (file) {
      const extractedText = [];
      const pdf = await pdfjs.getDocument(file).promise;
      const numPages = await pdf.numPages;
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
    }
  }, [file, setTextContent]);

  useEffect(() => {
    if (file) {
      loadTextContent();
    }
  }, [file, loadTextContent]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
    setCurrentPage(1);
  };
  
  const onDocumentLoadError = (err) => {
    setError('Failed to load PDF file.');
  };
  
  useEffect(() => {
    if (numPages > 0) {
      const interval = setInterval(() => {
        setCurrentPage((prevPage) => {
          if (prevPage < numPages) {
            return prevPage + 1;
          } else {
            clearInterval(interval);
            return prevPage;
          }
        });
      }, 2000); // 每2秒加载一页，因为不知道为什么加载大文件会直接黑屏
  
      return () => clearInterval(interval);
    }
  }, [numPages]); 

  useEffect(() => {
    if (currentPage > 1 && currentPage <= numPages) {
      console.log(`Now on page ${currentPage}`);
    }
  }, [currentPage, numPages]);

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
                  style={{ display: index + 1 <= currentPage ? 'block' : 'none' }}
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
      {error && <p>{error}</p>}
    </div>
  );
};

export default Viewer;