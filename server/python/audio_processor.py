import pyaudio
import numpy as np
import librosa
import time
from collections import deque

# Audio configuration
FORMAT = pyaudio.paFloat32
CHANNELS = 1
RATE = 44100
BUFFER_SECONDS = .05
CHUNK = int(RATE * BUFFER_SECONDS)
# CHUNK = 1024 * 2  # Processing chunk size
  # Duration of audio buffer for analysis
HOP_LENGTH = CHUNK // 2  # Overlap for onset strength calculation

# --- Onset Detection Parameters ---
ONSET_THRESHOLD = 0.5  # Adjust this!  Experiment to find a good value.
N_FFT = 512

onset_detected_flag = False

class AudioProcessor:
    def __init__(self):
        self.beat_history = []
        self.running = False
        self.current_rms = None
        self.current_avg_rms = None
        self.current_rms_db = None
        self.current_avg_rms_db = None

    def start(self):
        print("Starting audio stream...")
        self.p = pyaudio.PyAudio()
        self.buffer = deque(maxlen=int(RATE * BUFFER_SECONDS / CHUNK))
        self.running = True
        self.stream = self.p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            output=False,
            stream_callback=self.callback,
            frames_per_buffer=CHUNK
        )
        self.process_audio()

    def callback(self, in_data, frame_count, time_info, status):
        audio_data = np.frombuffer(in_data, dtype=np.float32)
        self.buffer.append(audio_data)
        return (None, pyaudio.paContinue)

    def process_audio(self):
        try:
            while self.running and self.stream.is_active():
                if len(self.buffer) < self.buffer.maxlen:
                    time.sleep(0.01)
                    continue

                audio_window = np.concatenate(self.buffer)

                rms = librosa.feature.rms(y=audio_window)[0]
                avg_rms = np.mean(rms)
                self.current_rms = rms[-1]
                self.current_avg_rms = avg_rms

                # onset_env = librosa.onset.onset_strength(y=audio_window, sr=RATE,
                #                               hop_length=HOP_LENGTH,
                #                               n_fft=N_FFT)
                # print(onset_env)
                # # Onset Detection (Thresholding)
                # if np.max(onset_env) > ONSET_THRESHOLD:
                #     print("Onset detected!")
                #     onset_detected_flag = True
                # else:
                #     onset_detected_flag = False

                # rms_db = librosa.amplitude_to_db(rms, ref=np.max(rms))
                # self.current_rms_db = rms_db[-1]
                # self.current_avg_rms_db = np.mean(rms_db)


                # self.visualize_soundwave(rms)
                time.sleep(0.01)  # Adjust processing interval

        except KeyboardInterrupt:
            self.stop()

    def visualize_soundwave(self, rms):
        scaled_rms = int(np.clip(rms[-1] * 1350, 0, 1350))
        if scaled_rms > 0:
            print(f"SOUNDWAVE: {'*' * scaled_rms}")

    def get_rms(self):
        return self.current_rms

    def stop(self):
        self.running = False
        self.stream.stop_stream()
        self.stream.close()
        self.p.terminate()
        print("Audio stream closed")

if __name__ == "__main__":
    processor = AudioProcessor()
    processor.start()