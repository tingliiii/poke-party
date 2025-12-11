
/**
 * 圖片處理服務
 * 負責前端圖片壓縮與格式轉換
 */

export const compressImage = async (file: File, maxSizeMB: number = 1): Promise<File> => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  console.log(`[ImageService] 開始處理: ${file.name} (${(file.size/1024).toFixed(1)} KB)`);

  // 1. 如果檔案本來就很小且格式正確，直接回傳
  if (file.size <= maxSizeBytes && /image\/(jpeg|jpg|png)/i.test(file.type)) {
    console.log("[ImageService] 檔案已符合要求，略過壓縮");
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("讀取圖片檔案失敗"));

    img.onload = () => {
      // 2. 計算目標尺寸 (最大邊長 1920px，兼顧畫質與大小)
      const MAX_DIMENSION = 1920; 
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // 3. 繪製到 Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error("瀏覽器不支援 Canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // 4. 輸出壓縮 (嘗試 0.8 品質)
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("圖片轉檔失敗"));
          return;
        }

        console.log(`[ImageService] 壓縮後大小: ${(blob.size/1024).toFixed(1)} KB`);
        
        // 轉回 File 物件
        const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        const compressedFile = new File([blob], newName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        resolve(compressedFile);
      }, 'image/jpeg', 0.8);
    };
    
    reader.readAsDataURL(file);
  });
};
