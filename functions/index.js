/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Firebase Admin SDKの初期化
admin.initializeApp();

// push_jobsコレクションに新しいデータが追加されたときに実行される関数
exports.sendPushNotification = functions.firestore
  .document("artifacts/withfit-app/public/data/push_jobs/{jobId}")
  .onCreate(async (snap, context) => {
    const jobData = snap.data();
    const targetToken = jobData.targetToken;
    const title = jobData.title || "WithFit";
    const body = jobData.body || "";

    // トークンがない場合は終了
    if (!targetToken) {
      console.log("通知先のトークンがありません。");
      return null;
    }

    // 送信するメッセージの構成
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: targetToken,
    };

    try {
      // FCMを使用して通知を送信
      const response = await admin.messaging().send(message);
      console.log("通知の送信に成功しました:", response);
      
      // 成功した場合はステータスを完了に更新
      return snap.ref.update({ 
        status: "completed", 
        response: response 
      });
    } catch (error) {
      console.error("通知の送信に失敗しました:", error);
      
      // 失敗した場合はステータスをエラーに更新
      return snap.ref.update({ 
        status: "failed", 
        error: error.message 
      });
    }
  });
const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
