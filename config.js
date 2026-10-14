// ===== NAVIX site settings — edit these values =====
window.SITE_CONFIG = {
  // WhatsApp number, international format, digits only (216 = Tunisia)
  whatsapp: "21652488485",
  instagram: "https://instagram.com/",

  // Hero video under "Produit عليك / Résultats علينا" (16:9). Videos live in the public Vercel Blob store navix-blob.
  // heroVideo = desktop file, heroVideoMobile = lighter file for phones (optional).
  // Set heroVideo to "" to show the empty logo frame instead.
  heroVideo: "https://hmyy2d5h6m5kmdgj.public.blob.vercel-storage.com/navix-edit-v2-720.mp4",
  heroVideoMobile: "https://hmyy2d5h6m5kmdgj.public.blob.vercel-storage.com/navix-edit-v2-720.mp4",
  heroPoster: "assets/vd/navix-edit-v2.jpg",

  // Firebase (Firestore) — paste your web app config from
  // Firebase console > Project settings > Your apps > Web app.
  // While apiKey is empty, the form falls back to opening WhatsApp.
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  }
};
