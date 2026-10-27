// ==========================================
// api/sendPush.js — FCM プッシュ通知送信サーバーレスAPI（複数端末トークン＆無効トークン自動検出対応）
// ==========================================
const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
    }),
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { targetToken, targetTokens, title, body, data } = req.body || {};

  const rawTokens = Array.isArray(targetTokens)
    ? [...targetTokens, targetToken]
    : [targetToken];
  const tokens = [...new Set(rawTokens.filter(t => typeof t === 'string' && t.trim().length > 0))];

  if (tokens.length === 0) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  const safeTitle = title || 'WithFit';
  const safeBody = body || '';
  const safeData = {};
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) safeData[k] = String(v);
    });
  }
  safeData.title = safeTitle;
  safeData.body = safeBody;

  try {
    const messaging = getMessaging();
    const invalidTokens = [];
    const results = await Promise.allSettled(
      tokens.map(async (token) => {
        const message = {
          token,
          notification: {
            title: safeTitle,
            body: safeBody,
          },
          data: safeData,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                alert: {
                  title: safeTitle,
                  body: safeBody,
                },
                sound: 'default',
                badge: 1,
              },
            },
          },
          webpush: {
            headers: {
              Urgency: 'high',
            },
            notification: {
              title: safeTitle,
              body: safeBody,
              icon: '/logo192.png',
              badge: '/logo192.png',
            },
            fcmOptions: {
              link: safeData.url || '/',
            },
          },
        };
        try {
          return await messaging.send(message);
        } catch (err) {
          const code = err && err.code ? err.code : '';
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            invalidTokens.push(token);
          }
          throw err;
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.length - successCount;

    return res.status(200).json({
      success: successCount > 0,
      successCount,
      failureCount,
      invalidTokens,
    });
  } catch (error) {
    console.error('Error sending push message:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
