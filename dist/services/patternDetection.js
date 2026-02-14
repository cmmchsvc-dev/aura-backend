"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeUserPatterns = analyzeUserPatterns;
exports.getWellnessProfile = getWellnessProfile;
const firebase_1 = require("./firebase");
const logger_1 = require("./logger");
/**
 * Analyze time-of-day patterns
 * e.g., "Your stress typically rises around 3 PM"
 */
function analyzeTimeOfDayPatterns(data) {
    const patterns = [];
    // Group data by hour
    const hourlyStress = {};
    const hourlyHR = {};
    for (const point of data) {
        const hour = new Date(point.timestamp).getHours();
        if (point.stressLevel !== undefined) {
            if (!hourlyStress[hour])
                hourlyStress[hour] = [];
            hourlyStress[hour].push(point.stressLevel);
        }
        if (point.heartRate !== undefined) {
            if (!hourlyHR[hour])
                hourlyHR[hour] = [];
            hourlyHR[hour].push(point.heartRate);
        }
    }
    // Find stress spikes
    const avgStressByHour = Object.entries(hourlyStress).map(([hour, values]) => ({
        hour: parseInt(hour),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
    }));
    const overallAvgStress = avgStressByHour.reduce((sum, h) => sum + h.avg, 0) / (avgStressByHour.length || 1);
    for (const hourData of avgStressByHour) {
        if (hourData.count >= 5 && hourData.avg > overallAvgStress * 1.3) {
            const timeStr = formatHour(hourData.hour);
            patterns.push({
                id: `tod_stress_${hourData.hour}`,
                type: 'time_of_day',
                description: `Your stress tends to spike around ${timeStr}`,
                confidence: Math.min(hourData.count / 14, 0.95), // More data = higher confidence
                metric: 'stress',
                hourOfDay: hourData.hour,
                discoveredAt: new Date(),
                occurrences: hourData.count,
            });
        }
    }
    return patterns;
}
/**
 * Analyze day-of-week patterns
 * e.g., "Sunday nights tend to be anxious for you"
 */
function analyzeDayOfWeekPatterns(data) {
    const patterns = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    // Group by day of week
    const dailyStress = {};
    const dailySleep = {};
    for (const point of data) {
        const day = new Date(point.timestamp).getDay();
        if (point.stressLevel !== undefined) {
            if (!dailyStress[day])
                dailyStress[day] = [];
            dailyStress[day].push(point.stressLevel);
        }
        if (point.sleepQuality !== undefined) {
            if (!dailySleep[day])
                dailySleep[day] = [];
            dailySleep[day].push(point.sleepQuality);
        }
    }
    // Find high-stress days
    const avgStressByDay = Object.entries(dailyStress).map(([day, values]) => ({
        day: parseInt(day),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
    }));
    const overallAvg = avgStressByDay.reduce((sum, d) => sum + d.avg, 0) / (avgStressByDay.length || 1);
    for (const dayData of avgStressByDay) {
        if (dayData.count >= 3 && dayData.avg > overallAvg * 1.25) {
            patterns.push({
                id: `dow_stress_${dayData.day}`,
                type: 'day_of_week',
                description: `${dayNames[dayData.day]}s tend to be more stressful for you`,
                confidence: Math.min(dayData.count / 8, 0.9),
                metric: 'stress',
                dayOfWeek: dayData.day,
                discoveredAt: new Date(),
                occurrences: dayData.count,
            });
        }
    }
    // Find poor sleep nights
    const avgSleepByDay = Object.entries(dailySleep).map(([day, values]) => ({
        day: parseInt(day),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
    }));
    const overallAvgSleep = avgSleepByDay.reduce((sum, d) => sum + d.avg, 0) / (avgSleepByDay.length || 1);
    for (const dayData of avgSleepByDay) {
        if (dayData.count >= 3 && dayData.avg < overallAvgSleep * 0.8) {
            patterns.push({
                id: `dow_sleep_${dayData.day}`,
                type: 'day_of_week',
                description: `You tend to sleep poorly on ${dayNames[dayData.day]} nights`,
                confidence: Math.min(dayData.count / 8, 0.9),
                metric: 'sleep',
                dayOfWeek: dayData.day,
                discoveredAt: new Date(),
                occurrences: dayData.count,
            });
        }
    }
    return patterns;
}
/**
 * Analyze correlations between metrics
 * e.g., "Poor sleep correlates with higher stress the next day"
 */
