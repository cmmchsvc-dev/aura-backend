import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';

const router = Router();

/**
 * Generate LiveKit access token for voice chat
 * POST /api/livekit/token
 * Body: { roomName: string, participantName: string }
 */
router.post('/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({
        error: 'Missing required fields: roomName and participantName'
      });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('[LiveKit] Missing API credentials in environment');
      return res.status(500).json({
        error: 'LiveKit credentials not configured'
      });
    }

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });

    // Grant permissions
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    console.log(`[LiveKit] Generated token for ${participantName} in room ${roomName}`);

    res.json({
      token: jwt,
      url: process.env.LIVEKIT_URL
    });
  } catch (error) {
    console.error('[LiveKit] Error generating token:', error);
    res.status(500).json({
      error: 'Failed to generate LiveKit token'
    });
  }
});

export default router;
