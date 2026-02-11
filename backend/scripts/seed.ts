
import { db } from '../src/db/index.js';
import { users, orders, payments, conversations, messages } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('Seeding database...');

  try {
    console.log('Cleaning old data...');
    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(payments);
    await db.delete(orders);
    await db.delete(users);

    console.log('Creating users...');
    const defaultUserId = '00000000-0000-0000-0000-000000000000';
    const user2Id = uuidv4();

    await db.insert(users).values([
      {
        id: defaultUserId,
        email: 'test@swadesh.ai',
        name: 'Test User',
      },
      {
        id: user2Id,
        email: 'jane@swadesh.ai',
        name: 'Jane Doe',
      },
    ]);
    console.log('Creating orders...');
    await db.insert(orders).values([
      {
        id: 'ORD-123',
        userId: defaultUserId,
        status: 'shipped',
        details: {
          items: [
            { name: 'Wireless Headphones', price: 150, quantity: 1 },
            { name: 'USB-C Cable', price: 20, quantity: 2 },
          ],
          shippingAddress: '123 Tech Park, Bangalore',
          estimatedDelivery: '2026-02-15',
        },
      },
      {
        id: 'ORD-456',
        userId: defaultUserId,
        status: 'delivered',
        details: {
          items: [
            { name: 'Gaming Mouse', price: 80, quantity: 1 },
          ],
          deliveryDate: '2026-02-01',
        },
      },
      {
        id: 'ORD-789',
        userId: defaultUserId,
        status: 'pending',
        details: {
          items: [
            { name: '4K Monitor', price: 400, quantity: 1 },
          ],
          notes: 'Fragile handling required',
        },
      },
      {
        id: 'ORD-999',
        userId: user2Id,
        status: 'processing',
        details: { items: [{ name: 'Secret Item', price: 999 }] },
      }
    ]);

    console.log('Creating payments...');
    await db.insert(payments).values([
      {
        id: 'PAY-123',
        userId: defaultUserId,
        orderId: 'ORD-123',
        amount: 19000, 
        status: 'success',
        invoiceId: 'INV-123',
      },
      {
        id: 'PAY-456',
        userId: defaultUserId,
        orderId: 'ORD-456',
        amount: 8000, 
        status: 'success',
        invoiceId: 'INV-456',
      },
      {
        id: 'PAY-789',
        userId: defaultUserId,
        orderId: 'ORD-789',
        amount: 40000,
        status: 'refunded',
        invoiceId: 'INV-789',
        refundId: 'REF-789',
        refundAmount: 40000,
        refundReason: 'Customer changed mind',
      },
    ]);

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
