// src/routes/voice.ts
import express from 'express';
import { generateAudioResponse } from '../services/aiCompanion';

const router = express.Router();

// Mock TTS function if needed (fallback)
const textToSpeech = async (text: string) => {
  console.log('Generating TTS for:', text);
  // In production, integrate ElevenLabs or Google TTS here
  return null; // Return null so frontend displays text instead of playing silence
};

router.post('/chat', async (req, res) => {
  try {
    const { audioData, mimeType } = req.body; // Expecting Base64 audio and mimeType

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    // Call AI Service
    // The implementation in aiCompanion.ts might return text or audio
    const aiResponse = await generateAudioResponse(audioData, mimeType || 'audio/webm');

    let responseAudio = aiResponse.audio;

    // If native model didn't return audio, try TTS fallback
    if (!responseAudio && aiResponse.text) {
      responseAudio = await textToSpeech(aiResponse.text);
    }

    res.json({
      text: aiResponse.text,
      audio: responseAudio, // Base64 encoded audio or null
    });

  } catch (error) {
    console.error('Error in voice chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
