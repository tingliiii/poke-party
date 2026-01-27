
/**
 * 圖片處理服務 (Image Processing)
 * 目的：在圖片上傳到雲端之前先在手機瀏覽器內進行壓縮。
 * 優點：減少上傳流量、縮短等待時間、節省伺服器空間。
 */

export const compressImage = async (file: File, maxSizeMB: number = 1): Promise<File> => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  // 如果檔案本身就小於 1MB，直接返回原檔，避免不必要的損耗
  if (file.size <= maxSizeBytes && /image\/(jpeg|jpg|png)/i.test(file.type)) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      // 設定最大長邊為 1920px (高畫質標準)
      // 若原圖更大，則依比例縮小以降低容量
      const MAX_DIMENSION = 1920; 
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // 使用 Canvas 進行重繪
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Canvas context failed"));

      ctx.drawImage(img, 0, 0, width, height);

      // 轉換為 JPEG 格式並設定品質為 0.8，這通常能減少 70% 以上的容量且肉眼難辨差異
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Blob conversion failed"));
        
        const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        resolve(new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() }));
      }, 'image/jpeg', 0.8);
    };
    
    reader.readAsDataURL(file);
  });
};
