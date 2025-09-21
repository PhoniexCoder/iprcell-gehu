const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load service account from env (path or base64 JSON)
const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const SA_BASE64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;

let serviceAccount;
if (SA_BASE64) {
  serviceAccount = JSON.parse(Buffer.from(SA_BASE64, "base64").toString("utf8"));
} else if (SA_PATH) {
  serviceAccount = JSON.parse(fs.readFileSync(path.resolve(SA_PATH), "utf8"));
} else {
  console.error(
    "Missing service account. Set GOOGLE_APPLICATION_CREDENTIALS to a JSON path or GOOGLE_APPLICATION_CREDENTIALS_BASE64 to the base64 of the JSON.",
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function upsertUser({ email, password, displayName, role, department = "", employeeId = "" }) {
  if (!email || !password || !displayName || !role) {
    throw new Error("Missing required fields for user seed (email, password, displayName, role)");
  }

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    if (password) {
      await admin.auth().updateUser(userRecord.uid, { password, displayName });
    } else if (displayName && userRecord.displayName !== displayName) {
      await admin.auth().updateUser(userRecord.uid, { displayName });
    }
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      userRecord = await admin.auth().createUser({ email, password, displayName });
    } else {
      throw e;
    }
  }

  const uid = userRecord.uid;

  const userDoc = {
    uid,
    email,
    displayName,
    role, // "admin" | "patent_attorney" | "user"
    department,
    employeeId,
    isApproved: true, // open registration model
    createdAt: new Date(),
  };

  await db.collection("users").doc(uid).set(userDoc, { merge: true });
  return uid;
}

(async () => {
  try {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    const ADMIN_NAME = process.env.ADMIN_NAME || "Administrator";
    const ADMIN_DEPT = process.env.ADMIN_DEPT || "Administration";
    const ADMIN_EMP_ID = process.env.ADMIN_EMP_ID || "ADMIN-001";

    const PA_EMAIL = process.env.PA_EMAIL;
    const PA_PASSWORD = process.env.PA_PASSWORD;
    const PA_NAME = process.env.PA_NAME || "Patent Attorney";
    const PA_DEPT = process.env.PA_DEPT || "Legal";
    const PA_EMP_ID = process.env.PA_EMP_ID || "PA-001";

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !PA_EMAIL || !PA_PASSWORD) {
      console.error("Missing required env vars. Set ADMIN_EMAIL/ADMIN_PASSWORD and PA_EMAIL/PA_PASSWORD.");
      process.exit(1);
    }

    const adminUid = await upsertUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_NAME,
      role: "admin",
      department: ADMIN_DEPT,
      employeeId: ADMIN_EMP_ID,
    });

    const paUid = await upsertUser({
      email: PA_EMAIL,
      password: PA_PASSWORD,
      displayName: PA_NAME,
      role: "patent_attorney",
      department: PA_DEPT,
      employeeId: PA_EMP_ID,
    });

    console.log("Seed complete:", { adminUid, paUid });
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
})();
