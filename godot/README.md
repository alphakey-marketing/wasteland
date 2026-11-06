# 荒原小隊 · 階段 1 核心操作

F5 開啟 `scenes/battle.tscn`：4 名隊友、一組流寇、近戰／弓箭、導航避障、五部位傷勢、戰術暫停及存讀檔。階段 0 驗證場保留於 `scenes/lab.tscn`，用 F6 開啟。

## 手機操作

- 點隊友或底部頭像選取；雙擊頭像（330ms）跟隨，拖鏡解除。
- 單指拖動移鏡、雙指縮放。長按 320ms 再拖框選；亦可用右下「框選」或「全選」。
- 點地面按陣形移動；點敵人攻擊。暫停時追加指令並顯示虛線，最多 6 個，超額移除最舊；進行中指令取代原佇列。
- 右下暫停／繼續、¼ 慢鏡；首次遇敵自動暫停，可在選單關閉。
- 頭像血條及五個傷勢點依序為頭、身、左手、右手、腳；單選時上方顯示各部位數值。
- 選單可存檔、讀檔、重新開始及啟動 10 對 10 測試。重開需再按一次確認。
- 每 30 秒及失去焦點時自動存檔；失去焦點亦會暫停。存檔在 `user://battle_v1.json`，Web 使用瀏覽器儲存，同源載入才可讀回。
- 桌面可用滑鼠拖動、滾輪縮放、Space 暫停、A 全選。

## Android 真機測試

使用 Godot **4.7.2 Standard** 及同版本 export templates。本機執行檔為 `D:/Download/Sengoku/godot/Godot_v4.7.2-stable_win64_console.exe`。

1. 安裝 Android SDK、platform-tools、build-tools 36.0.0 及 JDK；Godot Editor Settings → Export → Android 填入 SDK／Java 路徑。本機已配置 `D:/Android/Sdk`、`D:/Program Files/Eclipse Adoptium/jdk-21`。
2. 安裝 4.7.2 export templates。專案已設定 ARM64 Android debug preset、直向 1080×1920、Mobile renderer、ETC2/ASTC 貼圖匯入。
3. 建立 `godot/build/android/`，在 repo 根目錄執行：

   ```powershell
   & 'D:/Download/Sengoku/godot/Godot_v4.7.2-stable_win64_console.exe' --headless --path godot --export-debug Android
   ```

4. 手機開啟開發者選項／USB debugging，接線並接受電腦授權：

   ```powershell
   & 'D:/Android/Sdk/platform-tools/adb.exe' devices
   & 'D:/Android/Sdk/platform-tools/adb.exe' install -r godot/build/android/wasteland-debug.apk
   & 'D:/Android/Sdk/platform-tools/adb.exe' shell monkey -p org.wasteland.squad 1
   ```

5. Android 需支援 Vulkan。簽署使用本機 debug keystore；金鑰、憑證、SDK 路徑及 build 輸出不入 Git。

## 手機網頁測試

```powershell
New-Item -ItemType Directory -Force godot/build/web
& 'D:/Download/Sengoku/godot/Godot_v4.7.2-stable_win64_console.exe' --headless --path godot --export-debug Web
python -m http.server 8000 --bind 0.0.0.0 --directory godot/build/web
```

手機與電腦同 Wi-Fi，開 `http://<電腦區域網 IP>:8000`。只在受信任區域網開放該 port，測完 Ctrl+C 關閉。Web 使用 Compatibility renderer、單執行緒及 WebGL 2；無需 COOP/COEP。正式託管用 HTTPS。根目錄 GitHub Pages `index.html` 原型不受影響。

UI 自帶 Noto Sans TC 字型子集，避免 Web 中文方框；其 OFL 授權見 `fonts/`。新增中文文案需更新字型子集。

## 驗收清單

- 直向 360×640 至 1080×1920，瀏海及底部系統手勢區不遮按鈕。
- 長按框選不移鏡，拖鏡不落指令，雙指縮放後放手不誤點；頭像橫滑、雙擊跟隨正常。
- 暫停排多個移動／攻擊指令，繼續後依序執行；¼ 速及遇敵暫停正常。
- 繞牆、交錯行走、不可達目標有提示；箭矢不穿牆。
- 頭／身耗盡倒地，手傷減傷、腳傷減速；打完有勝敗提示。
- 戰鬥中存檔、重開 app 再讀檔：位置、傷勢、目標、排隊指令、暫停、鏡頭仍在。
- 10 對 10 場用全選後點敵人開戰。暖機後觀察 60 秒及持續 10 分鐘，記錄型號、OS、畫質、平均 FPS、p95 幀時間和熱降頻。目標 60fps／16.67ms。可用 Godot remote profiler 量測；headless 不代表 GPU 效能。

目前已實際匯出 Android debug APK 及 Web。真機觸控、安全區與中階手機 60fps **待使用者驗收**，通過後才合併 PR。

## 架構及自動測試

- `scripts/sim/`：不依賴 Node 的固定時間步規則、指令、傷勢、可重現隨機數。
- `scripts/data/`、`data/`：角色、武器、盔甲及遭遇 Resource。數值依據根目錄原型。
- `scripts/runtime/navigation_bridge.gd`：NavigationRegion3D／NavigationAgent3D、角色避讓、牆壁碰撞及視線查詢。等非同步導航真正就緒才開始模擬。
- `scripts/runtime/battle_controller.gd`：輸入、模擬、導航與畫面接駁。`save_game.gd` 驗證存檔後重建，導航路徑重新計算。
- `scripts/input/`：互斥手勢狀態機；`scripts/view/`：HUD、分件角色及指令虛線。
- 保留階段 0 骨架、裝備掛點及材料，加入基本待機／攻擊／射箭／倒地姿勢。

```powershell
./godot/tests/check.ps1 -Godot 'D:/Download/Sengoku/godot/Godot_v4.7.2-stable_win64_console.exe'
```

依次跑 headless editor import、全部 GUT 測試、階段 0 `--verify`、新戰鬥場 `--smoke`；退出碼及錯誤日誌任何失敗都令檢查失敗。GUT 9.6.1 已固定於 `addons/gut`，匯出時排除。測試包括完整戰鬥、導航繞牆、多人避讓、遮擋、觸控事件隔離、排隊、傷勢、存讀檔及隨機續算。

階段 1 簡化範圍：固定初始技能，不練級；無流血、斷肢、醫療、經濟。普通頭像列最多 8 人；10 對 10 測試額外友軍可全選操作。地圖使用固定灰模障礙，未加入動態建築或正式美術。

---

# 階段 0：分件角色灰模驗證場（歷史說明）

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
