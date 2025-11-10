
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { ChatBubbleIcon, CloseIcon, SendIcon } from './Icons';

const API_KEY = process.env.API_KEY;

type Message = {
    role: 'user' | 'model';
    text: string;
};

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: "Hello! I'm HealthBot. How can I help you today? You can ask me about general health topics or specific pathology tests." }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && !chatSessionRef.current && API_KEY) {
            const ai = new GoogleGenAI({ apiKey: API_KEY });
            chatSessionRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: `You are HealthBot, a friendly and knowledgeable AI assistant for the HealthPath app.
                    Your purpose is to provide educational information about general health, wellness, and pathology tests.
                    - Answer user questions clearly and concisely.
                    - You can explain what a test is, its purpose, and what normal ranges generally mean.
                    - **Crucially, you MUST NOT provide medical advice, diagnoses, or interpretations of a user's specific lab results.**
                    - If a user asks for a diagnosis or medical advice, you must politely decline and strongly recommend they consult a qualified healthcare professional.
                    `,
                },
            });
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        if (!chatSessionRef.current) {
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, the chatbot is not available right now. Please ensure the API key is configured." }]);
            setIsLoading(false);
            return;
        }

        try {
            const response = await chatSessionRef.current.sendMessage({ message: userInput });
            const modelMessage: Message = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Chatbot error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Chat Bubble Toggle */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-primary hover:bg-primary-dark text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    aria-label="Toggle Chatbot"
                >
                    {isOpen ? <CloseIcon className="w-6 h-6" /> : <ChatBubbleIcon className="w-6 h-6" />}
                </button>
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-full max-w-sm h-[70vh] max-h-[600px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in-up">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">HealthBot</h3>
                        <p className="text-xs text-slate-500">AI Health Assistant</p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />') }} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-200 dark:bg-slate-700 rounded-2xl px-4 py-2 rounded-bl-none">
                                    <div className="flex items-center space-x-1">
                                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Ask a question..."
                                className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary"
                                disabled={isLoading}
                                aria-label="Chat input"
                            />
                            <button
                                type="submit"
                                className="p-2 bg-primary text-white rounded-lg disabled:bg-slate-400"
                                disabled={isLoading || !userInput.trim()}
                                aria-label="Send message"
                            >
                                <SendIcon className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
