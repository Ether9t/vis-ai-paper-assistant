import React, { useState, useEffect, useRef } from 'react';
import './chat.css';

function Chat({ onUpload }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messageEndRef = useRef(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    console.log(uploadedFile);
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      onUpload(uploadedFile);
      setMessages([...messages, { sender: 'user', text: `File: ${uploadedFile.name}` }]);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const sendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { sender: 'user', text: input }]);
      setInput('');

      setTimeout(() => {
        const botReply = `${input}`;
        setMessages(prevMessages => [...prevMessages, { sender: 'gpt', text: botReply }]);
      }, 1000);
    }
  };

  return (
    <div className="chat-container">
      <div className="message-display">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender === 'user' ? 'user-message' : 'gpt-message'}`}>
            {msg.text}
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
      <div className="input-container">
        <input type="file" onChange={handleFileUpload} id="file-input" className="file-input" />
        <label htmlFor="file-input" className="file-upload-button">
          <span className="material-icons">attach_file</span>
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send your message to chat bot..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="send-button">
          <span className="material-icons">arrow_upward</span>
        </button>
      </div>
    </div>
  );
}

export default Chat;