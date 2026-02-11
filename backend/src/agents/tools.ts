import { tool } from 'ai';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js'; 
import { orders, payments } from '../db/schema.js';


export const orderTools = {
  modifyOrder: tool({
      parameters: z.object({ 
          jsonParams: z.string().describe("JSON STRING containing { orderId, status, priority, notes }. Do not pass a JSON object, pass a STRING."),
      }),
      description: 'Modify an order. YOU MUST PASS A SINGLE STRING ARGUMENT "jsonParams" WHICH IS A VALID JSON STRING. Example: jsonParams: "{\\"orderId\\": \\"123\\", \\"status\\": \\"shipped\\"}"', 
      execute: async ({ jsonParams }: { jsonParams: string }) => {
          console.log(`[modifyOrder] Called with jsonParams:`, jsonParams);
          
          let rawArgs;
          try {
              
              rawArgs = JSON.parse(jsonParams);
          } catch (e) {
              console.error('[modifyOrder] JSON Parse Error:', e);
          }

          let { orderId, id, updates: nestedUpdates, ...directUpdates } = rawArgs;
          
          // Normalize orderId
          if (!orderId && id) {
              console.log('[modifyOrder] Normalizing "id" to "orderId"');
              orderId = id;
          }
          
          // Flatten updates if present
          let updates = { ...directUpdates };
          if (nestedUpdates) {
              console.log('[modifyOrder] Flattening nested "updates" object');
              updates = { ...updates, ...nestedUpdates };
          }

          if (!orderId) {
              return "Error: orderId is required.";
          }
          console.log(`[modifyOrder] Modifying order ${orderId} with normalized updates:`, updates);
          
          try {
             // Check if order exists
             const existingOrder = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
             if (!existingOrder || existingOrder.length === 0) {
                 return `Error: Order ${orderId} not found. Cannot modify.`;
             }

             const currentDetails = existingOrder[0].details as any || {};
             
             // Setup update object
             const updateValues: any = {};
             
             // Update top-level status if provided
             if (updates.status) {
                 updateValues.status = updates.status;
             }
             
             // Merge other updates into 'details' JSONB column
             // We need to exclude 'status' and 'orderId' from the details merge if they were in the top level args
             const { status, ...detailUpdates } = updates;
             
             if (Object.keys(detailUpdates).length > 0) {
                 updateValues.details = { ...currentDetails, ...detailUpdates };
             }

             if (Object.keys(updateValues).length === 0) {
                 return `No changes detected for order ${orderId}.`;
             }

             await db.update(orders)
                 .set(updateValues)
                 .where(eq(orders.id, orderId));

             return `Order ${orderId} modified successfully. New status: ${updateValues.status || existingOrder[0].status}. Updated details: ${JSON.stringify(detailUpdates)}`;
          } catch (e) {
              console.error('Modify Order Error:', e);
              return 'Failed to modify order due to a technical error.';
          }
      }
  } as any),
  getOrderDetails: tool({
    description: 'Retrieve details of a PREVIOUSLY PLACED order by order ID. Do NOT use for new orders.',
    parameters: z.object({ orderId: z.string() }),
    execute: async (args: { orderId: string }, _options?: any) => {
      console.log(`[getOrderDetails] Called with args:`, JSON.stringify(args));
      const orderId = args?.orderId;
      if (!orderId) {
          console.log('[getOrderDetails] Missing orderId');
          return { error: 'Missing orderId. Please provide a valid Order ID.' };
      }

      console.log(`[getOrderDetails] Called with orderId: ${orderId}`);
      try {
        const order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (!order || order.length === 0) {
            console.log('[getOrderDetails] Order not found');
            return { error: 'Order not found' };
        }
        console.log('[getOrderDetails] Order found:', JSON.stringify(order[0]));
        return order[0];
      } catch (error) {
        console.error('[getOrderDetails] Error:', error);
        return { error: 'Failed to fetch order details' };
      }
    },
  } as any),
  listUserOrders: tool({
    description: 'List recent orders for the current user. Use this when the user asks about "my orders" or "latest order" without providing an ID.',
    parameters: z.object({ userId: z.string().optional(), limit: z.number().optional() }),
    execute: async ({ userId, limit = 5 }: { userId: string, limit?: number }) => {
        console.log(`[listUserOrders] Fetching orders for user: ${userId}`);
        if (!userId) {  
            return { error: 'User ID is missing. Cannot fetch orders.' };
        }
        try {
            const userOrders = await db.select().from(orders) 
                .where(eq(orders.userId, userId)) 
                .limit(limit); 


            if (!userOrders || userOrders.length === 0) {
                return { message: 'No orders found for this user.' };
            }
            return userOrders;
        } catch (error) {
            console.error('[listUserOrders] Error:', error);
            return { error: 'Failed to fetch user orders.' };
        }
    }
  } as any),
  checkDeliveryStatus: tool({
    description: 'Check delivery status of an order',
    parameters: z.object({ orderId: z.string() }).passthrough(),
    execute: async ({ orderId }: { orderId: string }, _options?: any) => {
       try {
        const order = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (!order || order.length === 0) {
            return { error: 'Order not found' };
        }
        return { orderId, status: order[0].status, details: 'Fetched from DB' };
      } catch (error) {
        return { error: 'Failed to fetch delivery status' };
      }
    },
  } as any),



};

