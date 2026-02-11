import 'dotenv/config';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

const groq = createGroq({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export const routeQuery = async (query: string, messages: any[] = []) => {
  const systemPrompt = `You are a Router Agent. Your job is to classify the user's intent and extract any relevant Order IDs.

INTENTS:
- 'order': User wants to check status, modify an order, list orders, or asks about a specific order item.
- 'billing': User asks about invoices, payments, refunds, or pricing details of a SPECIFIC transaction/order.
- 'support': User asks about return policies, general FAQs, or contact info.
- 'general': Greetings, or queries not related to orders/billing.

EXTRACTION:
- Extract 'orderId' if present in the user query OR conversation history.
- Format: Look for patterns like "ORD-..." or just IDs mentioned in context.

OUTPUT JSON: { intent: "...", parameters: { "orderId": "..." } }`;

  try {
    // Use generateText instead of generateObject because qwen/qwen3-32b may not support JSON schema mode
    const result = await generateText({
      model: groq('qwen/qwen3-32b'),
      system: systemPrompt + "\n\nCRITICAL INSTRUCTION: You MUST respond with ONLY a valid JSON object. Do not use markdown code blocks. Do not add explanations.",
      messages: [
        ...messages,
        { role: 'user', content: query }
      ],
    });

    console.log('[Router] Raw AI Response:', JSON.stringify(result.text));

    try {
        let cleanText = result.text.trim();
        
        cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        const firstOpen = cleanText.indexOf('{');
        const lastClose = cleanText.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            cleanText = cleanText.substring(firstOpen, lastClose + 1);
        } else {
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim(); // ai response has markers
        }
        
        const parsed = JSON.parse(cleanText);
        // Validate minimally
        if (!parsed.intent) parsed.intent = 'general';
        return parsed;
    } catch (parseError) {
        console.error('[Router] JSON Parse Failure:', result.text);
        return { intent: 'general', parameters: {} };
    }
  } catch (error) {
    console.error('[Router] Error routing query:', error);
    return { intent: 'general', parameters: {} };
  }
};
