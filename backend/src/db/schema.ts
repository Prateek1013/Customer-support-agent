import { pgTable, serial, text, timestamp, boolean, integer, jsonb, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  activeAgent: text('active_agent'), // 'order', 'billing', etc. or null
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  content: text('content').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant'
  agentId: text('agent_id'), // 'support' | 'order' | 'billing' | 'router'
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(), // Using text for order IDs like 'ORD-123'
  userId: uuid('user_id').references(() => users.id),
  status: text('status').notNull(), // 'pending', 'shipped', 'delivered', 'cancelled'
  details: jsonb('details').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey(), // 'PAY-123'
  userId: uuid('user_id').references(() => users.id),
  orderId: text('order_id').references(() => orders.id), // Link to order
  amount: integer('amount').notNull(), // in cents
  status: text('status').notNull(), // 'success', 'refunded', 'failed'
  invoiceId: text('invoice_id'),
  refundId: text('refund_id'),
  refundAmount: integer('refund_amount'), // in cents
  refundReason: text('refund_reason'),
  createdAt: timestamp('created_at').defaultNow(),
});
