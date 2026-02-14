import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getFirestore } from './firebase';
import { logger } from './logger';

interface UserContext {
  name: string;
  personality: 'warm' | 'direct' | 'playful' | 'zen';
  goals: string[];
}

interface BiometricContext {
  heartRate?: number;
  stressLevel?: 'low' | 'moderate' | 'high' | 'very_high';
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  steps?: number;
  lastUpdated?: string;
}

interface PatternContext {
  patterns: string[];
  predictions: string[];
}

const PERSONALITY_PROMPTS: Record<string, string> = {
  warm: `You are a warm, empathetic wellness companion. You speak like a caring friend — supportive, gentle, and understanding.`,
  direct: `You are a straightforward wellness coach. You're supportive but get to the point. Give clear, actionable advice.`,
  playful: `You are a lighthearted wellness buddy. You use humor and playfulness to make health feel less heavy.`,
  zen: `You are a calm, mindful wellness guide. You speak with tranquility and wisdom.`,
};

function buildSystemPrompt(user: UserContext, biometrics: BiometricContext, patterns: PatternContext, timeOfDay: string): string {
  const personalityPrompt = PERSONALITY_PROMPTS[user.personality] || PERSONALITY_PROMPTS.warm;
  return `${personalityPrompt} Your name is Aura. You are talking to ${user.name}. Current time: ${timeOfDay}.`;
}

export function detectCrisisLanguage(message: string): boolean {
  const CRISIS_KEYWORDS = ['kill myself', 'want to die', 'suicide', 'self-harm'];
  const lower = message.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lower.includes(keyword));
}

async function getAIResponse(systemPrompt: string, messages: any[], userMessage: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const chat = model.startChat({
    history: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

export async function chat(userId: string, message: string, conversationId: string) {
  const db = getFirestore();
  const isCrisis = detectCrisisLanguage(message);
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data() || {};
  
  const historySnap = await db.collection('users').doc(userId).collection('conversations').doc(conversationId).collection('messages').orderBy('timestamp', 'desc').limit(20).get();
  const history = historySnap.docs.map(d => ({ role: d.data().role, content: d.data().content })).reverse();

  const systemPrompt = buildSystemPrompt({ name: userData.displayName || 'friend', personality: userData.personality || 'warm', goals: userData.goals || [] }, {}, { patterns: [], predictions: [] }, 'day');
  const response = await getAIResponse(systemPrompt, history, message);

  const convRef = db.collection('users').doc(userId).collection('conversations').doc(conversationId);
  await convRef.collection('messages').add({ role: 'user', content: message, timestamp: new Date() });
  await convRef.collection('messages').add({ role: 'assistant', content: response, timestamp: new Date() });

  return { response, isCrisis, conversationId };
}

export const generateAudioResponse = async (audioBase64: string) => {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent([audioBase64]);
  return { text: result.response.text(), audio: null };
};