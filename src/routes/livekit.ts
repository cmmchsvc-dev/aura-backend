import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';

export const livekitRouter = Router();

livekitRouter.post('/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'roomName and participantName are required' });
    }

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: participantName,
      },
    );

    at.addGrant({ 
      roomJoin: true, 
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    res.json({
      token: await at.toJwt(),
      url: process.env.LIVEKIT_URL,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});