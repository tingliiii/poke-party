# --- 第一階段：建置環境 (Builder) ---
    FROM node:22-alpine AS builder

    # 設定工作目錄
    WORKDIR /app
    
    # 複製 package.json 檔
    COPY package.json ./
    
    # 安裝依賴
    RUN npm install
    
    # 複製所有原始碼
    COPY . .
    
    # 傳入環境變數 (Build Time)
    RUN npm run build
    
    # --- 第二階段：執行環境 (Runner) ---
    FROM node:22-alpine AS runner
    
    WORKDIR /app
    
    # 安裝輕量級靜態網頁伺服器
    RUN npm install -g serve
    
    # 從第一階段複製 build 好的 dist 資料夾過來
    COPY --from=builder /app/dist ./dist
    
    # 告訴 Docker 我們預計會用到的 Port (Cloud Run 預設 8080)
    EXPOSE 8080
    
    # ⚠️ Cloud Run 規定：必須監聽 $PORT 環境變數
    # -s dist: 指定 serve 服務 dist 資料夾
    # -l $PORT: 指定監聽 Cloud Run 注入的 PORT (通常是 8080)
    CMD ["sh", "-c", "serve -s dist -l $PORT"]
