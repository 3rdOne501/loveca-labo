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
 *         match /versusMatches/{roomId} {
 *           allow read: if request.auth != null
 *             && (resource.data.hostUid == request.auth.uid
 *               || resource.data.guestUid == request.auth.uid);
 *           allow create: if request.auth != null
 *             && request.resource.data.hostUid == request.auth.uid;
 *           allow update: if request.auth != null
 *             && (resource.data.hostUid == request.auth.uid
 *               || resource.data.guestUid == request.auth.uid);
 *           allow delete: if request.auth != null
 *             && resource.data.hostUid == request.auth.uid;
 *         }
 *       }
 *     }
 *
 *   5. 「プロジェクトの設定」→「全般」→「マイアプリ」で Web アプリを追加し、表示された
 *      `firebaseConfig` をこのファイルの `firebaseConfig` にコピー
 *   6. Authentication → Settings → Authorized domains に次を追加（無い場合）:
 *      `localhost`（※ 127.0.0.1 ではなく localhost で開く）、`3rdone501.github.io`（GitHub Pages）
 *   7. このファイルを `js/firebaseConfig.js` の名前で保存して GitHub にプッシュ
 */
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
  storageBucket: "",
  messagingSenderId: "",
};