export const billingTools = {
  getPaymentDetails: tool({
    description: 'Get payment/invoice details. Provide EITHER transactionId (Payment ID) OR orderId.',
    parameters: z.object({ 
        jsonParams: z.string().describe("JSON STRING containing { transactionId?, paymentId?, orderId? }. Note: paymentId is an alias for transactionId.") 
    }), 
    execute: async (rawArgs: any) => {
      let args;
      if (rawArgs.jsonParams) {
          try { 
              args = JSON.parse(rawArgs.jsonParams); 
          } catch (e) { 
              // Fallback: if jsonParams itself is an object (AI mistake), use it
              if (typeof rawArgs.jsonParams === 'object') {
                  args = rawArgs.jsonParams;
              } else {
                  return "Error: Invalid JSON string."; 
              }
          }
      } else {
          // Fallback: Direct arguments (e.g. from chat.ts injection)
          args = rawArgs;
      }
      
      let { transactionId, orderId, paymentId } = args;
      
      // Alias paymentId to transactionId if transactionId is missing
      if (!transactionId && paymentId) {
          transactionId = paymentId;
      }

      console.log(`[getPaymentDetails] Executing with args:`, { transactionId, orderId });

      try {
          let query;
          if (transactionId) {
              query = db.select().from(payments).where(eq(payments.id, transactionId)).limit(1);
          } else if (orderId) {
              query = db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
          } else {
              return { error: 'Please provide either transactionId (or paymentId) or orderId.' };
          }
          
          const payment = await query;
          if (!payment || payment.length === 0) {
              return { error: 'Payment details not found.' };
          }
          return payment[0];
      } catch (error) {
          console.error('[getPaymentDetails] Error:', error);
          return { error: 'Failed to fetch payment details' };
      }
    },
  } as any),
  checkRefundStatus: tool({
    description: 'Check refund status. Provide EITHER refundId OR orderId OR paymentId.',
    parameters: z.object({ 
        jsonParams: z.string().describe("JSON STRING containing { refundId?, orderId?, paymentId? }.") 
    }),
    execute: async (rawArgs: any) => {
       let args;
       if (rawArgs.jsonParams) {
           try { 
               args = JSON.parse(rawArgs.jsonParams); 
           } catch (e) { 
               // Fallback: if jsonParams itself is an object (AI mistake), use it
               if (typeof rawArgs.jsonParams === 'object') {
                   args = rawArgs.jsonParams;
               } else {
                   return "Error: Invalid JSON string."; 
               }
           }
       } else {
           // Fallback: Direct arguments
           args = rawArgs;
       }
       
       const { refundId, orderId, paymentId } = args;
       console.log(`[checkRefundStatus] Executing with args:`, { refundId, orderId, paymentId });
       
       try {
           let query;
           if (refundId) {
               query = db.select().from(payments).where(eq(payments.refundId, refundId)).limit(1);
           } else if (paymentId) {
               query = db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
           } else if (orderId) {
               query = db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
           } else {
               return { error: 'Please provide refundId, paymentId, or orderId.' };
           }

           const payment = await query;
           if (!payment || payment.length === 0) {
              return { error: 'Refund record not found.' };
           }
           
           const record = payment[0];
           if (record.refundId || record.status === 'refunded') {
               return {
                   status: 'Refunded',
                   refundId: record.refundId,
                   refundAmount: record.refundAmount,
                   reason: record.refundReason,
                   originalPaymentId: record.id
               };
           } else {
               return { status: 'No refund found for this transaction.', paymentStatus: record.status };
           }
       } catch (e) {
           console.error('[checkRefundStatus] Error:', e);
           return { error: 'Failed to check refund status.' };
       }
    },
  } as any),
};

export const supportTools = {
  queryHistory: tool({
    description: 'Query conversation history',
    parameters: z.object({ query: z.string() }).passthrough(),
    execute: async ({ query }: { query: string }, _options?: any) => {
      return { results: ['Previous discussion about login issues'] };
    },
  } as any),
};
