/**
 * Firebase Web アプリ設定（loveca-labo プロジェクト）。
 *
 * Web 用 `apiKey` は公開して使う前提の識別子で、データの保護は Firestore セキュリティ
 * ルール（`users/{uid}` 配下を本人のみ読み書き）で担保している。GitHub に push して問題なし。
 */
export const firebaseConfig = {
  apiKey: "AIzaSyA3Hvs131VBdhZ05fJe8yzAS1M-KMUa95c",
  authDomain: "loveca-labo.firebaseapp.com",
  projectId: "loveca-labo",
  storageBucket: "loveca-labo.firebasestorage.app",
  messagingSenderId: "298830141228",
  appId: "1:298830141228:web:c4a342bec466f361017e89",
  measurementId: "G-4WFPM24NLN",
};
