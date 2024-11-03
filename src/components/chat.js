import React, { useState, useEffect, useRef, useCallback } from 'react';
import './chat.css';
import Tree from "react-d3-tree";
import { jsonrepair } from 'jsonrepair';
import 'react-tree-graph/dist/style.css';
import { useCenteredTree } from "./helpers.js";
import ReactMarkdown from 'react-markdown';

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI('YOUR_KEY');
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
    const responseSummary = 'You can click the icon to re-check the tree chart. Feel free to ask me questions!'

    useEffect(() => { // 滚动到最下面
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const renderRectSvgNode = ({ nodeDatum, toggleNode }) => { // 自定义树，这里是为了运用自动居中
        return (
            <g>
                <RenderRectSvgNode 
                    nodeDatum={nodeDatum} 
                    toggleNode={toggleNode} 
                />
            </g>
        );
    };

    const RenderRectSvgNode  = ({ nodeDatum, toggleNode }) => { // 这个是设置自定义树的部分
        const hasChildren = nodeDatum.children && nodeDatum.children.length > 0;
        const hasDescription = Boolean(nodeDatum.description);
        const [isExpanded, setIsExpanded] = React.useState(false);
        const [isHovered, setIsHovered] = React.useState(false);
        const maxLength = 100;
        const isLongDescription = nodeDatum.description && nodeDatum.description.length > maxLength;
        const descriptionHeight = isLongDescription ? (isHovered || isExpanded ? nodeDatum.description.length: 70) : 30;
        const height = descriptionHeight
        const textLength = nodeDatum.name.length;
        let yOffset; // 节点显示name的偏移量，感觉应该不是这么硬写的吧！
        if (textLength <= 15) {
            yOffset = "-35";
        } 
        else if (15 < textLength && textLength <= 30) {
            yOffset = "-50";
        } 
        else if (30 < textLength && textLength <= 40) {
            yOffset = "-65";
        }
        else if (40 < textLength && textLength <= 100) {
            yOffset = "-95";
        }
        else if (100 < textLength && textLength <= 200) {
            yOffset = "-125";
        }

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
        };

    return (
    <g>
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
        r="12" // 节点的颜色等设置
        fill={hasChildren ? "#bebebe" : "#ffffff"}
        stroke={hasChildren ? "#bebebe" : "#cccccc"}
        onClick={toggleNode}
        style={{
        cursor: 'pointer',
        filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
        }} 
    />

    {hasDescription && (
        <foreignObject width="500" height={height} x={30} y={nodeDatum.y}>
            <div style={{
                border: '1px solid rgba(204, 204, 204, 0.7)', // 这个是本来在文本后面的框，但是我不知道怎么把框显示在其他节点上
                backgroundColor: '#f9f9f9', // 这里的设置都是关于节点的
                borderRadius: '4px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '5px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column', 
                justifyContent: 'flex-start',
                height: {height},
            }}>
                <div style={{ 
                    fontFamily: 'Arial, sans-serif', // 显示节点description的设置
                    fontSize: '12px', 
                    overflow: isHovered || isExpanded ? 'visible' : 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: isHovered || isExpanded ? 'normal' : 'nowrap',
                    maxWidth: isHovered || isExpanded ? '100%' : '75%',
                    maxHeight: isHovered || isExpanded ? 'none' : '50',
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

    const handleMouseEnter = (text) => {
        setHighlightedText(text);
    };

    const handleMouseLeave = () => {
        setHighlightedText(null);
    };

    const summarizeTree = useCallback(async (text) => { // 专门为了生成树summary的部分，但是如果文档太短小似乎无法生成discription
        try {
            const prompt = `
            Please summarize the key points of the following paper in a hierarchical tree structure format.
            You have to use text from the original paper to give a brief description for each node.
            Organize the summary into main categories and subcategories, similar to the example below but use text from the paper:

            For example:
            {
            "name": "Main Topic",
            "isRoot": true
            "children": [
            {
            "name": "Subtopic 1",
            "isRoot": false
            "children": [
                {"name": "Key Point A", "isRoot": false, "description": "description of Key Point A"},
                {"name": "Key Point B", "isRoot": false, "description": "description of Key Point B"}
            ]
            },
            {
            "name": "Subtopic 2",
            "children": [
            "isRoot": false
                {"name": "Key Point C", "isRoot": false, "description": "description of Key Point C"},
                {"name": "Key Point D", "isRoot": false, "description": "description of Key Point D"}
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
                const treeSummary = await summarizeTree(textContent);
                setTreeData(treeSummary);
                setMessages(prevMessages => [
                    ...prevMessages, { sender: 'chatbot', treeData: treeSummary }
                ]);
                setSummaryGenerated(true);
                setShowNotification(true);
                setTimeout(() => {
                    setShowNotification(false);
                }, 3000); // 显示提示的时间，随便改
            }
        };
    
        summarize();
    }, [textContent, summarizeTree, summaryGenerated]);

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
                const summary = await summarizeTree(textContent);
                setTreeData(summary);
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
        return text.split(/(?<=[.!?])\s+(?=[^a-zA-Z\dIVXLCDM\s])/); // 按照.!?分割，但是筛选掉类似1. / a. / I.这样的标题样式
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
                                    />
                                </div>
                            </>
                        ) : (
                            msg.sender === 'chatbot' && splitIntoSentences(msg.text).map((sentence, i) => (
                                <div
                                    key={`${msgIndex}-${i}`}
                                    onMouseEnter={() => handleMouseEnter(sentence)}
                                    onMouseLeave={handleMouseLeave}
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
