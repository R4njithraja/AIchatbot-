// src/components/ChatView.js
import React from 'react';
import { updateDoc, doc, addDoc, collection } from 'firebase/firestore';
import { Send, ThumbsUp, ThumbsDown, Mic, Volume2, Image, BarChart, Code, Download, Share2 } from '../utils/icons'; // Import icons

function ChatView({
    userId,
    currentChatId,
    setCurrentChatId,
    currentChatMessages,
    inputMessage,
    setInputMessage,
    isThinking,
    setIsThinking,
    aiPersonality,
    setAiPersonality,
    contextMemoryEnabled,
    setContextMemoryEnabled,
    selectedModel,
    setSelectedModel,
    promptTemplates,
    messagesEndRef,
    theme,
    db,
    __app_id,
    chats,
    scrollToBottom
}) {

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !userId) return;

        setIsThinking(true);
        const userMessage = { role: 'user', text: inputMessage.trim(), timestamp: Date.now() };
        let updatedMessages = [...currentChatMessages, userMessage];

        // If no chat selected, create a new one
        let chatToUpdateId = currentChatId;
        if (!chatToUpdateId) {
            try {
                const newChatRef = await addDoc(collection(db, `artifacts/${__app_id}/users/${userId}/chats`), {
                    title: inputMessage.substring(0, 30) + '...', // First 30 chars as title
                    messages: [],
                    createdAt: Date.now(),
                    personality: aiPersonality,
                    contextMemoryEnabled: contextMemoryEnabled,
                });
                chatToUpdateId = newChatRef.id;
                setCurrentChatId(chatToUpdateId);
            } catch (error) {
                console.error("Error creating new chat for message:", error);
                setIsThinking(false);
                return;
            }
        }

        // Update messages in Firestore
        try {
            await updateDoc(doc(db, `artifacts/${__app_id}/users/${userId}/chats`, chatToUpdateId), {
                messages: updatedMessages,
                // Optionally update title if it's still "New Chat"
                title: chats.find(c => c.id === chatToUpdateId)?.title === "New Chat" ? inputMessage.substring(0, 30) + '...' : chats.find(c => c.id === chatToUpdateId)?.title
            });
            setInputMessage('');
        } catch (error) {
            console.error("Error updating chat messages:", error);
            setIsThinking(false);
            return;
        }

        // Prepare chat history for AI (respecting context memory)
        let chatHistory = [];
        if (contextMemoryEnabled) {
            chatHistory = updatedMessages.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));
        } else {
            chatHistory.push({ role: "user", parts: [{ text: inputMessage.trim() }] });
        }

        // Add AI personality instruction to the prompt
        const personalityPrompt = `You are an AI with a '${aiPersonality}' personality. Respond in that style.`;
        chatHistory.unshift({ role: "system", parts: [{ text: personalityPrompt }] });

        // Call LLM API (gemini-2.0-flash)
        try {
            const payload = { contents: chatHistory };
            const apiKey = ""; // Canvas will provide this if empty for gemini-2.0-flash
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const aiResponseText = result.candidates[0].content.parts[0].text;
                const aiMessage = { role: 'ai', text: aiResponseText, timestamp: Date.now() };
                updatedMessages = [...updatedMessages, aiMessage];

                await updateDoc(doc(db, `artifacts/${__app_id}/users/${userId}/chats`, chatToUpdateId), {
                    messages: updatedMessages
                });
            } else {
                console.error("AI response structure is unexpected:", result);
                const errorMessage = { role: 'ai', text: "Sorry, I couldn't generate a response. Please try again.", timestamp: Date.now() };
                await updateDoc(doc(db, `artifacts/${__app_id}/users/${userId}/chats`, chatToUpdateId), {
                    messages: [...updatedMessages, errorMessage]
                });
            }
        } catch (error) {
            console.error("Error calling AI API:", error);
            const errorMessage = { role: 'ai', text: "An error occurred while connecting to the AI. Please check your network.", timestamp: Date.now() };
            await updateDoc(doc(db, `artifacts/${__app_id}/users/${userId}/chats`, chatToUpdateId), {
                messages: [...updatedMessages, errorMessage]
            });
        } finally {
            setIsThinking(false);
            scrollToBottom();
        }
    };

    const handleFeedback = async (messageIndex, feedbackType) => {
        if (!currentChatId || !userId) return;

        const updatedMessages = currentChatMessages.map((msg, idx) => {
            if (idx === messageIndex) {
                return { ...msg, feedback: feedbackType };
            }
            return msg;
        });

        try {
            await updateDoc(doc(db, `artifacts/${__app_id}/users/${userId}/chats`, currentChatId), {
                messages: updatedMessages
            });
        } catch (error) {
            console.error("Error updating feedback:", error);
        }
    };

    const applyPromptTemplate = (templateContent) => {
        setInputMessage(prev => prev + templateContent);
    };

    return (
        <div className="flex-grow flex flex-col p-4 overflow-hidden">
            {/* Chat Messages */}
            <div className={`flex-grow overflow-y-auto p-4 rounded-lg ${theme.cardBg} ${theme.cardBorder} border`}>
                {currentChatMessages.length === 0 && !isThinking ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <p className="text-lg mb-2">Start a conversation!</p>
                        <p className="text-sm">Type your message below or select a prompt template.</p>
                    </div>
                ) : (
                    currentChatMessages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-3/4 p-3 rounded-lg shadow-md ${
                                msg.role === 'user' ? `${theme.userBubbleBg} text-gray-900` : `${theme.aiBubbleBg} text-gray-900`
                            }`}>
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                {msg.role === 'ai' && (
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => handleFeedback(index, '👍')}
                                            className={`p-1 rounded-full ${msg.feedback === '👍' ? 'bg-green-500 text-white' : 'hover:bg-gray-300'} transition duration-200`}
                                        >
                                            <ThumbsUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleFeedback(index, '👎')}
                                            className={`p-1 rounded-full ${msg.feedback === '👎' ? 'bg-red-500 text-white' : 'hover:bg-gray-300'} transition duration-200`}
                                        >
                                            <ThumbsDown size={16} />
                                        </button>
                                    </div>
                                )}
                                {/* Placeholder for Rich Media Output */}
                                {msg.role === 'ai' && msg.text.includes('[IMAGE]') && (
                                    <div className="mt-2 p-2 bg-gray-200 rounded-md flex items-center gap-2">
                                        <Image size={16} /> Image Placeholder
                                    </div>
                                )}
                                {msg.role === 'ai' && msg.text.includes('[CHART]') && (
                                    <div className="mt-2 p-2 bg-gray-200 rounded-md flex items-center gap-2">
                                        <BarChart size={16} /> Chart Placeholder
                                    </div>
                                )}
                                {msg.role === 'ai' && msg.text.includes('```') && (
                                    <div className="mt-2 p-2 bg-gray-200 rounded-md flex items-center gap-2">
                                        <Code size={16} /> Code Block Placeholder (syntax highlighting not implemented)
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {isThinking && (
                    <div className="flex justify-start mb-4">
                        <div className={`max-w-3/4 p-3 rounded-lg shadow-md ${theme.aiBubbleBg} text-gray-900`}>
                            <div className="flex items-center">
                                <span className="animate-pulse">AI is thinking...</span>
                                <span className="ml-2 text-xl">. . .</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`mt-4 p-4 rounded-lg ${theme.cardBg} ${theme.cardBorder} border flex flex-col gap-3`}>
                {/* Chat Controls */}
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <label htmlFor="personality-select" className="font-medium">Personality:</label>
                        <select
                            id="personality-select"
                            value={aiPersonality}
                            onChange={(e) => setAiPersonality(e.target.value)}
                            className={`p-2 rounded-md ${theme.inputBg} ${theme.text} ${theme.inputBorder} border focus:ring-blue-500 focus:border-blue-500`}
                        >
                            <option value="Professional">Professional</option>
                            <option value="Funny">Funny</option>
                            <option value="Mentor">Mentor</option>
                            <option value="Sarcastic">Sarcastic</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="context-memory-toggle" className="font-medium">Context Memory:</label>
                        <input
                            type="checkbox"
                            id="context-memory-toggle"
                            checked={contextMemoryEnabled}
                            onChange={(e) => setContextMemoryEnabled(e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="model-select" className="font-medium">Model:</label>
                        <select
                            id="model-select"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className={`p-2 rounded-md ${theme.inputBg} ${theme.text} ${theme.inputBorder} border focus:ring-blue-500 focus:border-blue-500`}
                        >
                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 (Placeholder)</option>
                            <option value="gpt-4">GPT-4 (Placeholder)</option>
                        </select>
                    </div>
                </div>

                {/* Prompt Templates */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <span className="font-medium text-sm flex-shrink-0">Templates:</span>
                    {promptTemplates.length === 0 ? (
                        <span className="text-sm text-gray-500">No custom templates. Go to settings to add some!</span>
                    ) : (
                        promptTemplates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => applyPromptTemplate(template.template)}
                                className={`px-3 py-1 rounded-full ${theme.secondaryBtnBg} ${theme.text} text-sm whitespace-nowrap hover:scale-105 transition duration-200`}
                            >
                                {template.name}
                            </button>
                        ))
                    )}
                </div>

                {/* Message Input */}
                <div className="flex items-center gap-2">
                    <button className={`p-2 rounded-full ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} title="Voice Input (Not implemented)"><Mic size={20} /></button>
                    <textarea
                        className={`flex-grow p-3 rounded-lg ${theme.inputBg} ${theme.text} ${theme.inputBorder} border focus:ring-blue-500 focus:border-blue-500 resize-none`}
                        rows="3"
                        placeholder="Type your message here..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                        disabled={isThinking}
                    ></textarea>
                    <button className={`p-2 rounded-full ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} title="Voice Output (Not implemented)"><Volume2 size={20} /></button>
                    <button
                        onClick={handleSendMessage}
                        className={`p-3 rounded-full ${theme.primaryBtnBg} text-white hover:scale-105 transition duration-200`}
                        disabled={isThinking || !inputMessage.trim()}
                    >
                        <Send size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatView;
