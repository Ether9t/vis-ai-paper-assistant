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

  return (
    <div className="app-container">
      <div className="left-panel">
        <Viewer file={pdfFile} />
      </div>
      <div className="right-panel">
        <Chat onUpload={handleUpload} />
      </div>
    </div>
  );
}

export default App;
