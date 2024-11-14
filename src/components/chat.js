import React, { useState, useEffect, useRef, useCallback } from 'react';
import './chat.css';
import Tree from "react-d3-tree";
import { jsonrepair } from 'jsonrepair';
import 'react-tree-graph/dist/style.css';
import { useCenteredTree } from "./helpers.js";
import ReactMarkdown from 'react-markdown';

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
    const [isTreeVisible, setIsTreeVisible] = useState(false);  // 显示树的逻辑
    const [showNotification, setShowNotification] = useState(false); // 展示↓这句话的提示框
    const responseSummary = 'You can click the icon to re-check the tree chart. Feel free to ask me questions!'

    useEffect(() => { // 滚动到最下面
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleNodeMouseEnter = (originalText) => {
        console.log("Highlighting text:", originalText); // 调试日志
        setHighlightedText(originalText);
    };    

    const handleNodeMouseLeave = () => {
        console.log("Removing highlight"); // 调试日志
        setHighlightedText(null);
    };

    const renderRectSvgNode = ({ nodeDatum, toggleNode }) => {
        return (
            <g>
                <RenderRectSvgNode 
                    nodeDatum={nodeDatum} 
                    toggleNode={toggleNode}
                    handleNodeMouseEnter={handleNodeMouseEnter}
                    handleNodeMouseLeave={handleNodeMouseLeave}
                />
            </g>
        );
    };

    const RenderRectSvgNode = ({ nodeDatum, toggleNode, handleNodeMouseEnter, handleNodeMouseLeave }) => {
        const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;
        const hasDescription = Boolean(nodeDatum.description);
        const [isExpanded, setIsExpanded] = React.useState(false);
        const [isHovered, setIsHovered] = React.useState(false);
        const maxLength = 100;
        const isLongDescription = nodeDatum.description && nodeDatum.description.length > maxLength;
        const descriptionHeight = isLongDescription ? (isHovered || isExpanded ? nodeDatum.description.length : 70) : 45;
        const height = descriptionHeight;
        const textLength = nodeDatum.name.length;
        let yOffset;
        if (textLength <= 15) {
            yOffset = "-35";
        } 
        else if (15 < textLength && textLength <= 30) {
            yOffset = "-60";
        } 
        else if (30 < textLength && textLength <= 40) {
            yOffset = "-65";
        }
        else if (40 < textLength && textLength <= 60) {
            yOffset = "-75";
        }
        else if (60 < textLength && textLength <= 100) {
            yOffset = "-95";
        }
        else if (100 < textLength && textLength <= 200) {
            yOffset = "-125";
        }

        const handleMouseEnterNode = () => {
            if (nodeDatum.originalText) { // 使用 originalText
                handleNodeMouseEnter(nodeDatum.originalText);
            }
        };

        const handleMouseLeaveNode = () => {
            handleNodeMouseLeave();
        };
        const handleMouseEnter = () => {
            setIsHovered(true);
        };
        
        const handleMouseLeave = () => {
            if (!isExpanded) {
                setIsHovered(false);
            }
        };
        
        const handleClick = () => {
            setIsExpanded((prev) => !prev);
            console.log("Clicked node text:", nodeDatum.originalText);
        };

        return (
            <g
                onMouseEnter={handleMouseEnterNode}
                onMouseLeave={handleMouseLeaveNode}
            >
                <foreignObject
                    width={"125"} // 这里的数值都是定义节点name的
                    height={"500"}
                    x={nodeDatum.isRoot ? "-145" : "-60"}
                    y={nodeDatum.isRoot ? "-30" : yOffset}
                >
                    <div style={{
                        fontFamily: "Arial, sans-serif", 
                        fontSize: "14px",
                        fontWeight: "bold", 
                        textAlign: "center",
                        color: "black",
                    }}>
                        {nodeDatum.name}
                    </div>
                </foreignObject>

                <circle 
                    r="12"
                    fill={hasChildren ? "#bebebe" : "#ffffff"}
                    stroke={hasChildren ? "#bebebe" : "#cccccc"}
                    onClick={toggleNode}
                    style={{
                        cursor: 'pointer',
                        filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                    }} 
                />

                {hasDescription && (
                    <foreignObject 
                        width={
                            isExpanded ? '300px' : 
                            isHovered ? '300px' : 
                            '100px'
                        }  
                        height={`${height}px`} 
                        x={30} 
                        y={nodeDatum.y}
                    >
                        <div style={{
                            border: '1px solid rgba(204, 204, 204, 0.7)', // 这个是本来在文本后面的框
                            backgroundColor: '#f9f9f9', 
                            borderRadius: '4px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            padding: '5px',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column', 
                            justifyContent: 'flex-start',
                            height: `${height}px`, // 修正 height 的赋值
                        }}>
                            <div style={{ 
                                fontFamily: 'Arial, sans-serif',
                                fontSize: '12px', 
                                overflow: isHovered || isExpanded ? 'visible' : 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: isHovered || isExpanded ? 'normal' : 'nowrap',
                                maxWidth: isHovered || isExpanded ? '100%' : '75%',
                                maxHeight: isHovered || isExpanded ? 'none' : '50px', // 添加单位
                            }}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onClick={handleClick}
                            title={isLongDescription ? nodeDatum.description : undefined}
                            >
                                {isHovered || isExpanded 
                                    ? nodeDatum.description 
                                    : isLongDescription 
                                        ? `${nodeDatum.description.substring(0, maxLength)}...` 
                                        : nodeDatum.description
                                }
                            </div>
                        </div>
                    </foreignObject>
                )}
            </g>
        );
    };

    const toggleTreeVisibility = () => {
        setIsTreeVisible(prev => !prev);
    };

    const handleMouseEnterSentence = (text) => {
        console.log("Highlighting sentence:", text); // 调试日志
        setHighlightedText(text);
    };

    const handleMouseLeaveSentence = () => {
        console.log("Removing sentence highlight"); // 调试日志
        setHighlightedText(null);
    };

    const summarizeTree = useCallback(async (text) => {
        try {
            const prompt = `
            Please summarize the key points of the following paper in a hierarchical tree structure format. For each child node, provide a one sentence description based on the original text and include the original text as a reference.
            Organize the summary into main categories and subcategories, similar to the example below, but using the text from the paper:

            Example:
            {
            "name": "Main Topic",
            "isRoot": true,
            "children": [
                {
                    "name": "Subtopic 1",
                    "isRoot": false,
                    "children": [
                        {"name": "Key Point A", "isRoot": false, "description": "Description of Key Point A", "originalText": "Original text used for generating the description of Key Point A"},
                        {"name": "Key Point B", "isRoot": false, "description": "Description of Key Point B", "originalText": "Original text used for generating the description of Key Point B"}
                    ]
                },
                {
                    "name": "Subtopic 2",
                    "isRoot": false,
                    "children": [
                        {"name": "Key Point C", "isRoot": false, "description": "Description of Key Point C", "originalText": "Original text used for generating the description of Key Point C"},
                        {"name": "Key Point D", "isRoot": false, "description": "Description of Key Point D", "originalText": "Original text used for generating the description of Key Point D"}
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
            const cleanedResponse = jsonrepair(cleanedJsonString);

            // Try parsing the cleaned JSON, or throw an error if it's invalid
            const parsedTree = JSON.parse(cleanedResponse);
            
            // Check if parsedTree has the expected structure with a `children` property
            if (parsedTree && typeof parsedTree === 'object' && Array.isArray(parsedTree.children)) {
                return parsedTree;
            } else {
                throw new Error('Parsed response is not in the expected format.');
            }
        } catch (error) {
            console.error("Error summarizing the text:", error);

            // Return a fallback structure with a clear indication of the error
            return {
                name: "Error",
                description: "Failed to generate a valid tree structure.",
                isRoot: true,
                children: []
            };
        }
    }, []);
    
    useEffect(() => {
        const summarize = async () => {
            if (textContent.length > 0 && !summaryGenerated) {
                const treeSummary = await summarizeTree(textContent);
                if (treeSummary) {
                    setTreeData(treeSummary);
                    setMessages(prevMessages => [
                        ...prevMessages, { sender: 'chatbot', treeData: treeSummary }
                    ]);
                } else {
                    setMessages(prevMessages => [
                        ...prevMessages, { sender: 'chatbot', text: "Sorry, there was an error summarizing the document." }
                    ]);
                }
                setSummaryGenerated(true);
                setShowNotification(true);
                setTimeout(() => {
                    setShowNotification(false);
                }, 3000);
            }
        };

        summarize();
    }, [textContent, summarizeTree, summaryGenerated]);

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
                const summary = await summarizeTree(textContent);
                if (summary) {
                    setTreeData(summary);
                }
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
        return text.split(/(?<=[.!?])\s+(?=[^a-zA-Z\dIVXLCDM\s])/);
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
                        className={`message ${msg.sender === 'user' ? 'user-message' : 'chatbot-message'}`}
                    >
                        {msg.sender === 'chatbot' && msg.treeData ? (
                            <>
                                <div
                                    className="tree-message"
                                    ref={containerRef}
                                    style={{
                                        padding: '0px',
                                        background: '#f9f9f9',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                    }}
                                >
                                     <Tree
                                        initialDepth={2}
                                        data={treeData}
                                        svgProps={{
                                            className: 'tree-svg',
                                            style: { background: 'white', borderRadius: '0px' },
                                        }}
                                        animated={true}
                                        renderCustomNodeElement={(rd3tProps) => (
                                            renderRectSvgNode(rd3tProps)
                                        )}
                                        dimensions={dimensions} // 这两个都是为了自动居中的
                                        translate={translate}
                                        orientation="horizontal"
                                        pathFunc={"step"} // 节点之间线的样式，这个遮挡少一点
                                        depthFactor={300}
                                    />
                                </div>
                            </>
                        ) : (
                            msg.sender === 'chatbot' && splitIntoSentences(msg.text).map((sentence, i) => (
                                <div
                                    key={`${msgIndex}-${i}`}
                                    onMouseEnter={() => handleMouseEnterSentence(sentence)}
                                    onMouseLeave={handleMouseLeaveSentence}
                                    onClick={() => toggleSentenceSelection(sentence)}
                                    className={`summary-sentence ${selectedSentence === sentence ? 'selected' : ''}`}
                                >
                                    <ReactMarkdown>{sentence + ''}</ReactMarkdown>
                                </div>
                            ))
                        )}
                        {msg.sender === 'user' && <span>{msg.text}</span>}
                    </div>
                ))}
                <div ref={messageEndRef} />
            </div>
            {isTreeVisible && treeData && (
                <div className="floating-tree" ref={containerRef} style={{ padding: '0px', background: '#f9f9f9', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                    <Tree
                        initialDepth={2} // 初始显示的层级，这一块都是点击icon显示的树图的部分
                        data={treeData}
                        svgProps={{
                            className: 'tree-svg',
                            style: { background: 'white', borderRadius: '0px' },
                        }}
                        animated={true}
                        renderCustomNodeElement={(rd3tProps) => (
                            renderRectSvgNode(rd3tProps)
                        )}
                        dimensions={dimensions}
                        translate={translate}
                        orientation="horizontal"
                        pathFunc={"step"}
                        depthFactor={300}
                    />
                </div>
                )}

            <div className="input-container">
                <input
                    type="file"
                    onChange={handleFileUpload}
                    id="file-input"
                    className="file-input"
                />
                <label htmlFor="file-input" className="file-upload-button">
                    <span className="material-icons">attach_file</span>
                </label>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Send your message to chatbot..."
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
