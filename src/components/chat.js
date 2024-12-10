import React, { useState, useEffect, useRef, useCallback } from 'react';
import './chat.css';
import Tree from "react-d3-tree";
import { jsonrepair } from 'jsonrepair';
import 'react-tree-graph/dist/style.css';
import { useCenteredTree } from "./helpers.js";
import ReactMarkdown from 'react-markdown';

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI('AIzaSyCj6783aYaHpyFHvBQAOJFRN0LRkA7dhvM');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 创建树图的model
const criticModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); //对树图中summary进行检查的model

function Chat({ onUpload, textContent, setHighlightedText }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messageEndRef = useRef(null);
    const [summaryGenerated, setSummaryGenerated] = useState(false);
    const [selectedSentence, setSelectedSentence] = useState(null);
    const [treeData, setTreeData] = useState(null);
    const [isTreeVisible, setIsTreeVisible] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const responseSummary = 'You can click the icon to re-check the tree chart. Feel free to ask me questions!';

    useEffect(() => {
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleNodeMouseEnter = (originalText) => {
        console.log("Highlighting text:", originalText);
        setHighlightedText(originalText);
    };

    const handleNodeMouseLeave = () => {
        console.log("Removing highlight");
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
        const isDescriptionInvalid = !nodeDatum.isDescriptionValid;
        const descriptionBackgroundColor = isDescriptionInvalid ? '#ffcccc' : '#f9f9f9';
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
            if (nodeDatum.originalText) {
                handleNodeMouseEnter(nodeDatum.originalText);
            }
        };

        const handleMouseLeaveNode = () => {
            handleNodeMouseLeave();
            console.log('mouse leave node');
        };

        const handleMouseEnter = () => {
            setIsHovered(true);
        };
        
        const handleMouseLeave = () => {
            if (!isExpanded) {
                setIsHovered(false);
            }
            console.info('mouse leave');
        };
    
        const handleClick = () => {
            setIsExpanded((prev) => !prev);
            console.log("Clicked node text:", nodeDatum.originalText);
        };

        return (
            <g>
                <g onMouseEnter={handleMouseEnterNode}
                   onMouseLeave={handleMouseLeaveNode}
                >
                <foreignObject
                    width={"125"}
                    height={"100"}
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
                </g>
            
                {hasDescription && (
                    <foreignObject width={
                        isExpanded ? '300px' : 
                        isHovered ? '300px' : 
                        '100px'}  height={height} x={30} y={nodeDatum.y}>
                        
                        <div style={{
                            border: '1px solid rgba(204, 204, 204, 0.7)',
                            backgroundColor: descriptionBackgroundColor,
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
                                fontFamily: 'Arial, sans-serif',
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

    const handleMouseEnterSentence = (text) => {
        console.log("Highlighting sentence:", text);
        setHighlightedText(text);
    };

    const handleMouseLeaveSentence = () => {
        console.log("Removing sentence highlight");
        setHighlightedText(null);
    };

    const validateDescriptions = useCallback(async (node) => {
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                const validation = await validateDescription(child.originalText, child.description);
                child.isDescriptionValid = validation.isValid;
                child.validationExplanation = validation.explanation;
                await validateDescriptions(child);
            }
        }
    }, []);

    const validateDescription = async (originalText, description) => {
        const prompt = `
            Please verify if the following description correctly summarizes the original text. 
            Respond with "yes" if it matches or "no" if it does not. If it does not match, 
            explain the discrepancy in a brief and clear way.
    
            Original Text: ${originalText}
            Description: ${description}
        `;
        const result = await criticModel.generateContent(prompt);

        if (!result || !result.response) {
            throw new Error('Failed to validate description.');
        }

        const validationResult = result.response.text().trim().toLowerCase();
        if (validationResult.includes("no") || validationResult.includes("discrepancy")) {
            return { isValid: false, explanation: validationResult };
        } else {
            return { isValid: true, explanation: "" };
        }
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

            const parsedTree = JSON.parse(cleanedResponse);
            
            if (parsedTree && Array.isArray(parsedTree.children)) {
                await validateDescriptions(parsedTree);
                return parsedTree;
            } else {
                throw new Error('Parsed response is not in the expected format.');
            }
        } catch (error) {
            console.error("Error summarizing the text:", error);
            return { name: "Error", description: "Failed to generate a valid tree structure.", isRoot: true, children: [] };
        }
    }, [validateDescriptions]);

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

    const isModificationSuggestion = (inputText) => {
        const modificationKeywords = ['modify', 'update', 'add', 'delete', 'change', 'adjust'];
        return modificationKeywords.some(keyword => inputText.toLowerCase().includes(keyword));
    };

    const generateNewTreeFromSuggestion = async (suggestion, currentTreeData) => {
        if (!currentTreeData) {
            throw new Error('Current tree data is not available.');
        }
        try {
            const prompt = `
        Please update the following tree structure based on the user's modification suggestion.
        
        User's suggestion: ${suggestion}
        
        Current tree structure: ${JSON.stringify(currentTreeData, null, 2)}
        
        Instructions:
        Important: Identify the node specified in the user's suggestion.

        1. Analyze the user's suggestion to determine the specific modification (e.g., add, delete, rename).
        2. Locate the target node(s) in the current tree structure based on the suggestion.
        3. Apply the modification:
        - **Add:** Insert a new node at the specified location.
        - **Delete:** Remove the specified node and its subtree.
        - **Rename/Change:** Update the node's name as per the suggestion.
        4. Ensure that all other nodes and the overall structure remain unchanged.
        5. Return the updated tree structure in JSON format only, enclosed within triple backticks and specifying the language as JSON:
        
        \`\`\`json
        {
        "name": "Root",
        "isRoot": true,
        "children": [
            // ... updated child nodes
        ]
        }
        \`\`\`
        
        Do not include any additional text or explanations.
        `;
        
            const result = await model.generateContent(prompt);
    
            if (!result || !result.response) {
                throw new Error('Failed to generate new tree structure from suggestion.');
            }
    
            const aiResponse = await result.response.text();
            console.log("AI TreeData", aiResponse);
    
            const jsonMatch = aiResponse.match(/```json([\s\S]*?)```/);
            if (!jsonMatch) {
                throw new Error('AI response does not contain JSON in the expected format.');
            }
    
            const cleanedJsonString = jsonMatch[1].trim();
            const cleanedResponse = jsonrepair(cleanedJsonString);
            const parsedTree = JSON.parse(cleanedResponse);
    
            if (parsedTree) {
                await validateDescriptions(parsedTree);
                return parsedTree;
            } else {
                throw new Error('Generated tree structure is not in the correct format.');
            }
        } catch (error) {
            console.error("Error generating tree from modification suggestion:", error);
            return null;
        }
    };
    
    


    const sendMessage = async () => {
        if (input.trim()) {
            setMessages([...messages, { sender: 'user', text: input }]);
            setInput('');
    
            if (isModificationSuggestion(input)) {
                if (treeData) {
                    console.log("treeData: ", treeData)
                    const newTreeData = await generateNewTreeFromSuggestion(input, treeData);
                    if (newTreeData) {
                        console.log("newtreeData: ", treeData)
                        setTreeData(newTreeData); 
                        setMessages(prevMessages => [
                            ...prevMessages,
                            { sender: 'chatbot', treeData: newTreeData }
                        ]);
                    } else {
                        setMessages(prevMessages => [
                            ...prevMessages,
                            { sender: 'chatbot', text: "Sorry, it is not possible to generate a new tree map based on your suggestion." }
                        ]);
                    }
                } else {
                    setMessages(prevMessages => [
                        ...prevMessages,
                        { sender: 'chatbot', text: "The tree is not ready yet. Please wait for the summary to be generated." }
                    ]);
                }
            } else if (summaryGenerated && textContent.length > 0) {
                const botReply = await chatWithbot(input, textContent);
                setMessages(prevMessages => [...prevMessages, { sender: 'chatbot', text: botReply }]);
            } else {
                setMessages(prevMessages => [
                    ...prevMessages,
                    { sender: 'chatbot', text: "Please upload a document first to generate a summary." }
                ]);
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
                                        dimensions={dimensions}
                                        translate={translate}
                                        orientation="horizontal"
                                        pathFunc={"step"}
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