import { generateText, streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export interface Agent {
  name: string;
  description: string;
  process(message: string, history: any[]): Promise<any>;
}

export const tools = {
  // Define shared tools here or specific tools in agents
};
