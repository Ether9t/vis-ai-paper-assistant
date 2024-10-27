import React, { useState, useEffect, useRef, useCallback } from 'react';
import './chat.css';
import Tree from "react-d3-tree";
import { jsonrepair } from 'jsonrepair';
import 'react-tree-graph/dist/style.css';
import { useCenteredTree } from "./helpers.js";
import ReactMarkdown from 'react-markdown'; // 这玩意一用就给我高亮覆盖了

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI('AIzaSyCj6783aYaHpyFHvBQAOJFRN0LRkA7dhvM');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function Chat({ onUpload, textContent, setHighlightedText }) { // 这里是把高亮的文本传给隔壁viewer
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messageEndRef = useRef(null);
    const [summaryGenerated, setSummaryGenerated] = useState(false); // 是否生成过summary,为了控制什么我忘了
    const [selectedSentence, setSelectedSentence] = useState(null);
    const [treeData, setTreeData] = useState(null);
    const [isTreeVisible, setIsTreeVisible] = useState(false);  // 显示树的逻辑
    const [showNotification, setShowNotification] = useState(false); // 展示↓这句话的提示框
    const responseSummary = 'Tree chart generated. Please click the icon to check the result. Feel free to ask me questions!'

    useEffect(() => { // 滚动到最下面
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const renderRectSvgNode  = ({ nodeDatum, toggleNode }) => { // 自定义树节点
        const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;

        return (
          <g>
            <circle 
              r="12"
              fill={hasChildren ? "#bebebe" : "#ffffff"}
              stroke={hasChildren ? "#bebebe" : "#cccccc"}
              onClick={toggleNode}
              style={{
                cursor: 'pointer',
                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
              }} 
            />
            <text 
              fill="black" 
              fontSize="14"
              textAnchor="middle" 
              y="-10"
              strokeWidth="0"
              style={{ fontFamily: 'Arial, sans-serif', fontWeight: '30' }} 
            >
              {nodeDatum.name}
            </text>
            {nodeDatum.attributes?.department && (
              <text 
                fill="black" 
                fontSize="12"
                textAnchor="middle"
                y="25"
                style={{ fontFamily: 'Arial, sans-serif', fontWeight: '30' }}  
              >
                {nodeDatum.attributes.department}
              </text>
            )}
          </g>
        );
      };
      
    const toggleTreeVisibility = () => {
        setIsTreeVisible(prev => !prev);
    };

    const handleMouseEnter = (text) => {
        setHighlightedText(text);
    };

    const handleMouseLeave = () => {
        setHighlightedText(null);
    };

    const summarizeTree = useCallback(async (text) => { // 专门为了生成树summary的部分
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

    const summarizeText = useCallback(async (text) => { // 换了一下，这个是chatbot回复summary的部分
        try {
            const prompt = `
            Please summarize the key points of the following paper in a hierarchical structure format.
            Organize the summary into main categories and subcategories, for someone who has no knowledge of the paper
            Generate based on the following text: ${text}`;
            const result = await model.generateContent(prompt);
            if (!result || !result.response) {
                throw new Error('Failed to summarize text.');
            }
            return result.response.text();

        } catch (error) {
            console.error("Error summarizing the text:", error);
            return "Sorry, there was an error summarizing the document.";
        }
    }, []);
    
    useEffect(() => {
        const summarize = async () => {
            if (textContent.length > 0 && !summaryGenerated) {
                const treeSummary = await summarizeTree(textContent);
                setTreeData(treeSummary);

                const textSummary = await summarizeText(textContent);
                setMessages(prevMessages => [...prevMessages, { sender: 'chatbot', text: textSummary }])
                setSummaryGenerated(true);
                setShowNotification(true);
                setTimeout(() => {
                    setShowNotification(false);
                }, 3000); // 显示提示的时间，随便改
            }
        };
    
        summarize();
    }, [textContent, summarizeTree, summarizeText, summaryGenerated]);

    const chatWithbot = async (question, context) => { // 总感觉这个prompt还可以优化，但是我想不出来了
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

    const [dimensions, translate, containerRef] = useCenteredTree();

    return (
        <div className="chat-container">
            <div className="tree-toggle-icon" onClick={toggleTreeVisibility}>
                <span className="material-icons">
                    {isTreeVisible ? 'close' : 'account_tree'}
                </span>
            </div>
            {showNotification && (
                <div className="notification">
                    {responseSummary}
                </div>
            )}

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
    <div className="floating-tree" ref={containerRef} style={{ padding: '0px', background: '#f9f9f9', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        {/* <button className="close-tree-button" onClick={toggleTreeVisibility} style={{ background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer' }}>X</button> */}
        <Tree
            initialDepth={2} // 初始显示的层级
            data={treeData}
            svgProps={{
                className: 'tree-svg',
                style: { background: 'white', borderRadius: '0px' },
            }}
            animated={true}
            renderCustomNodeElement={renderRectSvgNode}
            dimensions={dimensions}
            translate={translate}
            orientation="horizontal"
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