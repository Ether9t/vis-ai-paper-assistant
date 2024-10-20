import React, { useState, useEffect, useRef, useCallback } from 'react';
import './chat.css';
import axios from 'axios';

function Chat({ onUpload, textContent }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messageEndRef = useRef(null);
    const [summaryGenerated, setSummaryGenerated] = useState(false);

    const summarizeText = useCallback(async (text) => {
        // console.log("Text to summarize:", text);
        try {
            const response = await fetch(
                "https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6",
                {
                    headers: {
                        Authorization: "Bearer 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",
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({ inputs: text }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to summarize text.');
            }

            const result = await response.json();
            return result[0].summary_text;
        } catch (error) {
            console.error("Error summarizing the text:", error);
            return "Sorry, there was an error summarizing the document.";
        }
    }, []);

    useEffect(() => {
        const summarize = async () => {
            if (textContent.length > 0 && !summaryGenerated) {
                const summary = await summarizeText(textContent);
                setMessages(prevMessages => [...prevMessages, { sender: 'chatbot', text: summary }]);
                setSummaryGenerated(true);
            }
        };

        summarize();
    }, [textContent, summarizeText, summaryGenerated]);

    const chatWithbot = async (question, context) => {
        try {
            const response = await axios.post(
                'https://api-inference.huggingface.co/models/deepset/roberta-base-squad2',
                {
                    inputs: {
                        question: question,
                        context: context,
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer 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`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            console.log("Response data:", response.data);
            return response.data.answer;
        } catch (error) {
            console.error("Error answering the question:", error);
            return "Sorry, I couldn't answer the question.";
        }
    };

    const handleFileUpload = async (event) => {
        const uploadedFile = event.target.files[0];
        if (uploadedFile && uploadedFile.type === 'application/pdf') {
            onUpload(uploadedFile);
            setMessages([...messages, { sender: 'user', text: `File: ${uploadedFile.name}` }]);

            if (!summaryGenerated && textContent.length > 0) {
                const summary = await summarizeText(textContent);
                setMessages(prevMessages => [...prevMessages, { sender: 'chatbot', text: summary }]);
                setSummaryGenerated(true);
            }
        } else {
            alert("Please upload a valid PDF file.");
        }
    };

    const sendMessage = async () => {
        if (input.trim()) {
            setMessages([...messages, { sender: 'user', text: input }]);
            setInput('');

            if (summaryGenerated) {
                const botReply = await chatWithbot(input, textContent);
                setMessages(prevMessages => [...prevMessages, { sender: 'chatbot', text: botReply }]);
            } else {
                setMessages(prevMessages => [...prevMessages, { sender: 'chatbot', text: "Please upload a document first to generate a summary." }]);
            }
        }
    };

    return (
        <div className="chat-container">
            <div className="message-display">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender === 'user' ? 'user-message' : 'chatbot-message'}`}>
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