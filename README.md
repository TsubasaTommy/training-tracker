# トレーニング記録アプリ

ローカルで動くWebアプリ形式のトレーニング記録ツール。
ブラウザだけで完結 / IndexedDB保存 / サーバー不要。

## スタック
- Svelte 5 + TypeScript + Vite
- Tailwind CSS v4
- IndexedDB (Dexie)
- svelte-spa-router

## 起動手順

WSL (Ubuntu) にNode.js 22が入っている前提。

```bash
cd /mnt/e/Programs/トレーニング記録アプリ
npm install
npm run dev
```

表示された `http://localhost:5173` をブラウザで開く。

## 機能
- 記録: 日付選択 → 種目追加 → 重量/回数/セット数を入力
- 種目マスタ: 部位タグ付き・自重種目対応・アーカイブ機能
- ダッシュボード: 期間選択 (直近7日/30日/90日/今年/全期間/カスタム)
  - 総セット数・総ボリューム・実施日数・最頻種目
  - 総ボリューム推移 (折れ線)
  - 推定1RM推移 (Epley式、種目選択)
  - 曜日別トレーニング日数
  - 種目別実施セット数 TOP10
  - 種目別 最大重量・最大レップ・推定1RM・総ボリューム
- 履歴: 過去の日付リストから記録を閲覧

## データ保存場所
ブラウザのIndexedDB (`training-tracker` データベース)。
ブラウザのキャッシュを消すとデータも消えるので注意。
Chromeなら: F12 → Application → IndexedDB → training-tracker で確認可能。

## ディレクトリ構成
```
src/
├── App.svelte               # ルーター + サイドナビ
├── main.ts
├── app.css                  # Tailwind + 共通クラス
├── lib/
│   ├── types.ts
│   ├── db/
│   │   ├── client.ts        # Dexie DB定義 + シード
│   │   ├── exercises.ts     # 種目CRUD
│   │   └── sets.ts          # セットCRUD + 期間検索
│   ├── calc/
│   │   ├── oneRm.ts         # Epley式
│   │   └── aggregate.ts     # ボリューム/頻度/ランキング等
│   ├── stores/
│   │   └── exercises.ts
│   └── components/
│       ├── StatCard.svelte
│       ├── DateRangePicker.svelte
│       ├── ExerciseSelectModal.svelte
│       └── charts/
│           ├── LineChart.svelte
│           └── BarChart.svelte
└── routes/
    ├── Record.svelte        # 日ごと記録
    ├── Dashboard.svelte     # ダッシュボード
    ├── Exercises.svelte     # 種目マスタ管理
    └── History.svelte       # 履歴閲覧
```

## 将来の拡張候補
- データのJSONエクスポート/インポート (バックアップ用)
- 体重記録 (自重種目のボリューム算出用)
- PR通知
- トレーニングテンプレート
- 休息タイマー
