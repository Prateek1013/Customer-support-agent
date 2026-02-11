import { db } from '../db/index.js';
import { messages, conversations } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const chatService = {
  createConversation: async (userId: string, activeAgent?: string) => {
    const [newConv] = await db.insert(conversations).values({ userId, activeAgent }).returning();
    return newConv;
  },

  getConversation: async (conversationId: string) => {
     const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
     return conv;
  },

  setActiveAgent: async (conversationId: string, agentId: string) => {
      await db.update(conversations)
        .set({ activeAgent: agentId })
        .where(eq(conversations.id, conversationId));
  },

  saveMessage: async (conversationId: string, role: 'user' | 'assistant', content: string, agentId?: string) => {
    const [msg] = await db.insert(messages).values({
      conversationId,
      role,
      content,
      agentId,
    }).returning();
    return msg;
  },

  getMessages: async (conversationId: string) => {
    return await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  },
  
  deleteConversation: async (conversationId: string) => {
      // Cascade delete messages first (if not handled by DB FK cascade, doing it manually to be safe)
      await db.delete(messages).where(eq(messages.conversationId, conversationId));
      await db.delete(conversations).where(eq(conversations.id, conversationId));
  }
};
