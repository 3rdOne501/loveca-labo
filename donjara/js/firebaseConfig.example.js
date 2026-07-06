/**
 * ドンジャラ専用 Firebase 設定（テンプレート）。
 *
 * loveca-labo とは別の Firebase プロジェクトを新規作成し、
 * その Web アプリ設定をコピーして `firebaseConfig.js` として保存してください。
 *
 * 手順:
 *  1. https://console.firebase.google.com/ で新しいプロジェクトを作成
 *  2. 「ウェブアプリを追加」→ 表示される firebaseConfig をコピー
 *  3. 本ファイルを `firebaseConfig.js` にコピーし、下記の値を貼り替え
 *  4. Authentication → Sign-in method → 「匿名」を有効化
 *  5. Firestore Database を作成し、donjara/firestore.rules を貼り付けて公開
 *
 * ※ Web の apiKey は公開前提の識別子で、保護は Firestore ルールで担保します。
 */
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
