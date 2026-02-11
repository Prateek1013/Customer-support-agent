import { Hono } from 'hono';
import { handleChat } from '../controllers/chat.js';

import { getConversations, getConversationHistory, createConversation, deleteConversation } from '../controllers/conversationController.js';

export const router = new Hono();

router.post('/chat', handleChat);
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.delete('/conversations/:id', deleteConversation);
router.get('/conversations/:id', getConversationHistory);

router.get('/agents', (c) => c.json({ agents: ['support', 'order', 'billing'] }));
