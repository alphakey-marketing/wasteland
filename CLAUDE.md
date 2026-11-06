# 荒原小隊 · 慳 token 規則

- 主線係根目錄嘅 **HTML 2D 遊戲**（`index.html` + `js/`），GitHub Pages 部署。唔做 Android／iOS。
- **Godot（`godot/`）同 `docs/ROADMAP.md` 暫停**：唔好讀、唔好改，除非我叫。
- `index.html` 只有畫面結構同 CSS。邏輯喺 `js/`，按載入次序：core → data → world → sim → render → input → ui → save → main。全部係普通 script 共用全域變數，唔好改用 import。
- 唔好成個檔讀。用 grep 搵關鍵字，再讀嗰幾十行。遊戲規則喺 `js/sim.js`，繪圖喺 `js/render.js`，介面喺 `js/ui.js`。
- 計劃限 20 行，唔好貼程式碼，等我確認先寫。
- 一個 session 一個子階段，一個 branch 一個 PR。做完 commit，建議用戶 /clear。
- 唔好掃 `godot/build/`、`godot/addons/`、`godot/qa/`。
- 測試：用無頭瀏覽器開遊戲行一陣，確認冇 console error；改咗存檔要試存檔再讀檔。
- 輸出用 grep/tail 過濾，唔好成段 log 貼出嚟。
- 瀏覽器效能、觸控、畫面由用戶自己測；Claude 只檢查代碼同自動測試。
- 用戶用廣東話溝通。
