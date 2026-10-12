// Saves form submissions to Firebase Firestore (collection "leads").
// Only activates once config.js has a Firebase apiKey + projectId.
const cfg = (window.SITE_CONFIG || {}).firebase || {};

if (cfg.apiKey && cfg.projectId) {
  const V = '10.12.2';
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const { getFirestore, collection, addDoc, serverTimestamp } =
    await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);

  const db = getFirestore(initializeApp(cfg));

  window.saveLead = async (data) => {
    await addDoc(collection(db, 'leads'), {
      ...data,
      status: 'new',
      createdAt: serverTimestamp(),
    });
  };
}
