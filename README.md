# KeyVault (Grit-Powered Software & License Repository)

一個基於 [Grit Framework](https://gritframework.dev/) 開發的高效能企業內部軟件帳戶與授權序號管理系統。結合 Go 的極致效能與現代化 React Admin 介面，提供安全、直觀的資產控管體驗。

---

## 🚀 快速開始 (Quick Start)

### 1. 前置需求
* [Go](https://golang.org/) (1.22+)
* Node.js & Bun / npm
* Docker & Docker Compose (用於 PostgreSQL、Redis 等基礎設施)

### 2. 初始化專案
使用 Grit CLI 建立專案（以 Triple 或 Single 模式為例）：
```bash
grit new keyvault --triple
cd keyvault

```

### 3. 啟動基礎設施

透過 Docker Compose 啟動 PostgreSQL 與 Redis：

```bash
docker compose up -d

```

### 4. 執行資料庫遷移與啟動開發伺服器

```bash
go run main.go dev

```

系統將同時啟動 Go API 伺服器與前端開發環境。

---

## 🛠️ 資料模型與自動生成 (Resource Generation)

Grit 支援一鍵生成完整的前後端 CRUD 資源。我們為本專案規劃了以下核心資源：

### 1. Software (軟件清單)

記錄軟件基本資料。

```bash
grit generate resource Software --fields "name:string,vendor:string,category:string,official_url:string"

```

### 2. SoftwareAccount (帳戶密碼)

儲存登入憑證（支援加密欄位）。

```bash
grit generate resource SoftwareAccount --fields "software_id:uint,email:string,username:string,encrypted_password:text,mfa_notes:text,department:string"

```

### 3. LicenseKey (序號與授權)

追蹤授權類型、席位與到期日。

```bash
grit generate resource LicenseKey --fields "software_id:uint,license_key:text,license_type:string,total_seats:int,used_seats:int,purchase_date:date,expiry_date:date,cost:float,assigned_to:string"

```

---

## 🌟 核心特色配置

* **🔐 密碼與序號加密**：利用 Go 後端中間件在資料寫入資料庫前進行 AES-256 加密，保障資安。
* **📊 儀表板與 GORM Studio**：可直接透過內建的 `/studio` 介面安全地瀏覽與維護底層資料庫。
* **⏰ 到期提醒背景服務**：利用 Grit 內建的 `asynq` 背景工作佇列，設定每日定時掃描即將到期的 License 並發送通知。
* **📝 審計日誌 (Audit Log)**：追蹤所有檢視敏感密碼與序號的操作行為。

---

## 📦 打包與部署 (Deployment)

Grit 支援將應用打包為單一 Go Binary，部屬極其簡單：

```bash
# 建置前端與後端
grit build

# 執行產生的單一執行檔
./bin/keyvault

```

您可以輕鬆將其放置於公司內部伺服器或私有雲 ($5 VPS) 上運行，擁有 100% 的數據主權。
