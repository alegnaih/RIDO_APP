import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../constants/config';
import { ChatMessage } from '../types';

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!config.geminiApiKey) {
      throw new Error('Gemini API key not configured. Set geminiApiKey in app.json extra or .env');
    }
    genAI = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return genAI;
}

export async function generateTravelResponse(
  messages: ChatMessage[],
  userLatitude?: number,
  userLongitude?: number,
): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const systemPrompt = `You are "RIDO Assistant", a travel assistant for motorcycle convoy riders. 
Keep responses short and safety-focused. If the user shares GPS coordinates, mention nearby POIs (gas stations, eateries, rest areas). 
Do not discuss politics, religion, or non-travel topics. Current location: ${
    userLatitude && userLongitude
      ? `lat: ${userLatitude.toFixed(4)}, lon: ${userLongitude.toFixed(4)}`
      : 'unknown'
  }`;

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }],
  }));

  const lastMessage = messages[messages.length - 1]?.text ?? '';

  const chat = model.startChat({
    history,
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessage(lastMessage);
  return result.response.text();
}
