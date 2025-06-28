const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already done)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // or use service account key
    // credential: admin.credential.cert(serviceAccount),
  });
}

// Function to get total user count
async function getTotalUserCount() {
  try {
    let userCount = 0;
    let nextPageToken;
    
    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      userCount += listUsersResult.users.length;
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    return userCount;
  } catch (error) {
    console.error('Error getting user count:', error);
    throw error;
  }
}

// Express route handler
app.get('/api/admin/user-count', async (req, res) => {
  try {
    const count = await getTotalUserCount();
    res.json({ totalUsers: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user count' });
  }
});

module.exports = { getTotalUserCount }; 