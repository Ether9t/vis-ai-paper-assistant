import React, { useState, useEffect, useRef, useCallback } from 'react';
import './chat.css';
import Tree from "react-d3-tree";
import { jsonrepair } from 'jsonrepair';
import 'react-tree-graph/dist/style.css';

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI('AIzaSyCj6783aYaHpyFHvBQAOJFRN0LRkA7dhvM');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function Chat({ onUpload, textContent, setHighlightedText }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messageEndRef = useRef(null);
    const [summaryGenerated, setSummaryGenerated] = useState(false);
    const [selectedSentence, setSelectedSentence] = useState(null);
    const [treeData, setTreeData] = useState(null);
    const [isTreeVisible, setIsTreeVisible] = useState(false); 

    const toggleTreeVisibility = () => {
        setIsTreeVisible(prev => !prev);
    };

    const handleMouseEnter = (text) => {
        setHighlightedText(text);
    };

    const handleMouseLeave = () => {
        setHighlightedText(null);
    };

    const summarizeText = useCallback(async (text) => {
        try {
            const prompt = `
            Please summarize the key points of the following paper in a hierarchical tree structure format.
            Organize the summary into main categories and subcategories, similar to the example below:

            For example:
            {
            "name": "Main Topic",
            "children": [
            {
            "name": "Subtopic 1",
            "children": [
                {"name": "Key Point A", "value": 1},
                {"name": "Key Point B", "value": 2}
            ]
            },
            {
            "name": "Subtopic 2",
            "children": [
                {"name": "Key Point C", "value": 3},
                {"name": "Key Point D", "value": 4}
            ]
            }
            ]
            }

            Ensure that the hierarchy follows this format strictly. Generate the structure based on the following text: ${text}`;
            const result = await model.generateContent(prompt);
    
            if (!result || !result.response) {
                throw new Error('Failed to summarize text.');
            }
            const cleanedJsonString = result.response.text().replace(/```(?:json)?|```/g, '').trim();
            // console.log("Response:", cleanedJsonString);
            const cleanedResponse = jsonrepair(cleanedJsonString)
            // console.log("Cleaned Response:", cleanedResponse);

            return JSON.parse(cleanedResponse);
        } catch (error) {
            console.error("Error summarizing the text:", error);
            return "Sorry, there was an error summarizing the document.";
        }
    }, []);
    
    useEffect(() => {
        const summarize = async () => {
            if (textContent.length > 0 && !summaryGenerated) {
                const summary = await summarizeText(textContent);
                setMessages(prevMessages => [...prevMessages, { sender: 'chatbot', text: "Tree chart generated. Please click the icon to check the result. Feel free to ask me questions!" }]);
                setTreeData(summary);
                setSummaryGenerated(true);
            }
        };
    
        summarize();
    }, [textContent, summarizeText, summaryGenerated]);

    const chatWithbot = async (question, context) => {
        try {
            const prompt = `Answer the question based on the paper.\nContext: ${context}\nQuestion: ${question}`;
            const result = await model.generateContent(prompt);
    
            if (!result || !result.response) {
                throw new Error('Failed to generate an answer.');
            }
    
            return result.response.text();
        } catch (error) {
            console.error("Error answering the question:", error);
            return "Sorry, I couldn't answer the question.";
        }
    };

    const handleFileUpload = async (event) => {
        const uploadedFile = event.target.files[0];
        if (uploadedFile && uploadedFile.type === 'application/pdf') {
            onUpload(uploadedFile);
            setMessages([...messages, { sender: 'user', text: `Uploaded ${uploadedFile.name}` }]);

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

    const toggleSentenceSelection = (sentence) => {
        setSelectedSentence(selectedSentence === sentence ? null : sentence);
        setHighlightedText(selectedSentence === sentence ? null : sentence);
    };

    const splitIntoSentences = (text) => {
        return text.split(/(?<=[.!?])\s+/);
    };

    return (
        <div className="chat-container">
            <div className="tree-toggle-icon" onClick={toggleTreeVisibility}>
                <span className="material-icons">
                    {isTreeVisible ? 'close' : 'account_tree'}
                </span>
            </div>

            <div className="message-display">
                {messages.map((msg, msgIndex) => (
                    <div 
                        key={msgIndex}
                        className={`message ${msg.sender === 'user' ? 'user-message' : 'chatbot-message'}`}>
                        {msg.sender === 'chatbot' && splitIntoSentences(msg.text).map((sentence, i) => (
                            <span
                                key={`${msgIndex}-${i}`}
                                onMouseEnter={() => handleMouseEnter(sentence)}
                                onMouseLeave={handleMouseLeave}
                                onClick={() => toggleSentenceSelection(sentence)}
                                className={`summary-sentence ${selectedSentence === sentence ? 'selected' : ''}`}
                            >
                                {sentence + ' '}
                            </span>
                        ))}
                        {msg.sender === 'user' && <span>{msg.text}</span>}
                    </div>
                ))}
                <div ref={messageEndRef} />
            </div>
            {isTreeVisible && treeData && (
    <div className="floating-tree" style={{ padding: '0px', background: '#f9f9f9', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        {/* <button className="close-tree-button" onClick={toggleTreeVisibility} style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer' }}>X</button> */}
        <Tree
            initialDepth={1}
            data={treeData}
            svgProps={{
                className: 'tree-svg',
                style: { background: 'white', borderRadius: '0px' },
            }}
            animated={true}
            orientation="vertical"
        />
    </div>
            )}
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