import React, { useEffect, useRef } from 'react';
import { useChatStream } from '../hooks/useChatStream';
import { Send, User, Bot, Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react';

export default function ChatLayout() {
  const { 
      messages, 
      input, 
      setInput, 
      sendMessage, 
      isLoading,
      conversationId,
      conversations,
      loadConversation,
      startNewChat,
      deleteConversation
  } = useChatStream();

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
      if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
  }, [input]);

  const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSubmit(e);
      }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-800 border-r border-gray-700 hidden md:flex flex-col">
        <div className="p-4 border-b border-gray-700">
             <div className="flex items-center gap-2 mb-6">
                 <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                     <Bot size={20} className="text-white" />
                 </div>
                 <h1 className="text-xl font-bold text-white tracking-tight">Swadesh AI</h1>
             </div>
             
             <button 
                onClick={startNewChat}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-900/20"
             >
                 <Plus size={18} />
                 <span className="font-semibold">New Chat</span>
             </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <h2 className="text-xs uppercase text-gray-500 font-bold px-3 py-2 tracking-wider">Recent History</h2>
            {conversations.map(conv => (
                <div 
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                        conversationId === conv.id 
                            ? 'bg-gray-700/80 text-white shadow-inner' 
                            : 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-200'
                    }`}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <MessageSquare size={16} className={conversationId === conv.id ? 'text-blue-400' : 'text-gray-500'} />
                        <span className="text-sm truncate w-32">
                            {new Date(conv.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
            
            {conversations.length === 0 && (
                <div className="text-center text-gray-600 py-10 text-sm">
                    No history yet
                </div>
            )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative w-full">
        <header className="h-16 px-6 border-b border-gray-700 bg-gray-800/50 backdrop-blur-md flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-3">
                <div className="md:hidden">
                    <Bot size={24} className="text-blue-500" />
                </div>
                <div>
                    <h2 className="font-semibold text-gray-100">Support Assistant</h2>
                    <p className="text-xs text-green-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        Always Online
                    </p>
                </div>
            </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
          {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-2">
                    <Bot size={32} className="text-blue-500" />
                  </div>
                  <p>How can I help you today?</p>
              </div>
          )}
        
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 md:p-5 flex gap-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700'
              }`}>
                <div className="shrink-0 mt-1">
                    {msg.role === 'user' 
                        ? <User size={20} className="text-blue-100" /> 
                        : <Bot size={20} className="text-blue-400" />
                    }
                </div>
                <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                    {msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
             <div className="flex justify-start animate-in fade-in duration-300">
                 <div className="bg-gray-800 border border-gray-700 text-gray-100 rounded-2xl rounded-bl-sm p-4 flex gap-4 items-center shadow-sm">
                    <Bot size={20} className="text-blue-400 shrink-0" />
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                         <Loader2 size={16} className="animate-spin text-blue-400" />
                         <span>Thinking...</span>
                    </div>
                 </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 md:p-6 bg-gray-900/95 border-t border-gray-800 sticky bottom-0 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                rows={1}
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl pl-5 pr-14 py-4 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none min-h-[56px] max-h-40 shadow-lg transition-all scrollbar-hide"
            />
            <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="absolute right-3 bottom-3 p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-600/20 active:scale-95"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[10px] text-gray-600">AI can make mistakes. Check important info.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

