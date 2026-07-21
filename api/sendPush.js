const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

// Firebase Admin SDKの初期化（重複初期化を防ぐ）
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercelの環境変数で改行が崩れるのを防ぐ処理
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

  const { targetToken, title, body } = req.body;

  if (!targetToken) {
    return res.status(400).json({ message: 'Token is required' });
  }

  try {
    const message = {
      notification: { title, body },
      token: targetToken,
    };
    
    // 通知を送信
    const response = await getMessaging().send(message);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};