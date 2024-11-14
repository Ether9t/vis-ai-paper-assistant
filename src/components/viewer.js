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
      const seenStrings = new Set(); // 用于去除重复字符串
      const pdf = await pdfjs.getDocument(file).promise;
      const numPages = pdf.numPages;
      const pageCounts = [];
  
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
        })).filter(item => {
          // 标准化字符串，用于去重
          const normalizedStr = item.str.trim().toLowerCase();
          if (seenStrings.has(normalizedStr)) {
            return false; // 如果已经见过，过滤掉
          }
          seenStrings.add(normalizedStr); // 添加到集合中，避免重复
          return true; // 保留该项
        });
  
        extractedTextItems.push(...pageTextItems);
        pageCounts.push(pageTextItems.length);
      }
  
      setTextItems(extractedTextItems);
      setPageItemCounts(pageCounts);
  
      // 提取全文本内容用于 AI 总结
      const fullText = extractedTextItems.map(item => item.str).join(' ');
      setTextContent(fullText);
    }
  }, [file, setTextContent]);
  
  // 使用 useEffect 加载文本内容
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
  
    // 输出 normalizedHighlightedText 以确认目标高亮内容
    console.log("Normalized Highlighted Text:", normalizedHighlightedText);
  
    let combinedText = "";
    let combinedItems = [];
  
    textItems.forEach((item, index) => {
      const normalizedItemStr = item.str.trim().toLowerCase();
  
      // 累加当前文本到 combinedText，并保存对应的 `textItems`
      combinedText += normalizedItemStr + " ";
      combinedItems.push(item);
      console.log("Combined Text (Current):", combinedText);

      // 检查合并的文本是否包含完整的目标句子
      if (combinedText.includes(normalizedHighlightedText)) {
        console.log("Combined Text 111111111:", combinedText);
        combinedItems.forEach((combinedItem, combinedIndex) => {
          const alreadyExists = highlights.some(
            (highlight) =>
              highlight.pageNumber === combinedItem.pageNumber &&
              highlight.strItem === combinedItem.str
          );
  
          if (!alreadyExists) {
            highlights.push({
              index: combinedIndex,
              pageNumber: combinedItem.pageNumber,
              strItem: combinedItem.str,
            });
          }
        });
  
        // 匹配成功后，清空 combinedText 和 combinedItems，准备下一个匹配
        combinedText = "";
        combinedItems = [];
      }
  
      // 如果 combinedText 过长而未匹配到，重置以避免过大字符串
      if (combinedText.length > 500) {
        combinedText = "";
        combinedItems = [];
      }
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