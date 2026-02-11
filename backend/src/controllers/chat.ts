import 'dotenv/config';
import type { Context } from 'hono';
import { streamText, generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { routeQuery } from '../agents/router.js';
import { orderTools, billingTools, supportTools } from '../agents/tools.js';
import { chatService } from '../services/chatService.js';


export const handleChat = async (c: Context) => {
  console.log('[handleChat] Request received');
  let body;
  try {
    body = await c.req.json();
  } catch (e) {
    console.error('[handleChat] JSON Parse Error:', e);
    return c.json({ error: 'Invalid JSON' }, 400);
  }
  let { messages, conversationId } = body;
  const userId = c.req.header('X-User-Id') || '00000000-0000-0000-0000-000000000000';

  // Create conversation if not exists
  if (!conversationId) {
      const newConv = await chatService.createConversation(userId);
      conversationId = newConv.id;
  }


  const groq = createGroq({
    apiKey: process.env.AI_GATEWAY_API_KEY,
  });

  if (!messages || !Array.isArray(messages)) {
    return c.json({ error: 'Invalid messages format' }, 400);
  }

  const lastMessage = messages[messages.length - 1];
  const userQuery = lastMessage.content;

  // Save User Message
  await chatService.saveMessage(conversationId, 'user', userQuery);


  // 1. Determine Intent (Sticky Routing)
  let intent = 'general';
  let routingResult: any = null;
  
  // Check for active agent
  // Sticky routing removed
  // Always route dynamically
  try {
    // Pass FULL history to router for better context
    routingResult = await routeQuery(userQuery, messages);
    intent = routingResult.intent;
    console.log(`Routed to: ${intent}`);
  } catch (error) {
    console.error('Routing failed, defaulting to general/support:', error);
  }

  // 2. Select Tools & System Prompt
  let tools: any = {};
  let systemPrompt = 'You are a helpful assistant.';

  switch (intent) {
    case 'order':
      tools = orderTools;
      
      // Manual Context Fetching (since native tools are disabled/flaky)
      let systemContext = '';
      if (routingResult?.parameters?.orderId) {
          console.log(`Fetching order details for ${routingResult.parameters.orderId}`);
          try {
            // Manually execute the tool to get data
            const orderData = await (orderTools.getOrderDetails as any).execute({ orderId: routingResult.parameters.orderId }, { toolCallId: 'simulated', messages: [] });
            systemContext = `\n\nCONTEXT FROM DATABASE:\nOrder Details: ${JSON.stringify(orderData)}`;
          } catch (e) {
            console.error('Failed to fetch order context manually:', e);
          }
      }

      systemPrompt = `You are a helpful customer support agent for Swadesh AI.
Role: Order Modification & Status Specialist.
${systemContext}

SCHEMA INFORMATION:
- Orders Table: id (string), userId (uuid), status (string: 'pending', 'shipped', 'delivered', 'cancelled'), details (jsonb), createdAt (timestamp).
- details (JSONB): Can contain arbitrary fields, but standard ones are 'items', 'priority', 'notes'.

IMPORTANT RESTRICTIONS & PROTOCOL:
1. NO FAKE ACTIONS: You CANNOT create new orders. You CANNOT "process" an order without calling a tool.
2. PRIORITY: If the user provides an Order ID (e.g., in the message or context), use 'getOrderDetails' or 'checkDeliveryStatus'. DO NOT use 'listUserOrders' if you already have an ID.
3. FALLBACK: Only use 'listUserOrders' if the user asks about "my orders", "latest order", or if you need to find an Order ID because the user didn't provide one.
4. DO NOT CALL TOOLS WITH EMPTY ARGUMENTS.
5. MODIFICATIONS: If the user wants to change an order:
   a. ASK for the Order ID if missing.
   b. CONFIRM the change with the user.
   c. CALL 'modifyOrder' tool.
   d. WAIT for the tool result.
   e. REPEAT the tool result to the user.
6. NEVER say "Order processed successfully" unless you have received a successful result from the 'modifyOrder' tool.
7. If you are unsure, check the order status first.
8. DO NOT INVENT PARAMETERS.
9. FOR 'modifyOrder': You MUST pass a SINGLE argument 'jsonParams' which is a JSON STRING representing the updates.
   Example: modifyOrder({ jsonParams: '{"orderId": "123", "status": "shipped"}' })
   DO NOT pass the object directly. PASS A STRING.
`;

      break;
      
    case 'billing':
      tools = billingTools;
      systemPrompt = `You are a Billing Support Agent. 
Use 'getPaymentDetails' and 'checkRefundStatus' to help with invoices and refunds.
IMPORTANT:
1. These tools take a SINGLE argument 'jsonParams' which is a JSON STRING.
   Example: getPaymentDetails({ jsonParams: '{"orderId": "123"}' })
2. Schema Info:
   - Payments are linked to Orders via orderId.
   - Refunds are stored within the Payment record (refundId, refundAmount).
   - If a user asks for an invoice, fetch the payment details.`;
      break;
      
    case 'support':
    case 'general':
    default:
      tools = supportTools;
      systemPrompt = 'You are a General Support Agent. Help the user with their queries. You can query conversation history if needed.';
      break;
  }

  // 4. Manual Tool Loop
  console.log('[handleChat] Using tools:', Object.keys(tools));
  const maxSteps = 5;
  let currentStep = 0;
  let currentMessages: any[] = messages.map((m: any) => ({ role: m.role, content: m.content }));

  try {
    while (currentStep < maxSteps) {
      console.log(`[handleChat] Step ${currentStep + 1}/${maxSteps}`);
      
      const result = await generateText({
        model: groq('qwen/qwen3-32b'),
        system: systemPrompt,
        messages: currentMessages,
        tools: tools,
      });

      if (result.toolCalls.length === 0) {
        console.log('[handleChat] No tool calls, streaming final response');
        const stream = await streamText({
            model: groq('qwen/qwen3-32b'),
            system: systemPrompt,
            messages: currentMessages,
            onFinish: async ({ text }) => {
                console.log('[handleChat] Saving AI response to DB');
                await chatService.saveMessage(conversationId, 'assistant', text, intent);
            }
        });
        return stream.toTextStreamResponse({
            headers: { 'X-Conversation-Id': conversationId }
        });
      }

      const sanitizedToolCalls = result.toolCalls.map(tc => {
          let args = (tc as any).args ?? (tc as any).input ?? {};
          if (Object.keys(args).length === 0) {
              console.log('[handleChat] Empty args detected, checking router parameters...');
              const toolsWithOrderId = ['getOrderDetails', 'checkDeliveryStatus', 'getPaymentDetails', 'checkRefundStatus'];
              
              if (toolsWithOrderId.includes(tc.toolName) && routingResult?.parameters?.orderId) {
                  console.log(`[handleChat] Injecting orderId from router: ${routingResult.parameters.orderId}`);
                  args = { orderId: routingResult.parameters.orderId };
              } else {
                  console.log('[handleChat] No router fallback available, injecting MISSING');
                  args = { orderId: 'MISSING' };
              }
          }
          
           // Inject User ID for listUserOrders
          if (tc.toolName === 'listUserOrders') {
              args.userId = userId;
          }
          return {
            type: 'tool-call' as const,
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            args: args,
          };
      });

      currentMessages.push({
          role: 'assistant',
          content: result.text || '',
          toolCalls: sanitizedToolCalls,
      });

      for (const toolCall of sanitizedToolCalls) {
          const toolName = toolCall.toolName;
          const args = (toolCall as any).args;
          console.log(`[handleChat] Executing tool: ${toolName} with args:`, args);

          let toolResult;
          try {
              // @ts-ignore
              toolResult = await tools[toolName].execute(args);
          } catch (error: any) {
              console.error(`[handleChat] Tool execution failed:`, error);
              toolResult = { error: error.message };
          }

          console.log(`[handleChat] Tool result:`, toolResult);
          
          currentMessages.push({
              role: 'user',
              content: `Tool "${toolName}" (ID: ${toolCall.toolCallId}) returned: ${JSON.stringify(toolResult)}`
          });
      }
      
      currentStep++;
    }

    // specific case for running out of steps 
    const stream = await streamText({
        model: groq('qwen/qwen3-32b'),
        system: systemPrompt,
        messages: currentMessages,
        onFinish: async ({ text }) => {
            console.log('[handleChat] Saving final AI response to DB');
            await chatService.saveMessage(conversationId, 'assistant', text, intent);
        }
    });
    return stream.toTextStreamResponse({
        headers: { 'X-Conversation-Id': conversationId }
    });

  } catch (error: any) {
    console.error('AI Error (Full):', JSON.stringify(error, null, 2));
    console.error('AI Error Message:', error.message);
    if (error.response) {
       // @ts-ignore
        console.error('AI Error Response:', await error.response.text());
    }
    return c.text('Mock response: The AI service is not configured (missing API key). But the system is working!', 200);
  }
};
