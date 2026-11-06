# 荒原小隊 · 慳 token 規則

- 平台只做 **Web**（Godot Web export，GitHub Actions 部署去 `/play/`）。唔做 Android／iOS。
- `index.html` 有 111KB，**唔好成個讀**。要規則就 grep 關鍵字，再讀嗰幾十行。
- 計劃限 20 行，唔好貼程式碼，等我確認先寫。
- 一個 session 一個子階段，一個 branch 一個 PR。做完 commit，建議用戶 /clear。
- 唔好掃 `godot/build/`、`godot/addons/`、`godot/qa/`。
- 測試：改動期間只跑相關 test 檔；commit 前先跑一次全部 `godot/tests/check.ps1`。
- 輸出用 grep/tail 過濾，唔好成段 log 貼出嚟。
- 瀏覽器效能、觸控、畫面由用戶自己測；Claude 只檢查代碼同自動測試。
- 用戶用廣東話溝通。
