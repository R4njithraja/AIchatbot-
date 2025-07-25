// src/components/Sidebar.js
import React from 'react';
import { collection, addDoc, deleteDoc } from 'firebase/firestore';
import { Plus, History, Settings, Trash2 } from '../utils/icons'; // Import icons

function Sidebar({
    userId,
    chats,
    currentChatId,
    setCurrentChatId,
    setView,
    view,
    theme,
    __app_id,
    db
}) {

    const handleNewChat = async () => {
        if (!userId) return;
        try {
            const newChatRef = await addDoc(collection(db, `artifacts/${__app_id}/users/${userId}/chats`), {
                title: "New Chat",
                messages: [],
                createdAt: Date.now(),
                personality: "Professional", // Default personality for new chat
                contextMemoryEnabled: true, // Default context memory for new chat
            });
            setCurrentChatId(newChatRef.id);
        } catch (error) {
            console.error("Error creating new chat:", error);
        }
    };

    const handleDeleteChat = async (chatId) => {
        if (!userId || !chatId) return;
        if (window.confirm("Are you sure you want to delete this chat?")) { // Using window.confirm for simplicity
            try {
                await deleteDoc(doc(db, `artifacts/${__app_id}/users/${userId}/chats`, chatId));
                // After deleting, if the current chat was deleted, select the first available chat or null
                if (currentChatId === chatId) {
                    setCurrentChatId(chats.length > 1 ? chats[0].id : null);
                }
            } catch (error) {
                console.error("Error deleting chat:", error);
            }
        }
    };

    return (
        <div className={`w-64 flex-shrink-0 border-r ${theme.cardBorder} flex flex-col ${theme.sidebarBg}`}>
            <div className={`p-4 text-xl font-bold ${theme.sidebarText}`}>AI Chatbot</div>
            <div className="p-4 border-b border-gray-700">
                <button
                    onClick={handleNewChat}
                    className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${theme.primaryBtnBg} text-white transition duration-200`}
                >
                    <Plus size={18} /> New Chat
                </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4">
                <h3 className={`text-sm font-semibold mb-2 uppercase ${theme.sidebarText}`}>Chats</h3>
                {chats.length === 0 ? (
                    <p className={`text-sm ${theme.sidebarText}`}>No chats yet. Start a new one!</p>
                ) : (
                    chats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => setCurrentChatId(chat.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer mb-1 transition duration-200
                                ${currentChatId === chat.id ? theme.sidebarActiveBg : 'hover:bg-gray-700'} ${theme.sidebarText}`}
                        >
                            <span className="truncate flex-grow">{chat.title || `Chat ${chat.id.substring(0, 4)}`}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                                className="ml-2 p-1 rounded-full hover:bg-red-500/20 text-red-400 transition duration-200"
                                title="Delete Chat"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
            <div className={`p-4 border-t ${theme.cardBorder} flex flex-col gap-2`}>
                <button
                    onClick={() => setView('chat')}
                    className={`w-full py-2 px-4 rounded-lg flex items-center gap-2 ${view === 'chat' ? theme.sidebarActiveBg : theme.secondaryBtnBg} ${theme.sidebarText} transition duration-200`}
                >
                    <History size={18} /> Chat
                </button>
                <button
                    onClick={() => setView('settings')}
                    className={`w-full py-2 px-4 rounded-lg flex items-center gap-2 ${view === 'settings' ? theme.sidebarActiveBg : theme.secondaryBtnBg} ${theme.sidebarText} transition duration-200`}
                >
                    <Settings size={18} /> Settings
                </button>
                <div className={`text-xs text-gray-400 mt-2 truncate`}>
                    User ID: {userId || 'Authenticating...'}
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
