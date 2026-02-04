/*
React Chatbot Widget Component
Provides conversational AI assistance on website pages
*/

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  sources?: string[];
  suggestedPages?: string[];
}

interface ChatbotWidgetProps {
  pageContext?: string; // Current page: 'home', 'incidents', 'dashboard', etc.
  apiBaseUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  pageContext = 'unknown',
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Send welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        text: `Hi! I'm the Secura Assistant. I'm here to help you navigate and use the Secura platform. Ask me anything about incident reporting, security features, or how to use the system!`,
        isBot: true,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputMessage.trim(),
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          session_id: sessionId,
          page_context: pageContext
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: data.answer,
        isBot: true,
        timestamp: new Date(),
        sources: data.sources || [],
        suggestedPages: data.suggested_pages || []
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: 'Sorry, I encountered an error. Please try again or contact support if the issue persists.',
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const positionClasses = position === 'bottom-right' 
    ? 'bottom-4 right-4' 
    : 'bottom-4 left-4';

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed ${positionClasses} z-50 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 group`}
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
          
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed ${positionClasses} z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={24} />
              <div>
                <h3 className="font-semibold">Secura Assistant</h3>
                <p className="text-xs text-cyan-100">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-cyan-800 rounded-full p-1 transition-colors"
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                {message.isBot && (
                  <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <Bot size={18} className="text-cyan-600" />
                  </div>
                )}
                
                <div className={`max-w-[75%] ${message.isBot ? '' : 'order-first'}`}>
                  <div
                    className={`rounded-lg p-3 ${
                      message.isBot
                        ? 'bg-white text-gray-800 border border-gray-200'
                        : 'bg-cyan-600 text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Sources:</p>
                        <div className="flex flex-wrap gap-1">
                          {message.sources.map((source, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Suggested Pages */}
                    {message.suggestedPages && message.suggestedPages.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">You might want to visit:</p>
                        <div className="flex flex-wrap gap-1">
                          {message.suggestedPages.map((page, idx) => (
                            <a
                              key={idx}
                              href={`/${page}`}
                              className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded hover:bg-cyan-100"
                            >
                              {page}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {!message.isBot && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-gray-600" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Bot size={18} className="text-cyan-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <Loader2 size={16} className="animate-spin text-cyan-600" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about Secura..."
                className="flex-1 px-4 py-2 text-slate-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mt-2 text-center">
              Powered by AI • Ask about Secura features
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
