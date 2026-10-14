let cachedBlobUrl: string | null = null;
let sharedAudioInstance: HTMLAudioElement | null = null;
let preloadPromise: Promise<string> | null = null;

let audioCtx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;

/**
 * Sử dụng Web Audio API (GainNode) để điều chỉnh âm lượng Intro.mp3 ở mức nhỏ,
 * dịu nhẹ (khoảng 0.2), làm nhạc nền nhẹ nhàng trong khi tải trang.
 */
function setupAudioGainBoost(audio: HTMLAudioElement): void {
  try {
    if (typeof window === 'undefined') return;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
    }
    if (!sourceNode && audioCtx) {
      sourceNode = audioCtx.createMediaElementSource(audio);
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.12; // Âm lượng nhỏ dịu nhẹ cho màn loading
      sourceNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume().catch(() => undefined);
    }
  } catch (err) {
    console.warn('Không thể thiết lập Web Audio GainNode:', err);
  }
}

export function resumeAudioContextIfNeeded(): void {
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => undefined);
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  const handleGesture = () => {
    resumeAudioContextIfNeeded();
  };
  window.addEventListener('pointerdown', handleGesture, { passive: true });
  window.addEventListener('keydown', handleGesture, { passive: true });
  window.addEventListener('click', handleGesture, { passive: true });
  window.addEventListener('touchstart', handleGesture, { passive: true });
}

/**
 * Preload Intro.mp3 vào RAM ngay từ thời điểm ứng dụng (trang web) khởi chạy.
 * Lưu file dưới dạng Blob in-memory và giải mã sẵn vào buffer,
 * giúp khi người dùng nhấn vào workspace/intro là phát lập tức không độ trễ (0ms).
 */
export function preloadIntroAudio(): Promise<string> {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return Promise.resolve('./sound/Intro.mp3');
  }
  if (cachedBlobUrl) {
    return Promise.resolve(cachedBlobUrl);
  }
  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = (async () => {
    try {
      const response = await fetch('./sound/Intro.mp3');
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      const blob = await response.blob();
      cachedBlobUrl = URL.createObjectURL(blob);

      // Tạo trước HTMLAudioElement và gọi .load() để trình duyệt giải mã header/audio trên RAM
      if (!sharedAudioInstance) {
        sharedAudioInstance = new Audio(cachedBlobUrl);
      } else if (sharedAudioInstance.src !== cachedBlobUrl && sharedAudioInstance.paused) {
        sharedAudioInstance.src = cachedBlobUrl;
      }
      sharedAudioInstance.preload = 'auto';
      sharedAudioInstance.loop = false;
      if (sharedAudioInstance.paused) {
        sharedAudioInstance.volume = 0.2;
        sharedAudioInstance.load();
      }

      return cachedBlobUrl;
    } catch (err) {
      console.warn('Không thể tải Intro.mp3 vào RAM, chuyển qua URL trực tiếp:', err);
      return './sound/Intro.mp3';
    }
  })();

  return preloadPromise;
}

/**
 * Trả về instance HTMLAudioElement đã được preload và cấu hình sẵn từ RAM.
 */
export function getPreloadedIntroAudio(): HTMLAudioElement {
  if (typeof Audio === 'undefined') {
    return {} as HTMLAudioElement;
  }
  if (!sharedAudioInstance) {
    sharedAudioInstance = new Audio(cachedBlobUrl || './sound/Intro.mp3');
  } else if (cachedBlobUrl && sharedAudioInstance.src !== cachedBlobUrl) {
    sharedAudioInstance.src = cachedBlobUrl;
    sharedAudioInstance.load();
  }

  setupAudioGainBoost(sharedAudioInstance);

  sharedAudioInstance.preload = 'auto';
  sharedAudioInstance.loop = false;
  if (sharedAudioInstance.paused) {
    sharedAudioInstance.volume = 0.12;
  }

  if (sharedAudioInstance.paused) {
    try {
      sharedAudioInstance.currentTime = 0;
    } catch {
      // Bỏ qua nếu audio chưa sẵn sàng
    }
  }

  // Nếu trong trường hợp vào thẳng trang mà audio vẫn đang tải vào RAM,
  // khi tải xong sẽ tự động nâng cấp sang nguồn RAM (nếu audio đang paused)
  if (!cachedBlobUrl && preloadPromise) {
    preloadPromise.then((url) => {
      if (
        url &&
        url !== './sound/Intro.mp3' &&
        sharedAudioInstance &&
        sharedAudioInstance.src !== url &&
        sharedAudioInstance.paused
      ) {
        sharedAudioInstance.src = url;
        sharedAudioInstance.load();
      }
    });
  }

  return sharedAudioInstance;
}

// Tự động kích hoạt tải vào RAM ngay khi module được import trên browser
if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
  void preloadIntroAudio();
}

export function startIntroAudioFromGesture(targetVolume = 0.12): void {
  if (typeof window === 'undefined' || typeof Audio !== 'undefined' && typeof Audio === 'function') {
    const audio = getPreloadedIntroAudio();
    if (!audio || typeof audio.play !== 'function') return;
    resumeAudioContextIfNeeded();
    const vol = Math.max(0, Math.min(1, targetVolume));
    if (gainNode) {
      gainNode.gain.value = vol;
    }
    audio.loop = false;
    audio.muted = false;
    audio.volume = vol;
    void audio.play().catch(() => undefined);
  }
}

export function stopIntroAudio(): void {
  if (typeof window === 'undefined') return;
  if (sharedAudioInstance) {
    try {
      sharedAudioInstance.pause();
      sharedAudioInstance.currentTime = 0;
    } catch {
      // Bỏ qua nếu pause thất bại
    }
  }
}

export function isIntroAudioPlaying(): boolean {
  if (typeof window === 'undefined') return false;
  return !!sharedAudioInstance && !sharedAudioInstance.paused;
}
