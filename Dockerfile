# ------------------------------
# 1. Builder 階段
# ------------------------------
FROM node:22-alpine AS builder

# 設定工作目錄
WORKDIR /app
    
# 複製 package.json 檔
COPY package.json package-lock.json* ./
    
# 安裝依賴
RUN npm install
    
# 複製所有原始碼
COPY . .
    
# 宣告接收建置參數 (Build Args)
ARG VITE_FIREBASE_API_KEY
ARG VITE_RECAPTCHA_SITE_KEY

# 將參數轉為環境變數，讓 Vite 在 build 時能讀取到
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_RECAPTCHA_SITE_KEY=$VITE_RECAPTCHA_SITE_KEY

RUN npm run build
    
# ------------------------------
# 2. Runner 階段
# ------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
    
# 安裝輕量級靜態網頁伺服器
RUN npm install -g serve
    
# 複製 build 好的 dist 資料夾
COPY --from=builder /app/dist ./dist
    
# 告訴 Docker 預計會用到的 Port (Cloud Run 預設 8080)
EXPOSE 8080
    
# 啟動伺服器
# -s dist: 指定 serve 服務 dist 資料夾
# -l $PORT: 指定監聽 Cloud Run 注入的 PORT (通常是 8080)
CMD ["sh", "-c", "serve -s dist -l $PORT"]