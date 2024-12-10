// viewer.js
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
  const [textItems, setTextItems] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [pageItemCounts, setPageItemCounts] = useState([]);

  const loadTextContent = useCallback(async () => {
    if (file) {
      try {
        const extractedTextItems = [];
        const seenStrings = new Set();
        const pdf = await pdfjs.getDocument(file).promise;
        const totalNumPages = pdf.numPages;
        const pageCounts = [];

        let globalIndex = 0;

        for (let pageNumber = 1; pageNumber <= totalNumPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const textContent = await page.getTextContent();
          const pageTextItems = textContent.items
            .map((item) => ({
              str: item.str,
              transform: item.transform,
              width: item.width,
              height: item.height,
              dir: item.dir,
              fontName: item.fontName,
              pageNumber: pageNumber,
              itemIndex: globalIndex++,
            }))
            .filter((item) => {
              const normalizedStr = item.str.trim().toLowerCase();
              if (seenStrings.has(normalizedStr)) {
                return false;
              }
              seenStrings.add(normalizedStr);
              return true;
            });

          extractedTextItems.push(...pageTextItems);
          pageCounts.push(pageTextItems.length);
        }

        setTextItems(extractedTextItems);
        setPageItemCounts(pageCounts);

        const fullText = extractedTextItems.map((item) => item.str).join(' ');
        setTextContent(fullText);
      } catch (err) {
        console.error('Error loading text content:', err);
      }
    }
  }, [file, setTextContent]);

  useEffect(() => {
    if (file) {
      loadTextContent();
    }
  }, [file, loadTextContent]);

  // 当 highlightedText 或 textItems 变化时，查找需要高亮的文本项
  useEffect(() => {
    if (highlightedText && textItems.length > 0) {
      const highlights = findHighlights(textItems, highlightedText);
      console.log("Highlights found:", highlights); // 调试日志
      setHighlights(highlights);
    } else {
      setHighlights([]);
    }
  }, [highlightedText, textItems]);

  const findHighlights = (textItems, highlightedText) => {
    const highlights = [];
    const normalizedHighlightedText = highlightedText.trim().toLowerCase();
  
    console.log("Normalized Highlighted Text:", normalizedHighlightedText);
  
    // 创建一个数组保存所有文本项的字符串
    const allText = textItems.map(item => item.str).join(' ').toLowerCase();
  
    // 找到高亮文本的起始索引
    const startIndex = allText.indexOf(normalizedHighlightedText);
    if (startIndex === -1) {
      // 没有找到匹配的文本
      return highlights;
    }
  
    // 计算匹配文本的结束索引
    const endIndex = startIndex + normalizedHighlightedText.length;
  
    // 现在，我们需要确定哪些 textItems 的字符范围在 [startIndex, endIndex) 内
    let currentIndex = 0;
  
    textItems.forEach(item => {
      const itemStart = currentIndex;
      const itemEnd = currentIndex + item.str.length;
  
      // 检查当前文本项是否在高亮范围内
      if (itemEnd > startIndex && itemStart < endIndex) {
        highlights.push({
          index: item.itemIndex, // 使用正确的 itemIndex
          pageNumber: item.pageNumber,
          strItem: item.str,
        });
      }
  
      currentIndex += item.str.length + 1; // 加1是因为我们在 join 时用了空格
    });
  
    return highlights;
  };
  


  // 定义 getGlobalItemIndex 函数
  const getGlobalItemIndex = (pageNumber, itemIndex,str) => {
    const pageItem = textItems.find((item) => item.pageNumber === pageNumber&&item.str===str);
    // console.log(itemIndex,"==getGlobalItemIndex==",pageItem);
    // console.log( pageItem?.itemIndex);
    return pageItem?.itemIndex;
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
    setCurrentPage(1);
    setPageInputValue('1');
  };

  const onDocumentLoadError = (err) => {
    setError('Failed to load PDF file.');
  };

  // 缩放控制
  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
  };

  const handlePageInputChange = (e) => {
    setPageInputValue(e.target.value);
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
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= numPages) {
      setCurrentPage(pageNumber);
      const pageElement = pageRefs.current[pageNumber - 1];
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth' });
      }
      setPageInputValue(pageNumber.toString());
    } else {
      setPageInputValue(currentPage.toString());
    }
  };

  // function highlightPattern(text, pattern) {
  //   console.log('update custom');

  //       const globalItemIndex = getGlobalItemIndex(text.pageNumber, text.itemIndex);
  //       const isHighlighted = pattern.some(
  //           (highlight) =>
  //               highlight.index === globalItemIndex &&
  //               highlight.pageNumber === text.pageNumber
  //       );
  //       return (
  //           `<span
  //               style={{
  //                   backgroundColor: ${isHighlighted? 'yellow' : 'transparent'} ,
  //               }}
  //               className={${isHighlighted? 'highlighted-text' : ''} }
  //           >
  //               ${text.str}
  //           </span>`
  //       );
  // }
  // const myCustomTextRender = useCallback(
  //   (textItem) => highlightPattern(textItem, highlights),
  //   [highlights]
  // )
  const myCustomTextRender = ({ str, itemIndex, pageNumber }) => {
    if (!highlightedText || highlights.length === 0) {
      return str;
    }
    const globalItemIndex = getGlobalItemIndex(pageNumber, itemIndex, str);
    const isHighlighted = highlights.some(
      (highlight) =>
        highlight.index === globalItemIndex &&
        highlight.pageNumber === pageNumber
    );

    if (isHighlighted) {
      return `<mark>${str}</mark>`;
    }
    return str;
  };


  useEffect(() => {
    if (!numPages) return;

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.6, 
    };

    const callback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const pageNumber = parseInt(entry.target.getAttribute('data-page-number'), 10);
          setCurrentPage(pageNumber);
          setPageInputValue(pageNumber.toString());
        }
      });
    };

    const observer = new IntersectionObserver(callback, options);

    pageRefs.current.forEach((page) => {
      if (page) observer.observe(page);
    });

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [numPages]);

  return (
    <div className="pdf-viewer-container">
      {file && (
        <div className="controls fixed-controls">
          <div className="page-navigation">
            <input
              type="number"
              value={pageInputValue}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputKeyDown}
              onBlur={handlePageInputBlur}
              min="1"
              max={numPages}
              className="page-input"
            />
            <span className="page-count"> / {numPages}</span>
          </div>
          <div className="zoom-controls">
            <button onClick={handleZoomOut} className="zoom-button">-</button>
            <button onClick={handleZoomIn} className="zoom-button">+</button>
          </div>
        </div>
      )}

      <div className="pdf-viewer">
        {file ? (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div className="loading">Loading PDF...</div>}
            error={<div className="error">Failed to load PDF.</div>}
          >
            {Array.from({ length: numPages }, (_, i) => {
              const pageNumber = i + 1;
              return (
                <div
                  key={`page_${pageNumber}`}
                  className="pdf-page"
                  data-page-number={pageNumber}
                  ref={(el) => (pageRefs.current[i] = el)}
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    customTextRenderer={myCustomTextRender}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </div>
              );
            })}
          </Document>
        ) : (
          <p className="no-pdf-message">No PDF file uploaded</p>
        )}
      </div>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default Viewer;