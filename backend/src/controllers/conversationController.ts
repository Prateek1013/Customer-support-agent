import type { Context } from 'hono';
import { chatService } from '../services/chatService.js';
import { db } from '../db/index.js';
import { conversations } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';

// Mock User ID for now
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000'; // Make sure this exists or is handled

export const getConversations = async (c: Context) => {
  // In a real app, extract userId from Auth context
  const userId = c.req.header('X-User-Id') || DEMO_USER_ID; 
  
  // If demo user doesn't exist, we might need to create it (skipped for now, assuming seed/migration handles it or we use raw UUID)
  // Actually, let's just query by userId if we have it in schema
   const allConversations = await db.select().from(conversations)
    .where(eq(conversations.userId, userId)) // Filter by user
    .orderBy(desc(conversations.createdAt));
    
  return c.json(allConversations);
};

export const getConversationHistory = async (c: Context) => {
  const id = c.req.param('id');
  const history = await chatService.getMessages(id);
  return c.json(history);
};

export const createConversation = async (c: Context) => {
    const userId = c.req.header('X-User-Id') || DEMO_USER_ID;
    const newConv = await chatService.createConversation(userId);
    return c.json(newConv);
};

export const deleteConversation = async (c: Context) => {
    const id = c.req.param('id');
    await chatService.deleteConversation(id);
    return c.json({ success: true });
};

