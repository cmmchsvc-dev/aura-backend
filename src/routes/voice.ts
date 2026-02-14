import express from 'express';
import { generateAudioResponse } from '../services/aiCompanion';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { audioData } = req.body; 
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    const aiResponse = await generateAudioResponse(audioData);
    res.json({
      text: aiResponse.text,
      audio: aiResponse.audio, 
    });
  } catch (error) {
    console.error('Error in voice chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;