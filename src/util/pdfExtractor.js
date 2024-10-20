import { pdfjs } from 'react-pdf';

// 配置 PDF.js worker 文件
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  export const extractTextWithPositions = async (file) => {
    try {
      // 将文件对象转换为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
  
      // 加载 PDF 文件
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
      const extractedPages = [];
  
      // 遍历每一页
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
  
        // 获取文本内容及其位置信息
        const textContent = await page.getTextContent();
  
        // 提取文本项及其位置数据
        const pageData = textContent.items.map(item => {
          return {
            text: item.str,
            x: item.transform[4], // X 坐标
            y: item.transform[5], // Y 坐标
            width: item.width,    // 文本宽度
            height: item.height,  // 文本高度
            pageNumber,           // 当前页码
          };
        });
  
        extractedPages.push(...pageData);
      }
  
      return extractedPages;
  
    } catch (error) {
      console.error('Error extracting text and positions from PDF:', error);
      return [];
    }
  };