import React, { useState } from 'react';
import Viewer from './components/viewer';
import Chat from './components/chat';
import './App.css';

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const handleUpload = (file) => {
    const fileUrl = URL.createObjectURL(file);
    setPdfFile(fileUrl);
  };
  const [textContent, setTextContent] = useState([]);
  // console.log("textContent:", textContent); // 查看提取的文本是否传递成功，ctrl + shift + i开启控制台

  return (
    <div className="app-container">
      <div className="left-panel">
        <Viewer file={pdfFile} setTextContent={setTextContent}/>
      </div>
      <div className="right-panel">
        <Chat onUpload={handleUpload} textContent={textContent}/>
      </div>
    </div>
  );
}

export default App;