function analyzeCorrelations(data) {
    const patterns = [];
    // Sort by timestamp
    const sorted = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    // Sleep → next day mood/stress correlation
    let poorSleepHighStressCount = 0;
    let poorSleepCount = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        const currentDate = new Date(current.timestamp);
        const nextDate = new Date(next.timestamp);
        // Check if next point is roughly next day
        const hoursDiff = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60);
        if (hoursDiff < 8 || hoursDiff > 36)
            continue;
        if (current.sleepQuality !== undefined && current.sleepQuality < 40) {
            poorSleepCount++;
            if (next.stressLevel !== undefined && next.stressLevel > 60) {
                poorSleepHighStressCount++;
            }
        }
    }
    if (poorSleepCount >= 5) {
        const correlation = poorSleepHighStressCount / poorSleepCount;
        if (correlation > 0.6) {
            patterns.push({
                id: 'corr_sleep_stress',
                type: 'correlation',
                description: 'Poor sleep nights are followed by higher stress the next day',
                confidence: Math.min(correlation, 0.9),
                metric: 'sleep_stress',
                trigger: 'poor_sleep',
                discoveredAt: new Date(),
                occurrences: poorSleepHighStressCount,
            });
        }
    }
    // Steps → sleep quality correlation
    let activeGoodSleepCount = 0;
    let activeCount = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        if (current.steps !== undefined && current.steps > 8000) {
            activeCount++;
            if (next.sleepQuality !== undefined && next.sleepQuality > 70) {
                activeGoodSleepCount++;
            }
        }
    }
    if (activeCount >= 5) {
        const correlation = activeGoodSleepCount / activeCount;
        if (correlation > 0.6) {
            patterns.push({
                id: 'corr_steps_sleep',
                type: 'correlation',
                description: 'Days with 8,000+ steps lead to better sleep quality',
                confidence: Math.min(correlation, 0.9),
                metric: 'steps_sleep',
                trigger: 'high_steps',
                discoveredAt: new Date(),
                occurrences: activeGoodSleepCount,
            });
        }
    }
    return patterns;
}
/**
 * Generate predictions based on discovered patterns
 */
function generatePredictions(patterns) {
    const predictions = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    for (const pattern of patterns) {
        if (pattern.confidence < 0.5)
            continue;
        // Time-of-day predictions
        if (pattern.type === 'time_of_day' && pattern.hourOfDay !== undefined) {
            const hoursUntil = pattern.hourOfDay - currentHour;
            if (hoursUntil > 0 && hoursUntil <= 2) {
                predictions.push({
                    description: `${pattern.description}. Let's prepare with a quick breathing exercise.`,
                    type: 'proactive_wellness',
                    confidence: pattern.confidence,
                    suggestedAction: 'breathing_exercise',
                    expiresAt: new Date(now.getTime() + hoursUntil * 60 * 60 * 1000),
                });
            }
        }
        // Day-of-week predictions
        if (pattern.type === 'day_of_week' && pattern.dayOfWeek === currentDay) {
            if (pattern.metric === 'stress') {
                predictions.push({
                    description: `${pattern.description}. I'm here if you need to talk.`,
                    type: 'proactive_checkin',
                    confidence: pattern.confidence,
                    suggestedAction: 'check_in',
                    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                });
            }
            if (pattern.metric === 'sleep') {
                predictions.push({
                    description: `${pattern.description}. Try winding down earlier tonight.`,
                    type: 'sleep_preparation',
                    confidence: pattern.confidence,
                    suggestedAction: 'sleep_routine',
                    expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000),
                });
            }
        }
    }
    return predictions;
}
/**
 * Main analysis function — run periodically for each user
 */
