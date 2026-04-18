# RELEASE NOTES - SoftBank Fold7 在庫監視

## v1.0.1 (2026-04-18)
### 修正
- `check_stock.js`: ntfy通知のpriorityを文字列から数値に修正（400エラー解消）

## v1.0.0 (2026-04-17)
### 初期リリース
- SoftBank Galaxy Z Fold7 在庫監視（GitHub Actions）
- ntfy.sh プッシュ通知
- 5分ごと在庫チェック（stock-monitor.yml）
- 30分ごと定期報告（hourly-report.yml）
- 在庫判定ロジック厳格化（誤検知防止）
- NTFY_TOPICをhardcode化
