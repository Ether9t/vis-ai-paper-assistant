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
      const extractedTextItems = [];
      const seenStrings = new Set();
      const pdf = await pdfjs.getDocument(file).promise;
      const numPages = pdf.numPages;
      const pageCounts = [];
  
      let globalIndex = 0; // 初始化全局索引
  
      for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageTextItems = textContent.items.map((item) => ({
          str: item.str,
          transform: item.transform,
          width: item.width,
          height: item.height,
          dir: item.dir,
          fontName: item.fontName,
          pageNumber: pageNumber,
          itemIndex: globalIndex++, // 正确赋值全局索引
        })).filter(item => {
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
  
      const fullText = extractedTextItems.map(item => item.str).join(' ');
      setTextContent(fullText);
    }
  }, [file, setTextContent]);  
  
  useEffect(() => {
    if (file) {
      loadTextContent();
    }
  }, [file, loadTextContent]);

  // 当 highlightedText 或 textItems 变化时，查找需要高亮的文本项
  useEffect(() => {
    console.log("Highlighted Text:", highlightedText); // 调试日志
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
  const getGlobalItemIndex = (pageNumber, itemIndex) => {
    let index = 0;
    for (let i = 0; i < pageNumber - 1; i++) {
      index += pageItemCounts[i] || 0;
    }
    index += itemIndex;
    return index;
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
    setCurrentPage(1);
  };

  const onDocumentLoadError = (err) => {
    setError('Failed to load PDF file.');
  };

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
    const globalItemIndex = getGlobalItemIndex(pageNumber, itemIndex);
    if (!highlightedText || highlights.length === 0) {
      return str;
    }
    let newStr = str
    highlights.forEach((highlight) => {
      if (highlight.index === globalItemIndex && highlight.pageNumber === pageNumber) {
        highlight.strItem.split(' ').forEach((aaa, index) => {
          newStr = newStr.replace(aaa, (value) => `<mark>${value}</mark>`)
        });
      }
    })
    return newStr
  }

  return (
    <div className="pdf-viewer-container">
      {file && (
        <div className="controls fixed-controls">
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
          <button onClick={handleZoomOut}>-</button>
          <button onClick={handleZoomIn}>+</button>
        </div>
      )}

      <div className="pdf-viewer">
        {file ? (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
          >
            {Array.from({ length: numPages }, (v, i) => {
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
                  // customTextRenderer={({ str, itemIndex }) => {
                  //     const globalItemIndex = getGlobalItemIndex(pageNumber, itemIndex);
                  //     const isHighlighted = highlights.some(
                  //         (highlight) =>
                  //             highlight.index === globalItemIndex &&
                  //             highlight.pageNumber === pageNumber
                  //     );
                  //     return (
                  //       `<span
                  //       style={{
                  //           backgroundColor: ${isHighlighted? 'yellow' : 'transparent'} ,
                  //       }}
                  //       className={${isHighlighted? 'highlighted-text' : ''} }
                  //   >
                  //       ${str}
                  //   </span>`
                  //     );
                  // }}
                  />

                </div>
              );
            })}
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