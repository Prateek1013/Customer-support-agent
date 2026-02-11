import { useState, useRef } from 'react';

export function useChatStream() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);

  // Load conversations list
  const fetchConversations = async () => {
      try {
          const res = await fetch('/api/conversations');
          const data = await res.json();
          setConversations(data);
      } catch (e) {
          console.error('Failed to fetch conversations', e);
      }
  };

  // Load history for a specific conversation
  const loadConversation = async (id) => {
      setIsLoading(true);
      setConversationId(id);
      try {
          const res = await fetch(`/api/conversations/${id}`);
          const history = await res.json();
          // Map DB messages to UI format
          setMessages(history.map(m => ({ role: m.role, content: m.content })));
      } catch (e) {
          console.error('Failed to load conversation', e);
      } finally {
          setIsLoading(false);
      }
  };

  const startNewChat = () => {
      setConversationId(null);
      setMessages([]);
  };

  const deleteConversation = async (id) => {
      try {
          await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
          await fetchConversations();
          if (conversationId === id) {
              startNewChat();
          }
      } catch (e) {
          console.error('Failed to delete conversation', e);
      }
  }

  const sendMessage = async (content) => {
    if (!content.trim()) return;

    const userMessage = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage], conversationId }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      
      // Update conversation ID from header if it was a new chat
      const newConvId = response.headers.get('X-Conversation-Id');
      if (newConvId && newConvId !== conversationId) {
          setConversationId(newConvId);
          await fetchConversations(); // Refresh list to show new chat
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = { role: 'assistant', content: '' };
      
      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantMessage.content += chunk;
        
        setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...assistantMessage };
            return newMessages;
        });
      }
      
      // If message is still empty after stream, check if we should show something
      if (!assistantMessage.content) {
          setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { 
                  ...assistantMessage, 
                  content: 'Order processed successfully! Check your order history for details.' 
              };
              return newMessages;
          });
      }

    } catch (error) {
      console.error('Error fetching chat:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error: Could not fetch response.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useState(() => {
      fetchConversations();
  }, []);

  return { 
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
  };
}

