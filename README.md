# ⚡️ PokeParty 2026 - 春酒互動平台

**PokeParty 2026** 是一個透過 Google AI Studio 部署在 GCP (Google Cloud Platform) 上的互動小網頁。
結合了寶可夢 (Pokémon) 與賽博龐克 (Cyberpunk) 風格，為公司春酒活動設計，提供員工即時互動、照片分享與活動資訊查詢功能。
主要特色包含暗黑模式 UI、霓虹光效視覺體驗，以及針對行動裝置最佳化的操作介面。

## 功能特色

### 1. 身份驗證 (Authentication)
* **簡易員編登入**：支援輸入 5 碼員編快速登入。
* **權限分級**：區分一般使用者與管理員 (Admin)。管理員擁有刪除照片、管理座位圖與設定其他管理員的權限。
* **動態管理員機制**：
    * **屬性控制**：使用者資料結構包含 `isAdmin` 屬性，用以識別管理員身份。
    * **線上授權**：現有管理員可透過介面輸入員編，即時新增或移除其他管理員 (更新 Firestore `isAdmin` 欄位)，無需重啟伺服器。
    * **超級管理員**：系統內建 Hardcoded 超級管理員名單，確保系統初始化時至少有一位管理者。
* **個人化設定**：使用者可修改顯示暱稱。

### 2. 活動相簿與上傳優化 (Gallery & Upload)
* **前端壓縮策略 (Frontend Compression)**：
    * **突破限制**：因應後端儲存設有 **單一檔案 1MB 上限**，前端實作 Canvas 壓縮演算法。
    * **自動處理**：上傳前自動將大圖壓縮至 1920px 以下或品質 0.8，節省流量與儲存空間。
* **無限捲動**：支援大量照片分頁讀取 (Infinite Scroll)，提升瀏覽效能。

### 3. 主題穿搭評選 (Dress Code Competition)
* **作品展示**：瀑布流式呈現參賽照片。
* **即時投票**：使用 Firestore Transaction 處理投票邏輯，確保在高併發下票數統計準確 (一人一票、即時換票)。
* **圖片瀏覽**：整合 `photoswipe` 提供類似原生 App 的滿版縮放瀏覽體驗。

### 4. 活動桌次圖查詢 (Seating Chart)
* **高解析縮放**：支援雙指縮放查看座位細節。
* **動態更新**：管理員可直接從後台更新座位圖，前端無需重新部署。

## 技術堆疊

* **Frontend Framework**: React 19 + TypeScript
* **Build Tool**: Vite
* **Styling**: Tailwind CSS (Custom Theme: `poke-cyan`, `poke-yellow`)
* **Backend / Database**: Firebase (Firestore, Storage)
* **Deployment**: GCP (Google Cloud Platform) via Google AI Studio
* **Icons**: Lucide React
* **Libraries**:
    * `react-router-dom`: 路由管理
    * `react-photoswipe-gallery`: 圖片燈箱效果
    * `firebase`: 後端服務 SDK

## 安裝與執行

### 前置需求
* Node.js (建議 v18 以上)
* Firebase 專案 (需開啟 Firestore 與 Storage)

### 1. 安裝依賴
```bash
npm install
```

### 2. 環境變數設定
請在專案根目錄建立 .env 檔案，並填入您的 Firebase 設定：
FIREBASE_API_KEY=your_api_key_here
注意：請參考 services/firebase.ts 確認設定檔讀取方式。

### 3. 啟動開發伺服器
```bash
npm run dev
```

### 4. 建置生產版本
```bash
npm run build
```

## 專案結構
```bash
src/
├── components/      # 共用元件 (Layout, Button, PhotoCard...)
├── context/         # 全域狀態 (AuthContext)
├── pages/           # 頁面元件 (Home, DressCode, Gallery, Seating)
├── services/        # 商業邏輯與 API (firebase, userService, photoService...)
├── types.ts         # TypeScript 型別定義
├── App.tsx          # 應用程式入口與路由定義
└── index.css        # 全域樣式與 Tailwind 設定
```


<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1UKB92mWTC8ZRF-5mfKSUPELzBIauqOBK

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
