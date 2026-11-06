# 荒原 · 分件角色灰模驗證場

## 假設與範圍

- 獨立美術技術驗證，原本 `index.html` 保持不變；不移植戰鬥、經濟、存檔或醫療數值。
- A 接受換裝／斷左手操作；B 是可直接揹起的測試同伴，略過原型的倒地前置條件。
- 斷左手在這個驗證場代表整條左臂移除，肩部留下封口；義肢替換整條臂。武器固定右手。
- 兩腿在模型上分開，在原型傷勢概念上仍合併為「腳」；這次只實作左臂視覺切換。
- 床上操作是姿勢展示，不會令斷肢再生，也沒有義肢自動修理。
- 目標 60fps，但尚未用中階手機實測，不能視作已達效能驗收。

## 開啟

使用 **Godot 4.7.2 stable**（Standard / GDScript）。本機已找到並驗證 `4.7.2.stable.official.ed1daf0bf`，無需更新或覆蓋舊安裝。

1. Godot Project Manager → Import → 選取 `godot/project.godot`。
2. 按 F6 執行 `scenes/lab.tscn`，或 F5 執行專案。
3. 專案使用 Mobile renderer、1080×1920 直向 viewport；桌面預覽預設 540×960。需要支援 Vulkan 的環境。

已驗證的本機執行檔：`D:/Download/Sengoku/godot/Godot_v4.7.2-stable_win64_console.exe`。

## 操作

| 按鈕 | 行為 |
| --- | --- |
| 換甲 | 布衣 → 皮甲 → 鐵甲循環；輪廓、厚度、顏色不同 |
| 換刀 | 短刀 → 砍刀 → 重斧循環 |
| 斷左手 | 移除原生左臂或已裝義肢，保留肩部封口 |
| 裝義肢 | 斷臂後可用；廢鐵 → 軍用循環 |
| A 揹起 B | B 掛到 A 背部，屈膝及伸手，跟隨 A 的骨架與位移 |
| 放 B 上床 | 只在揹住 B 時可用，轉到床面掛點並平躺 |
| 重置 | 還原人物、裝備、左臂、鏡頭及姿勢 |

場景空白處單指拖動平移，雙指縮放；桌面左鍵拖動、滾輪縮放。鏡頭角度固定，縮放有上下限。按鈕區攔截手勢。按鈕在 360×640 預覽下約 163×48 像素。

A 持續小幅移動，兩人使用共用程序式骨架動作；揹人／睡覺只是更換骨頭姿勢與父節點。所有裝備沿用相同動作，沒有逐款新增動畫。

## 結構與擴充

- `scripts/actor.gd`：共用 `Skeleton3D`，15 根骨頭：hips、chest、head，左右各 upper_arm／forearm／hand／thigh／shin／foot。每骨以 `BoneAttachment3D` 承載剛性幾何體。
- `scripts/equipment.gd`、`equipment/*.tres`：Resource 包含槽位、顯示名稱及零件列表。每件指定骨頭、尺寸、位置、顏色及形狀；組裝器沒有按裝備名稱判斷。新增款式後加入 lab 對應展示清單即可。
- `scripts/visuals.gd`、`materials/`：共享色塊貼圖與按顏色快取材質，分段光照及反向外殼描邊；不依賴後處理螢幕法線貼圖。
- `scripts/camera_rig.gd`：固定斜角正交鏡頭及觸控／滑鼠輸入。
- `scripts/lab.gd`：床、環境、介面、狀態轉換及驗證入口。

素材全部本專案自製：基本幾何體、`paint.svg` 手畫色塊、shader。沒有下載第三方美術素材。中文使用 Godot 系統字體 fallback；不同手機的字形可能不同。

## 驗證與效能數據

在 repo 根目錄執行（`godot` 可換成完整執行檔路徑）：

```powershell
godot --headless --path godot --editor --import --quit
godot --headless --path godot -- --verify
godot --path godot --resolution 1080x1920 -- --capture
godot --path godot --resolution 360x640 -- --capture
# 或匯入及狀態檢查一併執行：
./godot/tests/check.ps1 -Godot 'D:/Download/Sengoku/godot/Godot_v4.7.2-stable_win64_console.exe'
```

`--verify` 檢查掛點有效、雙指縮放與釋放、三輪換裝、斷臂可見性、兩款義肢、揹人／床父節點、重置還原；成功印出 `VERIFY PASS`。Headless 用於程式與狀態驗證，不能驗證 shader 或 GPU 效能。`--capture` 用真正 Mobile renderer 依次截七個狀態至 `qa/`，並列印統計後退出。截圖不納入遊戲資產匯入。

2026-11-05，Windows / Intel Iris Xe / Vulkan 1.3.235 / Godot 4.7.2 Forward Mobile，1080×1920 與 360×640 視窗的代表讀數：

| 狀態 | 模型三角形 | 全畫面 draw calls | rendered primitives |
| --- | ---: | ---: | ---: |
| 布衣＋短刀 | 672 | 93 | 2104 |
| 皮甲＋砍刀＋斷左臂 | 648 | 91 | 2056 |
| 廢鐵義肢 | 720 | 95 | 2200 |
| 鐵甲＋重斧＋軍用義肢 | 744 | 97 | 2248–2250 |
| 同上，揹住 B | 744 | 97 | 2252 |
| 同上，B 瞓床 | 744 | 98 | 2250 |
| 重置 | 672 | 93 | 2106 |

模型數是可見 MeshInstance 的索引三角形總和（包含地面／床），未乘描邊 pass。draw calls／rendered primitives 來自 Godot Performance 全畫面監測，包含描邊、介面及字體；字體 fallback、畫面文字和裁切會影響讀數。啟動時 FPS 及截圖流程不代表穩態效能。

手機驗收方法：使用匹配的 Android export templates 匯出到指定中階手機；記錄型號、OS、解析度，暖機後於每個狀態連續測量至少 60 秒，觀察平均及高百分位幀時間是否穩定在 16.67ms 附近，另測 10 分鐘熱降頻。此 repo 尚未包含簽署金鑰、手機 export preset 或真機效能報告。

## 已知限制

- 已做桌面 Mobile renderer 及 360×640 尺寸視覺檢查；真機觸控、多種瀏海安全區和中階手機 60fps 仍待驗證。
- 屬剛性分件灰模，手繪色塊偏粗獷；不包含蒙皮變形、IK、布料、物理搬運或碰撞迴避。
- 揹人和床上姿勢為固定尺寸調校；新增非標準體型／更厚裝備需重新檢查掛點與穿模。床上為瞬間轉換，沒有走到床邊動畫。
- 重斧沿用單手掛點以驗證換件，未製作雙手握持 IK。A 的移動是展示用小幅循環，不是導航。
- 描邊有額外 pass；場景沒有動態陰影。若真機 GPU 超時，優先量測描邊成本及降低 3D 渲染比例，再考慮合併不需獨立更換的零件。
