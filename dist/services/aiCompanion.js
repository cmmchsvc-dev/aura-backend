"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectCrisisLanguage = detectCrisisLanguage;
exports.chat = chat;
exports.getGuidedExercise = getGuidedExercise;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const generative_ai_1 = require("@google/generative-ai");
const firebase_1 = require("./firebase");
const logger_1 = require("./logger");
// Personality prompts
const PERSONALITY_PROMPTS = {
    warm: `You are a warm, empathetic wellness companion. You speak like a caring friend — supportive, 
gentle, and understanding. Use encouraging language. Ask how they're feeling. Celebrate small wins.`,
    direct: `You are a straightforward wellness coach. You're supportive but get to the point. 
Give clear, actionable advice. Don't sugarcoat, but always be kind. Think "tough love with heart."`,
    playful: `You are a lighthearted wellness buddy. You use humor and playfulness to make health 
feel less heavy. Include occasional emojis. Keep things upbeat while still being genuinely helpful.`,
    zen: `You are a calm, mindful wellness guide. You speak with tranquility and wisdom. 
Use metaphors from nature. Encourage presence and mindfulness. Keep responses serene and grounding.`,
};
function buildSystemPrompt(user, biometrics, patterns, timeOfDay) {
    const personalityPrompt = PERSONALITY_PROMPTS[user.personality] || PERSONALITY_PROMPTS.warm;
    let biometricContext = '';
    if (biometrics.heartRate) {
        biometricContext += `\nCurrent heart rate: ${biometrics.heartRate} bpm.`;
    }
    if (biometrics.stressLevel) {
        biometricContext += `\nStress level: ${biometrics.stressLevel}.`;
    }
    if (biometrics.sleepQuality) {
        biometricContext += `\nLast night's sleep: ${biometrics.sleepQuality}.`;
    }
    if (biometrics.steps) {
        biometricContext += `\nSteps today: ${biometrics.steps}.`;
    }
    const patternContext = patterns.patterns.length > 0
        ? `\nKnown patterns:\n${patterns.patterns.map(p => `- ${p}`).join('\n')}`
        : '';
    const predictionContext = patterns.predictions.length > 0
        ? `\nCurrent predictions:\n${patterns.predictions.map(p => `- ${p}`).join('\n')}`
        : '';
    return `${personalityPrompt}

Your name is Aura. You are talking to ${user.name}.
Their wellness goals: ${user.goals.join(', ') || 'not set yet'}.
Current time: ${timeOfDay}.
${biometricContext}
${patternContext}
${predictionContext}

IMPORTANT RULES:
1. You are NOT a doctor. Never diagnose or prescribe. Suggest they consult a healthcare provider for medical concerns.
2. If the user expresses suicidal thoughts, self-harm, or severe crisis, respond with empathy AND always include: "If you're in crisis, please reach out to the 988 Suicide & Crisis Lifeline (call or text 988) or text HOME to 741741."
3. Keep responses concise (2-4 paragraphs max) unless they ask for more detail.
4. You can offer guided exercises: breathing (4-7-8 technique), grounding (5-4-3-2-1), body scan, gratitude journaling.
5. Reference their biometric data naturally when relevant — don't just list numbers.
6. Remember conversation context and refer back to previous topics.
7. Adapt your tone if biometrics indicate stress (be more calming) or low energy (be more encouraging).`;
}
// Crisis language detection
const CRISIS_KEYWORDS = [
    'kill myself', 'want to die', 'end it all', 'suicide', 'self-harm',
    'cutting myself', 'no reason to live', 'better off dead', "can't go on",
    'hurt myself', 'end my life', 'don\'t want to be here',
];
function detectCrisisLanguage(message) {
    const lower = message.toLowerCase();
    return CRISIS_KEYWORDS.some(keyword => lower.includes(keyword));
}
// AI Provider abstraction
async function getAIResponse(systemPrompt, messages, userMessage) {
    const provider = process.env.AI_PROVIDER || 'openai';
    if (provider === 'gemini') {
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            systemInstruction: systemPrompt,
        });
        const chat = model.startChat({
            history: messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            })),
        });
        const result = await chat.sendMessage(userMessage);
        return result.response.text();
    }
    if (provider === 'anthropic') {
        const client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
        const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
                ...messages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: userMessage },
            ],
        });
        const block = response.content[0];
        return block.type === 'text' ? block.text : '';
    }
    // Default: OpenAI
    const client = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1024,
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
        ],
    });
    return response.choices[0]?.message?.content || "I'm here for you. Could you tell me more?";
}
/**
 * Main chat function — orchestrates context gathering and AI response
 */
