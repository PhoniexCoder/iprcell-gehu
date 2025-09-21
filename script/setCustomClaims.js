const admin = require("firebase-admin");

// Path to your service account key JSON file
const serviceAccount = require("../ipr-cell-firebase-adminsdk-fbsvc-6c1fbc3b7b.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Replace with the user's Firebase Auth UID and desired role
const uid = "bYSwhWrI6WRsUpiaohaApvPeyma2";
const role = "patent_attorney";

admin.auth().setCustomUserClaims(uid, { role })
  .then(() => {
    console.log(`Custom claim set for user ${uid}: role=${role}`);
    process.exit(0);
  })
  .catch(error => {
    console.error("Error setting custom claim:", error);
    process.exit(1);
  });