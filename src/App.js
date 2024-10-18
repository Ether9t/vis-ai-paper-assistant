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
  // console.log("Current textContent:", textContent);

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
