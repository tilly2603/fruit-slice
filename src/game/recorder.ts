/**
 * Browser Game & Camera MediaRecorder module
 * Captures the game canvas stream and produces a downloadable local video blob
 */

export class GameRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingUrl: string | null = null;
  private isRecording: boolean = false;
  private onStateChange?: (isRecording: boolean, downloadUrl: string | null) => void;

  constructor(onStateChange?: (isRecording: boolean, downloadUrl: string | null) => void) {
    this.onStateChange = onStateChange;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'MediaRecorder' in window;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getDownloadUrl(): string | null {
    return this.recordingUrl;
  }

  public startRecording(canvas: HTMLCanvasElement): boolean {
    if (!this.isSupported()) {
      return false;
    }

    // Clean up any previous recording URL
    if (this.recordingUrl) {
      URL.revokeObjectURL(this.recordingUrl);
      this.recordingUrl = null;
    }

    try {
      this.recordedChunks = [];
      const stream = canvas.captureStream(30); // 30 FPS stream

      // Pick supported mime type
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const mime = selectedMime || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mime });
        this.recordingUrl = URL.createObjectURL(blob);
        this.isRecording = false;
        if (this.onStateChange) {
          this.onStateChange(false, this.recordingUrl);
        }
      };

      this.mediaRecorder.start(250); // collect chunk every 250ms
      this.isRecording = true;
      if (this.onStateChange) {
        this.onStateChange(true, null);
      }
      return true;
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      this.isRecording = false;
      return false;
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        console.error('Error stopping recorder:', err);
      }
    }
  }

  public clearRecording() {
    if (this.recordingUrl) {
      URL.revokeObjectURL(this.recordingUrl);
      this.recordingUrl = null;
    }
    this.recordedChunks = [];
    if (this.onStateChange) {
      this.onStateChange(false, null);
    }
  }
}
