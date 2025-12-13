import { toast } from 'sonner';

const TARGET_SIZE_MB = 30;
const MAX_SIZE_MB = 50;

/**
 * Compresses a video file to target size using browser APIs
 * @param file - The video file to compress
 * @returns Compressed video blob or original if already small enough
 */
export async function compressVideo(file: File): Promise<File> {
  const fileSizeMB = file.size / (1024 * 1024);
  
  // If file is already under max size, return as-is
  if (fileSizeMB <= MAX_SIZE_MB) {
    return file;
  }

  toast.info(`Video is ${fileSizeMB.toFixed(1)}MB. Compressing to ~${TARGET_SIZE_MB}MB...`);

  try {
    // Calculate target bitrate based on video duration
    const duration = await getVideoDuration(file);
    const targetSizeBytes = TARGET_SIZE_MB * 1024 * 1024;
    // Target bitrate in bits per second (with some buffer for audio)
    const targetBitrate = Math.floor((targetSizeBytes * 8) / duration * 0.85);

    const compressedBlob = await reencodeVideo(file, targetBitrate, duration);
    
    const compressedSizeMB = compressedBlob.size / (1024 * 1024);
    toast.success(`Video compressed: ${fileSizeMB.toFixed(1)}MB → ${compressedSizeMB.toFixed(1)}MB`);

    return new File([compressedBlob], file.name, { type: 'video/webm' });
  } catch (error) {
    console.error('Video compression failed:', error);
    toast.error('Video compression failed. Please try a smaller file.');
    throw new Error('Video compression failed');
  }
}

/**
 * Gets the duration of a video file in seconds
 */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration && isFinite(video.duration)) {
        resolve(video.duration);
      } else {
        reject(new Error('Could not determine video duration'));
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Re-encodes video using Canvas and MediaRecorder
 */
async function reencodeVideo(file: File, targetBitrate: number, duration: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.onloadedmetadata = () => {
      // Scale down resolution if video is very large
      const originalWidth = video.videoWidth;
      const originalHeight = video.videoHeight;
      
      let scale = 1;
      const maxDimension = 1280; // Max 720p-ish
      
      if (originalWidth > maxDimension || originalHeight > maxDimension) {
        scale = maxDimension / Math.max(originalWidth, originalHeight);
      }
      
      canvas.width = Math.floor(originalWidth * scale);
      canvas.height = Math.floor(originalHeight * scale);
      
      // Cap bitrate for reasonable quality
      const cappedBitrate = Math.min(Math.max(targetBitrate, 500000), 4000000);
      
      const stream = canvas.captureStream(30);
      
      // Try to add audio track if available
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const destination = audioCtx.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioCtx.destination);
        
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      } catch (e) {
        console.log('Could not capture audio, proceeding without it');
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: cappedBitrate
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        URL.revokeObjectURL(video.src);
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      mediaRecorder.onerror = (e) => {
        URL.revokeObjectURL(video.src);
        reject(new Error('MediaRecorder error'));
      };

      // Draw frames to canvas
      const drawFrame = () => {
        if (video.paused || video.ended) {
          mediaRecorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };

      video.onplay = () => {
        mediaRecorder.start(100);
        drawFrame();
      };
      
      video.onended = () => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      };

      video.play().catch(reject);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Check if video needs compression
 */
export function needsCompression(file: File): boolean {
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB > MAX_SIZE_MB;
}

/**
 * Get file size in MB
 */
export function getFileSizeMB(file: File): number {
  return file.size / (1024 * 1024);
}
