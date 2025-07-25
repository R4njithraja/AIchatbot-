// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, query } from 'firebase/firestore';

import { app, db, auth } from './firebase/firebaseConfig';
import { getThemeColors } from './utils/theme';
import ChatView from './components/ChatView';
import SettingsView from './components/SettingsView';
import Sidebar from './components/Sidebar';

function App() {
    const [view, setView] = useState('chat'); // 'chat', 'settings', 'admin'
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [currentChatMessages, setCurrentChatMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [highContrastMode, setHighContrastMode] = useState(false);
    const [fontSize, setFontSize] = useState('base'); // 'sm', 'base', 'lg', 'xl'
    const [contextMemoryEnabled, setContextMemoryEnabled] = useState(true);
    const [aiPersonality, setAiPersonality] = useState('Professional');
    const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
    const [promptTemplates, setPromptTemplates] = useState([]);

    const messagesEndRef = useRef(null);

    // Scroll to bottom of chat messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Firebase Auth and Firestore Initialization
    useEffect(() => {
        if (!app || !db || !auth) {
            console.error("Firebase not initialized. Check firebaseConfig.");
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                setIsAuthReady(true);
                console.log("Authenticated user:", user.uid);
            } else {
                try {
                    // Sign in anonymously if no initial auth token
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await auth.signInWithCustomToken(__initial_auth_token);
                    } else {
                        await auth.signInAnonymously();
                    }
                } catch (error) {
                    console.error("Firebase authentication error:", error);
                }
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Fetch user settings and prompt templates
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        // Fetch settings
        const settingsDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/settings`, 'userSettings');
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setHighContrastMode(data.highContrastMode || false);
                setFontSize(data.fontSize || 'base');
            } else {
                // Set default settings if none exist
                setDoc(settingsDocRef, { highContrastMode: false, fontSize: 'base' }, { merge: true })
                    .catch(error => console.error("Error setting default settings:", error));
            }
        }, (error) => console.error("Error fetching settings:", error));

        // Fetch prompt templates
        const templatesCollectionRef = collection(db, `artifacts/${__app_id}/users/${userId}/promptTemplates`);
        const unsubscribeTemplates = onSnapshot(templatesCollectionRef, (snapshot) => {
            const templatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPromptTemplates(templatesData);
        }, (error) => console.error("Error fetching prompt templates:", error));

        return () => {
            unsubscribeSettings();
            unsubscribeTemplates();
        };
    }, [isAuthReady, userId]);

    // Fetch chat history
    useEffect(() => {
        if (!isAuthReady || !userId) return;

        const chatsCollectionRef = collection(db, `artifacts/${__app_id}/users/${userId}/chats`);
        const q = query(chatsCollectionRef); // No orderBy to avoid index issues

        const unsubscribeChats = onSnapshot(q, (snapshot) => {
            const fetchedChats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // Sort by creation time client-side
            setChats(fetchedChats);

            // If no current chat is selected, or if the selected chat was deleted, select the first one
            if (!currentChatId && fetchedChats.length > 0) {
                setCurrentChatId(fetchedChats[0].id);
            } else if (currentChatId && !fetchedChats.some(chat => chat.id === currentChatId)) {
                setCurrentChatId(fetchedChats.length > 0 ? fetchedChats[0].id : null);
            }
        }, (error) => console.error("Error fetching chats:", error));

        return () => unsubscribeChats();
    }, [isAuthReady, userId, currentChatId]);

    // Fetch messages for the current chat
    useEffect(() => {
        if (!isAuthReady || !userId || !currentChatId) {
            setCurrentChatMessages([]);
            return;
        }

        const chatDocRef = doc(db, `artifacts/${__app_id}/users/${userId}/chats`, currentChatId);
        const unsubscribeMessages = onSnapshot(chatDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const chatData = docSnap.data();
                setCurrentChatMessages(chatData.messages || []);
                setAiPersonality(chatData.personality || 'Professional');
                setContextMemoryEnabled(chatData.contextMemoryEnabled !== undefined ? chatData.contextMemoryEnabled : true);
            } else {
                setCurrentChatMessages([]);
                console.warn("Current chat document does not exist.");
            }
            scrollToBottom();
        }, (error) => console.error("Error fetching chat messages:", error));

        return () => unsubscribeMessages();
    }, [isAuthReady, userId, currentChatId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [currentChatMessages]);

    const handleUpdateSettings = async (settingKey, value) => {
        if (!userId) return;
        try {
            await setDoc(doc(db, `artifacts/${__app_id}/users/${userId}/settings`, 'userSettings'), {
                [settingKey]: value
            }, { merge: true });
            if (settingKey === 'highContrastMode') setHighContrastMode(value);
            if (settingKey === 'fontSize') setFontSize(value);
        } catch (error) {
            console.error("Error updating settings:", error);
        }
    };

    const getFontSizeClass = (size) => {
        switch (size) {
            case 'sm': return 'text-sm';
            case 'base': return 'text-base';
            case 'lg': return 'text-lg';
            case 'xl': return 'text-xl';
            default: return 'text-base';
        }
    };

    const theme = getThemeColors(highContrastMode);

    // Main Layout
    return (
        <div className={`flex h-screen w-screen font-inter ${theme.bg} ${theme.text} ${getFontSizeClass(fontSize)}`}>
            {/* Sidebar */}
            <Sidebar
                userId={userId}
                chats={chats}
                currentChatId={currentChatId}
                setCurrentChatId={setCurrentChatId}
                setView={setView}
                view={view}
                theme={theme}
                __app_id={__app_id}
                db={db}
            />

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col">
                {/* Header */}
                <header className={`flex items-center justify-between p-4 border-b ${theme.cardBorder} ${theme.cardBg}`}>
                    <h1 className="text-xl font-semibold">{currentChatId ? chats.find(c => c.id === currentChatId)?.title || "Chat" : "New Chat"}</h1>
                    <div className="flex items-center gap-4">
                        {/* Placeholder for monetization/token tracker */}
                        <div className={`text-sm ${theme.text}`}>Tokens Left: 999</div>
                        {/* Download and Share2 icons are passed as props to ChatView if needed */}
                        {/* <button className={`p-2 rounded-full ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} title="Export Chat"><Download size={20} /></button>
                        <button className={`p-2 rounded-full ${theme.secondaryBtnBg} ${theme.text} hover:scale-105 transition duration-200`} title="Share Chat"><Share2 size={20} /></button> */}
                    </div>
                </header>

                {/* Content Area based on view */}
                {view === 'chat' && (
                    <ChatView
                        userId={userId}
                        currentChatId={currentChatId}
                        setCurrentChatId={setCurrentChatId}
                        currentChatMessages={currentChatMessages}
                        inputMessage={inputMessage}
                        setInputMessage={setInputMessage}
                        isThinking={isThinking}
                        setIsThinking={setIsThinking}
                        aiPersonality={aiPersonality}
                        setAiPersonality={setAiPersonality}
                        contextMemoryEnabled={contextMemoryEnabled}
                        setContextMemoryEnabled={setContextMemoryEnabled}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        promptTemplates={promptTemplates}
                        messagesEndRef={messagesEndRef}
                        theme={theme}
                        db={db}
                        __app_id={__app_id}
                        chats={chats} // Pass chats to update title on new message
                        scrollToBottom={scrollToBottom}
                    />
                )}

                {view === 'settings' && (
                    <SettingsView
                        userId={userId}
                        highContrastMode={highContrastMode}
                        fontSize={fontSize}
                        handleUpdateSettings={handleUpdateSettings}
                        promptTemplates={promptTemplates}
                        theme={theme}
                        db={db}
                        __app_id={__app_id}
                    />
                )}
            </div>
        </div>
    );
}

export default App;