async function chat(userId, message, conversationId) {
    const db = (0, firebase_1.getFirestore)();
    const isCrisis = detectCrisisLanguage(message);
    // Fetch user profile
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const userContext = {
        name: userData.displayName || 'friend',
        personality: userData.personality || 'warm',
        goals: userData.goals || [],
    };
    // Fetch latest biometrics
    const biometricsSnap = await db
        .collection('users').doc(userId)
        .collection('biometrics')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();
    const biometrics = {};
    if (!biometricsSnap.empty) {
        const data = biometricsSnap.docs[0].data();
        biometrics.heartRate = data.heartRate;
        biometrics.stressLevel = data.stressLevel;
        biometrics.sleepQuality = data.sleepQuality;
        biometrics.steps = data.steps;
    }
    // Fetch patterns
    const patternsSnap = await db
        .collection('users').doc(userId)
        .collection('patterns')
        .orderBy('discoveredAt', 'desc')
        .limit(5)
        .get();
    const patternContext = {
        patterns: patternsSnap.docs.map(d => d.data().description),
        predictions: [],
    };
    // Fetch recent predictions
    const predictionsSnap = await db
        .collection('users').doc(userId)
        .collection('predictions')
        .where('expiresAt', '>', new Date())
        .orderBy('expiresAt')
        .limit(3)
        .get();
    patternContext.predictions = predictionsSnap.docs.map(d => d.data().description);
    // Fetch conversation history
    const historySnap = await db
        .collection('users').doc(userId)
        .collection('conversations').doc(conversationId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();
    const history = historySnap.docs
        .map(d => ({ role: d.data().role, content: d.data().content }))
        .reverse();
    // Build system prompt
    const hour = new Date().getHours();
    const timeOfDay = hour < 6 ? 'late night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    const systemPrompt = buildSystemPrompt(userContext, biometrics, patternContext, timeOfDay);
    // Get AI response
    let response;
    try {
        response = await getAIResponse(systemPrompt, history, message);
    }
    catch (error) {
        logger_1.logger.error('AI provider error:', error);
        response = "I'm having a moment — could you try again? I'm here for you. 💜";
    }
    // If crisis detected, append resources
    if (isCrisis) {
        response += '\n\n🆘 **If you\'re in crisis, please reach out:**\n• **988 Suicide & Crisis Lifeline**: Call or text 988\n• **Crisis Text Line**: Text HOME to 741741\n• You matter, and help is available right now.';
    }
    // Store messages
    const convRef = db
        .collection('users').doc(userId)
        .collection('conversations').doc(conversationId);
    const batch = db.batch();
    const userMsgRef = convRef.collection('messages').doc();
    batch.set(userMsgRef, { role: 'user', content: message, timestamp: new Date() });
    const aiMsgRef = convRef.collection('messages').doc();
    batch.set(aiMsgRef, { role: 'assistant', content: response, timestamp: new Date() });
    batch.set(convRef, { lastMessage: response.slice(0, 100), updatedAt: new Date() }, { merge: true });
    await batch.commit();
    return { response, isCrisis, conversationId };
}
/**
 * Get guided exercise content
 */
function getGuidedExercise(type) {
    const exercises = {
        breathing: `🌬️ **4-7-8 Breathing Exercise**

Let's slow things down together.

1. **Breathe in** through your nose for **4 seconds**
2. **Hold** your breath for **7 seconds**
3. **Breathe out** slowly through your mouth for **8 seconds**

Repeat 4 times. I'll be right here when you're done.

This activates your parasympathetic nervous system — your body's natural calm-down switch.`,
        grounding: `🌿 **5-4-3-2-1 Grounding Exercise**

Let's bring you back to the present moment.

Name:
- **5** things you can **see**
- **4** things you can **touch**
- **3** things you can **hear**
- **2** things you can **smell**
- **1** thing you can **taste**

Take your time with each one. There's no rush.`,
        body_scan: `🧘 **Quick Body Scan** (2 minutes)

Close your eyes if you're comfortable.

Starting from the top of your head, slowly move your attention down:
- **Head & face** — release any tension in your jaw and forehead
- **Neck & shoulders** — let them drop away from your ears
- **Chest & stomach** — notice your breath here
- **Arms & hands** — unclench your fists
- **Legs & feet** — feel the ground beneath you

Wherever you found tension, breathe into that space. Let it soften.`,
        gratitude: `✨ **Gratitude Moment**

Take a breath and think of:

1. **One person** you're grateful for today
2. **One thing** that went well (even small)
3. **One thing** about yourself you appreciate

There's no wrong answer. Even "I got through today" counts.

Gratitude rewires your brain toward positivity — literally. Neurons that fire together wire together. 💜`,
    };
    return exercises[type] || exercises.breathing;
}
//# sourceMappingURL=aiCompanion.js.map