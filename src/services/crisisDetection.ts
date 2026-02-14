import { getFirestore } from './firebase';
import { logger } from './logger';
import twilio from 'twilio';

interface CrisisContact {
  name: string;
  phone: string;
  email: string;
}

interface CrisisEvent {
  userId: string;
  type: 'biometric' | 'chat' | 'manual' | 'sleep';
  severity: 'warning' | 'alert' | 'critical';
  description: string;
  timestamp: Date;
  notifiedContacts: boolean;
}

/**
 * Check biometric data for crisis indicators
 */
export async function checkBiometricCrisis(
  userId: string,
  heartRate: number,
  isExercising: boolean
): Promise<CrisisEvent | null> {
  if (isExercising) return null;

  const db = getFirestore();

  // Check for sustained elevated HR (>120 bpm for 10+ minutes without exercise)
  if (heartRate > 120) {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentHR = await db
      .collection('users').doc(userId)
      .collection('biometrics')
      .where('timestamp', '>', tenMinAgo)
      .where('heartRate', '>', 110)
      .get();

    if (recentHR.size >= 5) {
      return {
        userId,
        type: 'biometric',
        severity: 'alert',
        description: `Sustained elevated heart rate (${heartRate} bpm) detected without exercise activity`,
        timestamp: new Date(),
        notifiedContacts: false,
      };
    }
  }

  // Panic attack signature: sudden HR spike > 140 bpm
  if (heartRate > 140 && !isExercising) {
    return {
      userId,
      type: 'biometric',
      severity: 'critical',
      description: `Possible panic attack detected — heart rate spike to ${heartRate} bpm`,
      timestamp: new Date(),
      notifiedContacts: false,
    };
  }

  return null;
}

/**
 * Check for severe sleep disruption
 */
export async function checkSleepCrisis(userId: string): Promise<CrisisEvent | null> {
  const db = getFirestore();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const sleepData = await db
    .collection('users').doc(userId)
    .collection('healthData')
    .where('timestamp', '>', threeDaysAgo)
    .where('sleepQuality', '<', 30)
    .get();

  if (sleepData.size >= 3) {
    return {
      userId,
      type: 'sleep',
      severity: 'warning',
      description: 'Severe sleep disruption detected — 3+ consecutive nights of poor sleep',
      timestamp: new Date(),
      notifiedContacts: false,
    };
  }

  return null;
}

/**
 * Trigger Crisis Circle notifications
 */
export async function triggerCrisisCircle(
  userId: string,
  event: CrisisEvent
): Promise<void> {
  const db = getFirestore();

  // Fetch crisis contacts
  const contactsSnap = await db
    .collection('users').doc(userId)
    .collection('crisisContacts')
    .get();

  if (contactsSnap.empty) {
    logger.warn(`Crisis detected for user ${userId} but no crisis contacts configured`);
    return;
  }

  const userDoc = await db.collection('users').doc(userId).get();
  const userName = userDoc.data()?.displayName || 'Your loved one';

  const contacts: CrisisContact[] = contactsSnap.docs.map(d => d.data() as CrisisContact);

  // Send SMS via Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    for (const contact of contacts) {
      try {
        await client.messages.create({
          body: `🌌 Aura Alert: ${userName} may need your support right now. They've been added you as a trusted contact in their Crisis Circle. Please check in on them. If this is an emergency, call 911.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: contact.phone,
        });
        logger.info(`Crisis SMS sent to ${contact.name} for user ${userId}`);
      } catch (error) {
        logger.error(`Failed to send crisis SMS to ${contact.name}:`, error);
      }
    }
  }

  // Log the crisis event
  await db.collection('users').doc(userId).collection('crisisEvents').add({
    ...event,
    notifiedContacts: true,
    contactsNotified: contacts.map(c => c.name),
  });
}

/**
 * Manual "I need help" trigger
 */
export async function manualCrisisTrigger(userId: string): Promise<void> {
  const event: CrisisEvent = {
    userId,
    type: 'manual',
    severity: 'critical',
    description: 'User manually triggered crisis alert',
    timestamp: new Date(),
    notifiedContacts: false,
  };

  await triggerCrisisCircle(userId, event);
}

export const CRISIS_RESOURCES = {
  lifeline: { name: '988 Suicide & Crisis Lifeline', number: '988', type: 'call_or_text' },
  textLine: { name: 'Crisis Text Line', number: '741741', type: 'text', keyword: 'HOME' },
  emergency: { name: 'Emergency Services', number: '911', type: 'call' },
  trevorProject: { name: 'Trevor Project (LGBTQ+)', number: '1-866-488-7386', type: 'call' },
  samhsa: { name: 'SAMHSA Helpline', number: '1-800-662-4357', type: 'call' },
};
