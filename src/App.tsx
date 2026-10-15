import { useState, useRef, useEffect } from 'react';
import { 
  Upload, Image as ImageIcon, ArrowRight, Download, Sparkles, 
  Trash2, Settings, Check, BookOpen, AlertCircle, RefreshCw, 
  Info, TrendingDown, HelpCircle, FileCheck, ChevronRight, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageItem {
  id: string;
  name: string;
  file: File;
  originalSize: number;
  originalUrl: string;
  originalType: string;
  convertedUrl: string | null;
  convertedSize: number | null;
  status: 'pending' | 'converting' | 'success' | 'failed';
  error?: string;
  quality: number;
}

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [globalQuality, setGlobalQuality] = useState<number>(75); // Perfect sweatspot for SEO/WebP
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showDocModal, setShowDocModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File size formatter Helper
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  // Add selected files to state queue
  const addFiles = (fileList: FileList) => {
    const newItems: ImageItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Only image files
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const id = Math.random().toString(36).substr(2, 9);
      const originalUrl = URL.createObjectURL(file);

      newItems.push({
        id,
        name: file.name,
        file,
        originalSize: file.size,
        originalUrl,
        originalType: file.type,
        convertedUrl: null,
        convertedSize: null,
        status: 'pending',
        quality: globalQuality,
      });
    }

    setImages((prev) => [...prev, ...newItems]);
  };

  // Trigger conversion for a specific image
  const convertSingleImage = async (item: ImageItem, customQuality?: number) => {
    const qualityToUse = customQuality !== undefined ? customQuality : item.quality;

    // Update status to converting
    setImages((prev) =>
      prev.map((img) =>
        img.id === item.id 
          ? { ...img, status: 'converting', quality: qualityToUse } 
          : img
      )
    );

    try {
      const result = await processToWebP(item.file, qualityToUse / 100);
      setImages((prev) =>
        prev.map((img) =>
          img.id === item.id
            ? {
                ...img,
                convertedUrl: result.url,
                convertedSize: result.size,
                status: 'success',
              }
            : img
        )
      );
    } catch (err: any) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === item.id
            ? {
                ...img,
                status: 'failed',
                error: err.message || 'Gagal mengonversi',
              }
            : img
        )
      );
    }
  };

  // Real client-side canvas-based WebP converter core logic
  const processToWebP = (
    file: File,
    quality: number
  ): Promise<{ url: string; size: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Tidak dapat inisialisasi context 2D'));
            return;
          }

          // Draw original image onto canvas
          ctx.drawImage(img, 0, 0);

          // Export canvas to WebP Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Gagal membuat Blob WebP'));
                return;
              }
              const webpUrl = URL.createObjectURL(blob);
              resolve({
                url: webpUrl,
                size: blob.size,
              });
            },
            'image/webp',
            quality
          );
        };
        img.onerror = () => reject(new Error('File rusak atau format tidak didukung'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Gagal membaca gambar'));
      reader.readAsDataURL(file);
    });
  };

  // Convert all pending images in the queue
  const convertAllPending = async () => {
    const pendingImages = images.filter((img) => img.status === 'pending' || img.status === 'failed');
    for (const item of pendingImages) {
      await convertSingleImage(item, globalQuality);
    }
  };

  // Change individual quality and re-convert
  const handleIndividualQualityChange = (id: string, newQuality: number) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, quality: newQuality, status: 'pending' } : img
      )
    );
  };

  // Delete from queue
  const deleteImage = (id: string) => {
    setImages((prev) => {
      const targeted = prev.find((img) => img.id === id);
      if (targeted) {
        if (targeted.originalUrl) URL.revokeObjectURL(targeted.originalUrl);
        if (targeted.convertedUrl) URL.revokeObjectURL(targeted.convertedUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  // Clean whole queue
  const clearQueue = () => {
    images.forEach((img) => {
      if (img.originalUrl) URL.revokeObjectURL(img.originalUrl);
      if (img.convertedUrl) URL.revokeObjectURL(img.convertedUrl);
    });
    setImages([]);
  };

  // Single file download trigger
  const downloadSingle = (item: ImageItem) => {
    if (!item.convertedUrl) return;
    const link = document.createElement('a');
    const originalBaseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    link.href = item.convertedUrl;
    link.download = `${originalBaseName}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Concurrent bulk download with a slight delays to bypass browser block popup
  const downloadAllSuccess = () => {
    const successItems = images.filter((img) => img.status === 'success');
    successItems.forEach((item, index) => {
      setTimeout(() => {
        downloadSingle(item);
      }, index * 200);
    });
  };

  // Automatically process files as soon as they are added (helpful UX step)
  useEffect(() => {
    const pending = images.filter((img) => img.status === 'pending');
    if (pending.length > 0) {
      pending.forEach((img) => {
        convertSingleImage(img, globalQuality);
      });
    }
  }, [images.length]);

  // Statistics calculation helpers
  const totalOriginalSize = images.reduce((acc, img) => acc + img.originalSize, 0);
  const totalConvertedSize = images.reduce(
    (acc, img) => acc + (img.convertedSize || (img.status === 'success' ? img.originalSize * 0.4 : 0)),
    0
  );
  const totalSavedBytes = totalOriginalSize - totalConvertedSize;
  const averageSavingsPercent = totalOriginalSize > 0 
    ? Math.max(0, Math.round((totalSavedBytes / totalOriginalSize) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-brand-gray-900 selection:bg-brand-green/30 selection:text-brand-green relative overflow-x-hidden" id="app_root">
      
      {/* Decorative Glow Grid */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-green/30 via-transparent to-transparent z-0"></div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        
        {/* Navigation / Header bar */}
        <header className="flex justify-between items-center border-b border-brand-gray-700/50 pb-6 mb-10" id="app_header">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-gray-800 border border-brand-gray-700 shadow-lg shadow-brand-green/5">
              <Sparkles className="w-6 h-6 text-brand-green" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                WebP <span className="text-brand-green">Converter</span>
              </h1>
              <p className="text-sm text-brand-gray-600 mt-0.5">HIGH-PERFORMANCE CLIENT OPTIMIZER</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDocModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-gray-800 border border-brand-gray-700 hover:border-brand-green/50 text-brand-gray-600 hover:text-brand-green transition-all duration-300 text-sm font-medium"
              id="btn_view_doc"
            >
              <BookOpen className="w-4 h-4" />
              <span>DOKUMENTASI</span>
            </button>
            <span className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-green/10 border border-brand-green/30 text-[10px] text-brand-green uppercase tracking-widest animate-pulse">
              ● Client Mode
            </span>
          </div>
        </header>

        {/* Dynamic Warning for Host constraints or browser optimization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: CONFIGURATION & PROGRESS QUEUE */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Main Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-400 relative overflow-hidden group ${
                isDragging 
                  ? 'border-brand-green bg-brand-green/5 shadow-lg shadow-brand-green/5' 
                  : 'border-brand-gray-700 bg-brand-gray-800/50 hover:bg-brand-gray-800 hover:border-brand-gray-600'
              }`}
              id="drop_zone"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*"
                className="hidden"
              />
              
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-brand-gray-800 border border-brand-gray-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative">
                  <Upload className="w-7 h-7 text-brand-gray-600 group-hover:text-brand-green transition-colors duration-300" />
                  <div className="absolute inset-0 rounded-full border border-brand-green/0 group-hover:border-brand-green/20 group-hover:animate-ping"></div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-base md:text-lg font-semibold text-white tracking-wide">
                    Tarik & Lepas Gambar ke Sini atau <span className="text-brand-green hover:underline">Telusuri</span>
                  </h3>
                  <p className="text-sm text-brand-gray-600 max-w-md mx-auto leading-relaxed">
                    Mendukung format PNG, JPEG, WEBP, GIF, BMP. Seluruh proses kompresi terjadi 100% lokal aman di browser.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <span className="text-xs font-medium bg-green-900/40 text-green-200 px-3 py-1 rounded-full">No Server Uploads</span>
                  <span className="text-xs font-medium bg-green-900/40 text-green-200 px-3 py-1 rounded-full">100% Client-Side</span>
                  <span className="text-xs font-medium bg-green-900/40 text-green-200 px-3 py-1 rounded-full">SEO Friendly</span>
                </div>
              </div>
            </div>

            {/* Global Settings Indicator / Slider inside active session */}
            <div className="bg-brand-gray-800/60 border border-brand-gray-700 p-5 rounded-2xl flex flex-col md:flex-row gap-5 items-center justify-between shadow-xl">
              <div className="space-y-1.5 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-white">
                  <Settings className="w-4.5 h-4.5 text-brand-green" />
                  <span className="font-semibold text-sm">Target Tingkat Kualitas WebP Default</span>
                </div>
                <p className="text-sm text-brand-gray-600 leading-normal">
                  Rekomendasi SEO: <span className="text-brand-green">75%</span> - Menghasilkan ukuran file terkecil tanpa mengurangi visual secara kasat mata.
                </p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={globalQuality}
                  onChange={(e) => setGlobalQuality(parseInt(e.target.value))}
                  className="w-full md:w-48 h-1.5 bg-brand-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-green focus:outline-none"
                  id="quality_slider"
                />
                <span className="font-mono text-base font-bold text-brand-green bg-brand-green/10 border border-brand-green/20 px-3 py-1 rounded-xl min-w-[60px] text-center">
                  {globalQuality}%
                </span>
              </div>
            </div>

            {/* Dynamic Conversions Queue */}
            {images.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Antrean File</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gray-800 border border-brand-gray-700 text-brand-gray-600 font-bold font-mono">
                      {images.length} File
                    </span>
                  </div>
                  <button
                    onClick={clearQueue}
                    className="text-xs text-brand-gray-600 hover:text-red-400 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all duration-300"
                    id="btn_clear_queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    BERSIHKAN SEMUA
                  </button>
                </div>

                <div className="space-y-3.5">
                  <AnimatePresence initial={false}>
                    {images.map((item) => {
                      const reduction = (item.originalSize && item.convertedSize)
                        ? Math.max(0, Math.round(((item.originalSize - item.convertedSize) / item.originalSize) * 100))
                        : null;

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="bg-brand-gray-800 border border-brand-gray-700 hover:border-brand-gray-600 rounded-xl p-4 flex flex-col md:flex-row items-stretch justify-between gap-4 transition-all duration-300 relative shadow-md overflow-hidden"
                        >
                          {/* Accent bar left based on status */}
                          <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                            item.status === 'success' ? 'bg-brand-green' : item.status === 'converting' ? 'bg-amber-400 animate-pulse' : 'bg-brand-gray-700'
                          }`}></div>

                          {/* Image Thumbnail & Metadata */}
                          <div className="flex items-center space-x-4 flex-1">
                            {/* Image Thumbnail Preview container */}
                            <div className="relative w-14 h-14 bg-brand-gray-900 rounded-lg border border-brand-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden group/thumb">
                              <img
                                src={item.originalUrl}
                                alt={item.name}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-sm font-medium text-white truncate max-w-md block" title={item.name}>
                                {item.name}
                              </p>
                              
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-brand-gray-600">
                                <span>{formatSize(item.originalSize)}</span>
                                <span className="opacity-40">•</span>
                                <span className="uppercase text-[10px] bg-brand-gray-700 px-1.5 py-0.2 rounded text-brand-gray-600">
                                  {item.originalType.split('/')[1]}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Middle: Conversion Progress Details */}
                          <div className="flex flex-col md:flex-row items-center gap-4 justify-between md:min-w-[320px]">
                            
                            {/* Visual flow sign */}
                            <div className="flex items-center gap-1.5 text-brand-gray-600 text-xs">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-gray-600"></div>
                              <ArrowRight className="w-3.5 h-3.5" />
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>
                            </div>

                            {/* Status and Size output text */}
                            <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-[120px]">
                              {item.status === 'success' && item.convertedSize ? (
                                <>
                                  <span className="text-sm font-bold text-brand-green font-mono">
                                    {formatSize(item.convertedSize)}
                                  </span>
                                  {reduction !== null && (
                                    <span className="text-[10px] text-brand-green bg-brand-green/10 border border-brand-green/20 px-1.5 py-0.1 rounded mt-0.5 inline-block">
                                      Saved {reduction}%
                                    </span>
                                  )}
                                </>
                              ) : item.status === 'converting' ? (
                                <span className="text-xs text-amber-400 flex items-center gap-1.5 py-1">
                                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                                  Memproses...
                                </span>
                              ) : item.status === 'failed' ? (
                                <span className="text-xs text-red-400 font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Gagal
                                </span>
                              ) : (
                                <span className="text-xs text-brand-gray-600">
                                  Siap dikonversi
                                </span>
                              )}
                            </div>

                            {/* Options to change quality on the fly & actions */}
                            <div className="flex items-center gap-2">
                              {/* Re-converter Button */}
                              {item.status === 'success' && (
                                <button
                                  onClick={() => downloadSingle(item)}
                                  className="p-2 rounded-lg bg-brand-green/10 text-brand-green border border-brand-green/30 hover:bg-brand-green hover:text-brand-gray-900 transition-all duration-300"
                                  title="Unduh WebP hasil kompresi"
                                  id={`btn_download_${item.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}

                              {item.status === 'failed' && (
                                <button
                                  onClick={() => convertSingleImage(item, item.quality)}
                                  className="p-2 rounded-lg bg-brand-gray-700/60 border border-brand-gray-700 text-brand-gray-600 hover:text-white transition-colors"
                                  title="Coba ulang kompresi"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => deleteImage(item.id)}
                                className="p-2 rounded-lg bg-brand-gray-700/30 text-brand-gray-600 border border-transparent hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
                                title="Hapus dari antrean"
                                id={`btn_delete_${item.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                          </div>

                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Empty queue helper display */}
            {images.length === 0 && (
              <div className="rounded-2xl border border-brand-gray-700/50 bg-brand-gray-800/20 p-8 text-center text-brand-gray-600 space-y-2">
                <ImageIcon className="w-8 h-8 mx-auto text-brand-gray-700" />
                <p className="text-sm font-medium">Antrean konversi masih kosong.</p>
                <p className="text-xs max-w-sm mx-auto">Tarik file gambar atau pilih tombol pencarian di atas untuk memulai batch optimalisasi otomatis secara offline.</p>
              </div>
            )}

          </div>

          {/* RIGHT PANEL: LIVE GENERAL STATS & SUMMARY METRICS */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Realtime Core Statistics */}
            <div className="bg-brand-gray-800 border border-brand-gray-700 rounded-2xl p-6 shadow-xl relative overflow-hidden" id="analytics_card">
              <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-green to-transparent"></div>
              
              <h4 className="text-xs font-bold tracking-wider text-brand-gray-600 uppercase mb-4 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-brand-green" />
                RINGKASAN OPTIMASI BATCH
              </h4>

              <div className="space-y-5">
                
                {images.length > 0 ? (
                  <>
                    {/* Progress Percentage Gauge block */}
                    <div className="bg-brand-gray-900 border border-brand-gray-700/75 rounded-xl p-5 text-center relative overflow-hidden">
                      <div className="space-y-1">
                        <span className="text-[10px] text-brand-gray-600 uppercase tracking-widest block">Total Penghematan Ukuran</span>
                        <h3 className="text-4xl font-black text-brand-green leading-none tracking-tight font-mono">
                          -{averageSavingsPercent}%
                        </h3>
                        <p className="text-xs text-brand-gray-600 mt-1">
                          Menyelamatkan <span className="text-white font-semibold">{formatSize(Math.max(0, totalSavedBytes))}</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-brand-gray-700/40">
                        <span className="text-brand-gray-600">Total File</span>
                        <span className="text-white font-bold">{images.length} Gambar</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-brand-gray-700/40">
                        <span className="text-brand-gray-600">Ukuran Awal</span>
                        <span className="text-white">{formatSize(totalOriginalSize)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-brand-gray-700/40">
                        <span className="text-brand-gray-600">Ukuran WebP</span>
                        <span className="text-brand-green font-semibold">{formatSize(totalConvertedSize)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-brand-gray-600">Status Proses</span>
                        <span className="text-white font-bold flex items-center gap-1">
                          {images.filter(x => x.status === 'success').length} dari {images.length} Berhasil
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 text-center">
                      {images.some((img) => img.status === 'success') ? (
                        <button
                          onClick={downloadAllSuccess}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-emerald to-brand-green hover:from-brand-green hover:to-brand-emerald text-brand-gray-900 font-bold transition-all duration-300 shadow-lg shadow-brand-green/20"
                          id="btn_download_all"
                        >
                          <Download className="w-5 h-5" />
                          <span>UNDUH SEMUA (WEBP)</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-3 px-4 rounded-xl bg-brand-gray-700 text-brand-gray-600 cursor-not-allowed font-medium text-xs"
                        >
                          Menunggu Konversi Berhasil...
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 space-y-2 text-brand-gray-600 text-xs">
                    <p>Belum ada data visualisasi optimasi.</p>
                    <p className="text-[10px] text-brand-gray-600">Garis grafik dan persentase penghematan hosting akan tampil di sini saat batch file masuk.</p>
                  </div>
                )}

              </div>
            </div>

            {/* Educational SEO & PageSpeed Section - Highly tailored for Wahyu's background */}
            <div className="bg-brand-gray-800 border border-brand-gray-700 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-bold tracking-wider text-brand-gray-600 uppercase flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-brand-green" />
                KORELASI WEBP & HASIL SEO
              </h4>
              
              <div className="space-y-3.5 text-xs text-brand-gray-600 leading-relaxed">
                <div className="space-y-1.5 p-3 rounded-xl bg-brand-gray-900 border border-brand-gray-700/60">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
                    Meningkatkan LCP (Largest Contentful Paint)
                  </p>
                  <p>
                    LCP mengukur waktu muat konten visual utama halaman. Konversi PNG/JPG ke target WebP (~75% quality) mempercepat LCP hingga <span className="text-brand-green">2x lipat lebih cepat</span>, meningkatkan nilai Core Web Vitals Anda di Google Search Console.
                  </p>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-brand-gray-900 border border-brand-gray-700/60">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-green"></span>
                    Menghemat Bandwidth Hosting (CDN)
                  </p>
                  <p>
                    WebP mengompresi gambar tanpa penurunan resolusi drastis. Format lossless WebP berukuran <span className="text-brand-green">26% lebih ringkas</span> dibanding PNG, sangat vital untuk efisiensi budget server VPS atau tagihan CDN Cloudflare.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* DOCUMENTATION DRAWER/MODAL FILE CONTENT PREVIEW OVERLAY */}
      <AnimatePresence>
        {showDocModal && (
          <div className="fixed inset-0 bg-brand-gray-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-gray-800 border border-brand-gray-700 w-full max-w-4xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative"
            >
              
              {/* Modal Header */}
              <div className="p-5 border-b border-brand-gray-700/80 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <BookOpen className="w-5 h-5 text-brand-green" />
                  <div>
                    <h3 className="text-md font-bold text-white">Dokumentasi Proyek WebP Converter</h3>
                    <p className="text-[10px] text-brand-gray-600">README_ID.md - Spesifikasi Teknis & Panduan SEO</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDocModal(false)}
                  className="p-1 px-2.5 text-xs text-brand-gray-600 hover:text-white hover:bg-brand-gray-700 rounded-lg transition-colors flex items-center gap-1"
                  id="btn_close_doc"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>TUTUP</span>
                </button>
              </div>

              {/* Modal Body: Scannable Indonesian markdown representation styled cleanly */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-sm text-brand-gray-600 leading-relaxed font-sans max-h-[calc(85vh-85px)]">
                
                <section className="space-y-3">
                  <h2 className="text-lg font-bold text-white border-b border-brand-gray-700 pb-1.5 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-green" />
                    Tentang Proyek
                  </h2>
                  <p>
                    <strong>WebP Image Converter</strong> adalah aplikasi tool berbasis web responsif yang dirancang untuk mempercepat alur kerja optimasi aset visual web developer dan spesialis SEO. Aplikasi ini beroperasi sepenuhnya secara <strong>client-side murni</strong>, artinya tidak ada satu pun byte gambar yang diunggah ke server eksternal demi menjamin keamanan data dan menghemat bandwidth.
                  </p>
                </section>

                <section className="space-y-3">
                  <h2 className="text-lg font-bold text-white border-b border-brand-gray-700 pb-1.5">🚀 Panduan Pengoperasian</h2>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>
                      <strong>Tarik & Lepas / Pilih File:</strong> Letakkan file berekstensi JPG, JPEG, PNG, BMP, atau GIF secara massal ke area drop zone utama.
                    </li>
                    <li>
                      <strong>Atur Kualitas (Quality):</strong> Atur parameter slider kompresi sesuai selera visual Anda. Nilai 75% adalah nilai emas standard industri SEO.
                    </li>
                    <li>
                      <strong>Konversi Otomatis:</strong> Aplikasi memproses antrean queue secara asinkronus menggunakan HTML5 Canvas API secara instan di browser.
                    </li>
                    <li>
                      <strong>Simpan Hasil secara Batch / Individu:</strong> Klik tombol hijau "UNDUH SEMUA" untuk mendownload tumpukan WebP secara sekuensial, atau simpan file secara manual satu per satu.
                    </li>
                  </ol>
                </section>

                <section className="space-y-3">
                  <h2 className="text-lg font-bold text-white border-b border-brand-gray-700 pb-1.5">⚡ Manfaat Teknis Format WebP untuk SEO</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-brand-gray-900 border border-brand-gray-700/60 space-y-2">
                      <h4 className="font-bold text-brand-green text-xs">PENGHANCUR UKURAN FILE</h4>
                      <p className="text-xs text-brand-gray-600">
                        WebP didukung oleh kompresi murni Google yang menghasilkan dimensi ukuran visual sampai 34% lebih kerdil dibandingkan JPEG, tanpa mencoreng kualitas gambar yang terlihat mata manusia.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-brand-gray-900 border border-brand-gray-700/60 space-y-2">
                      <h4 className="font-bold text-brand-green text-xs">OPTIMASI CORE WEB VITALS</h4>
                      <p className="text-xs text-brand-gray-600">
                        Mengurangi beban Page Speed secara keseluruhan. Kecepatan situs yang kencang langsung berdampak positif pada skor Largest Contentful Paint (LCP) dan Cumulative Layout Shift (CLS) yang dinilai oleh bot crawler mesin pencari Google.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h2 className="text-lg font-bold text-white border-b border-brand-gray-700 pb-1.5">🛠️ Struktur Arsitektur Kode</h2>
                  <ul className="list-disc pl-5 space-y-2 text-xs">
                    <li><strong className="text-white">/package.json</strong> - Manajemen dependensi (React 19, Tailwind CSS v4, Motion).</li>
                    <li><strong className="text-white">/src/App.tsx</strong> - Kode sumber utama (Canvas Compressor Logic, Drag & Drop State).</li>
                    <li><strong className="text-white">/src/index.css</strong> - Tema visual Obsidian Slate kustom dengan kombinasi warna Hijau Neon (#00FF66).</li>
                    <li><strong className="text-white">/README_ID.md</strong> - Dokumentasi proyek lengkap bahasa Indonesia (Dapat Anda unduh / salin langsung).</li>
                  </ul>
                </section>

                <section className="pt-4 border-t border-brand-gray-700 space-y-2">
                     <p>
                       <strong className="text-white">Open source.</strong> Webpify dibuat dengan bantuan Google AI Studio, lalu dikembangkan dan dirawat oleh Wahyu Mahmudiyanto. Kode sumber, catatan perubahan, dan panduan lengkap ada di GitHub:{' '}
                       <a
                         href="https://github.com/wahyu043/webpify"
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-brand-green hover:underline"
                       >
                         github.com/wahyu043/webpify
                       </a>
                     </p>
                   </section>
                   
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
