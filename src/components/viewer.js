import React, { useState, useEffect, useRef } from 'react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1.0);
  const pageRefs = useRef([]);

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

    pageRefs.current.forEach((page) => {
      if (page) observer.observe(page);
    });

    return () => {
      if (observer) {
        pageRefs.current.forEach((page) => {
          if (page) observer.unobserve(page);
        });
      }
    };
  }, [numPages]);

  // 同步更新输入框的值，当currentPage变化时
  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  const onDocumentLoadSuccess = async ({ numPages }) => {
    setNumPages(numPages);
    setError(null);

    // 提取文本内容的代码（保持不变）
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
  };

  const onDocumentLoadError = (err) => {
    setError('Failed to load PDF file.');
  };

  // 缩放控制函数
  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
  };

  // 当用户按下回车键时，更新当前页码
  const handlePageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      updateCurrentPage();
    }
  };

  // 当输入框失去焦点时，更新当前页码
  const handlePageInputBlur = () => {
    updateCurrentPage();
  };

  // 更新当前页码并跳转
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
      // 如果输入无效，重置为当前页码
      setPageInputValue(currentPage.toString());
    }
  };

  return (
    <div className="pdf-viewer-container">
      <div className="controls fixed-controls">
        {/* 页数输入和导航 */}
        <span>Page</span>
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
        <span>&nbsp;|&nbsp;</span>

        {/* 缩放控制 */}
        <span>Zoom</span>
        <button onClick={handleZoomOut}>-</button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={handleZoomIn}>+</button>
      </div>

      {/* 文档查看 */}
      <div className="pdf-viewer">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
        >
          {Array.from(new Array(numPages), (el, index) => (
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
      </div>
      {error && <p>{error}</p>}
    </div>
  );
};

export default Viewer;
