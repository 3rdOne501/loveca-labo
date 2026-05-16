/**
 * Google ログインで登録デッキを別端末と同期するための Firebase 設定。
 *
 * このファイルを `firebaseConfig.js` という名前でコピーし、Firebase コンソールで作成した
 * プロジェクトの設定値を貼り付けてください。ファイルが存在しないとき、または `apiKey` /
 * `authDomain` / `projectId` のいずれかが空のときは Google ログインボタンは表示されません
 * （ローカル動作のまま）。
 *
 * 公開済みの値（apiKey 等）はクライアントから常に見える性質のものなので、Firestore
 * セキュリティルールで `request.auth.uid == userId` のときだけ書き込みを許可する設定を
 * 必ず行ってください。
 *
 * 必要な手順:
 *   1. https://console.firebase.google.com/ で新規プロジェクトを作成
 *   2. 「Authentication」→「Sign-in method」で Google を有効化
 *   3. 「Firestore Database」を作成（本番モードでOK）
 *   4. ルールを以下のようにし、`users/{uid}/state/main` を本人だけが読み書きできるようにする
 *
 *     rules_version = '2';
 *     service cloud.firestore {
 *       match /databases/{database}/documents {
 *         match /users/{userId}/state/{docId} {
 *           allow read, write: if request.auth != null && request.auth.uid == userId;
 *         }
 *       }
 *     }
 *
 *   5. 「プロジェクトの設定」→「全般」→「マイアプリ」で Web アプリを追加し、表示された
 *      `firebaseConfig` をこのファイルの `firebaseConfig` にコピー
 *   6. このファイルを `js/firebaseConfig.js` の名前で保存して GitHub にプッシュ
 */
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
  storageBucket: "",
  messagingSenderId: "",
};