async function analyzeUserPatterns(userId) {
    const db = (0, firebase_1.getFirestore)();
    // Fetch last 30 days of health data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const healthSnap = await db
        .collection('users').doc(userId)
        .collection('healthData')
        .where('timestamp', '>', thirtyDaysAgo)
        .orderBy('timestamp')
        .get();
    const data = healthSnap.docs.map(doc => ({
        timestamp: doc.data().timestamp.toDate(),
        heartRate: doc.data().heartRate,
        steps: doc.data().steps,
        stressLevel: doc.data().stressLevel,
        sleepQuality: doc.data().sleepQuality,
        mood: doc.data().mood,
    }));
    if (data.length < 7) {
        logger_1.logger.info(`User ${userId}: Not enough data for pattern analysis (${data.length} points)`);
        return { patterns: [], predictions: [] };
    }
    // Run all analyses
    const timePatterns = analyzeTimeOfDayPatterns(data);
    const dayPatterns = analyzeDayOfWeekPatterns(data);
    const correlations = analyzeCorrelations(data);
    const allPatterns = [...timePatterns, ...dayPatterns, ...correlations];
    // Generate predictions
    const predictions = generatePredictions(allPatterns);
    // Store patterns in Firestore
    const batch = db.batch();
    for (const pattern of allPatterns) {
        const ref = db.collection('users').doc(userId).collection('patterns').doc(pattern.id);
        batch.set(ref, pattern, { merge: true });
    }
    // Store predictions
    for (const prediction of predictions) {
        const ref = db.collection('users').doc(userId).collection('predictions').doc();
        batch.set(ref, { ...prediction, createdAt: new Date() });
    }
    await batch.commit();
    logger_1.logger.info(`User ${userId}: Found ${allPatterns.length} patterns, ${predictions.length} predictions`);
    return { patterns: allPatterns, predictions };
}
/**
 * Build the user's Wellness Profile summary
 */
async function getWellnessProfile(userId) {
    const db = (0, firebase_1.getFirestore)();
    // Count total data points
    const countSnap = await db
        .collection('users').doc(userId)
        .collection('healthData')
        .count()
        .get();
    const dataPoints = countSnap.data().count;
    // Determine profile strength
    let profileStrength;
    if (dataPoints < 14)
        profileStrength = 'building';
    else if (dataPoints < 30)
        profileStrength = 'emerging';
    else if (dataPoints < 60)
        profileStrength = 'established';
    else
        profileStrength = 'strong';
    // Fetch patterns
    const patternsSnap = await db
        .collection('users').doc(userId)
        .collection('patterns')
        .where('confidence', '>', 0.5)
        .orderBy('confidence', 'desc')
        .get();
    const patterns = patternsSnap.docs.map(d => d.data());
    // Fetch active predictions
    const predictionsSnap = await db
        .collection('users').doc(userId)
        .collection('predictions')
        .where('expiresAt', '>', new Date())
        .get();
    const predictions = predictionsSnap.docs.map(d => d.data());
    // Generate summary
    let summary = '';
    if (patterns.length === 0) {
        summary = "I'm still learning your patterns. Keep tracking and I'll have insights for you within a week or two!";
    }
    else {
        summary = `I've discovered ${patterns.length} pattern${patterns.length > 1 ? 's' : ''} in your wellness data. `;
        summary += patterns.slice(0, 3).map(p => p.description).join('. ') + '.';
    }
    return { patterns, predictions, summary, dataPoints, profileStrength };
}
// Helpers
function formatHour(hour) {
    if (hour === 0)
        return '12 AM';
    if (hour < 12)
        return `${hour} AM`;
    if (hour === 12)
        return '12 PM';
    return `${hour - 12} PM`;
}
//# sourceMappingURL=patternDetection.js.map