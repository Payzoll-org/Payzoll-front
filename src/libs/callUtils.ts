import { io, Socket } from 'socket.io-client';
import { usePromptStore } from '../Zustand/AgentConfiguration';
import {
  connectToLiveKitRoom,
  publishAudioTrack,
  disconnectFromLiveKitRoom
} from './livekitUtils';
import { Room } from 'livekit-client';

let currentSessionId: string | null = null;
const AUDIO_SERVICE_URL = "http://localhost:3000"; // Audio microservice (not Python agent)

export interface CallHandlers {
  onOpen?: () => void;
  onMessage?: (message: string) => void;
  onClose?: () => void;
  onError?: (error: any) => void;
  onTranscript?: (text: string) => void;
  onAudioReceived?: (audioData: ArrayBuffer) => void;
}

let socket: Socket | null = null;
let livekitRoom: Room | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationFrameId: number | null = null;
let silenceTimeout: number | null = null;
let isRecording = false;
let isAgentSpeaking = false;
let isSpeaking = false;

// VAD Configuration
const SILENCE_THRESHOLD = 0.02; // Volume threshold (0-1) - increased for better noise rejection
const SILENCE_DURATION = 2000; // 2 seconds of silence before processing

// -------------------- Start Call --------------------
export const startCall = async (handlers: CallHandlers) => {
  try {
    // Generate unique room name and participant name
    const roomName = `voice - session - ${Date.now()} `;
    const participantName = `user - ${Date.now()} `;
    currentSessionId = roomName;

    console.log('[Call] Starting call with LiveKit...');
    console.log('[Call] Room:', roomName);
    console.log('[Call] Participant:', participantName);

    // Connect to LiveKit room
    livekitRoom = await connectToLiveKitRoom({
      roomName,
      participantName,
      onConnected: () => {
        console.log('[Call] ✅ LiveKit connected');
        handlers.onOpen?.();

        // Publish audio track
        publishAudioTrack()
          .then(() => {
            console.log('[Call] ✅ Audio track published');
          })
          .catch((error) => {
            console.error('[Call] ❌ Failed to publish audio:', error);
            handlers.onError?.(error);
          });
      },
      onDisconnected: () => {
        console.log('[Call] ❌ LiveKit disconnected');
        handlers.onClose?.();
      },
      onTrackSubscribed: (_track) => {
        console.log('[Call] 📥 Received track from agent');
        // Audio playback is handled in livekitUtils
      },
      onError: (error) => {
        console.error('[Call] ❌ LiveKit error:', error);
        handlers.onError?.(error);
      }
    });

    // Connect to Socket.io for signaling (transcriptions, agent responses)
    socket = io(AUDIO_SERVICE_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log("✅ Connected to Audio Service");
      // Initialize sessionId immediately with socket.id
      currentSessionId = socket?.id || null;
      console.log("🆔 Session ID initialized:", currentSessionId);
      handlers.onOpen?.();
    });

    socket.on('session-created', (data) => {
      currentSessionId = data.sessionId;
      console.log("🆔 Session created:", currentSessionId);
    });

    socket.on('conversation-started', (data) => {
      console.log("🎤 Conversation started:", data.message);
      startAudioCapture(handlers);
    });

    socket.on('transcription', (data) => {
      console.log("📝 Transcription event received:", data);
      console.log("📝 Transcription text:", data.text);
      console.log("📝 Calling onTranscript handler...");
      handlers.onTranscript?.(data.text);
    });

    socket.on('agent-response', (data) => {
      console.log("🤖 Agent response:", data);
      // Backend now provides extracted text field, with fallback to extraction
      const agentMessage = data.text || data.agent?.response || data.agent?.message || JSON.stringify(data.agent);
      handlers.onMessage?.(agentMessage);

      // TODO: This will be replaced with real audio playback
      // For now, using browser TTS as placeholder
      speakText(agentMessage);
    });

    socket.on('audio-received', (data) => {
      console.log("📡 Audio chunk received:", data);
    });

    socket.on('tts-cancelled', () => {
      console.log("❌ TTS cancelled due to interruption");
      window.speechSynthesis.cancel();
      isAgentSpeaking = false;
    });

    socket.on('conversation-stopped', () => {
      console.log("⏹️ Conversation stopped");
      stopAudioCapture();
    });

    socket.on('disconnect', () => {
      console.log("❌ Disconnected from Audio Service");
      stopAudioCapture();
      handlers.onClose?.();
    });


    socket.on('error', (error) => {
      console.error("⚠️ Socket error:", error);
      handlers.onError?.(error);
    });

    // Start the conversation
    socket.emit('start-conversation', {
      sessionId: currentSessionId,
      timestamp: new Date().toISOString()
    });

    return socket;
  } catch (error) {
    console.error('[Call] ❌ Failed to start call:', error);
    handlers.onError?.(error as Error);
    throw error;
  }
};

// -------------------- Audio Capture (Start/Stop per utterance) --------------------
let recordedChunks: Blob[] = [];

const startAudioCapture = async (handlers: CallHandlers) => {
  try {
    // Create AudioContext for VAD
    audioContext = new AudioContext();

    // Get microphone access with echo cancellation
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      }
    });

    console.log("🎤 Audio stream acquired");

    // Start volume monitoring for VAD (but don't start recording yet)
    startVolumeMonitoring();

    // Listen for manual recording controls
    window.addEventListener('manual-recording-start', () => {
      console.log("📍 Manual recording start triggered");
      if (!isRecording) {
        startRecording();
      }
    });

    window.addEventListener('manual-recording-stop', () => {
      console.log("📍 Manual recording stop triggered");
      if (isRecording) {
        stopRecording();
      }
    });

  } catch (error) {
    console.error("❌ Failed to start audio capture:", error);
    handlers.onError?.(error);
  }
};

const startRecording = () => {
  // Prevent starting if already recording or no audio stream
  if (!audioStream || mediaRecorder || isRecording) {
    console.warn("⚠️ Cannot start recording: already recording or no stream");
    return;
  }

  try {
    // Create MediaRecorder for this utterance
    mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      console.log("🛑 Recording stopped, processing audio blob");

      // Validate we have recorded data
      if (recordedChunks.length === 0) {
        console.warn("⚠️ No audio chunks recorded");
        mediaRecorder = null;
        isRecording = false;
        return;
      }

      // Create complete WebM blob from chunks
      const completeBlob = new Blob(recordedChunks, { type: 'audio/webm' });

      // Validate blob size
      if (completeBlob.size < 1000) {
        console.warn("⚠️ Audio blob too small, likely silence");
        mediaRecorder = null;
        recordedChunks = [];
        isRecording = false;
        return;
      }

      // Send complete blob to backend
      completeBlob.arrayBuffer().then(buffer => {
        if (socket && socket.connected) {
          socket.emit('audio-blob', {
            buffer,
            sessionId: currentSessionId
          });
        } else {
          console.error("❌ Cannot send audio: socket not connected");
        }
      }).catch(error => {
        console.error("❌ Failed to send audio blob:", error);
      });

      // Cleanup
      mediaRecorder = null;
      recordedChunks = [];
      isRecording = false;
    };

    mediaRecorder.start(150); // Collect chunks every 150ms
    isRecording = true;
    console.log("🔴 Recording started");

  } catch (error) {
    console.error("❌ Failed to start recording:", error);
  }
};

const stopRecording = () => {
  if (mediaRecorder && isRecording) {
    try {
      mediaRecorder.stop();
      console.log("⏹️ Stopping recording...");
    } catch (error) {
      console.error("❌ Error stopping recording:", error);
      // Force cleanup
      mediaRecorder = null;
      recordedChunks = [];
      isRecording = false;
    }
  }
};

// -------------------- Voice Activity Detection --------------------
const startVolumeMonitoring = () => {
  if (!audioStream || !audioContext) return;

  // Create analyser node for volume detection
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  // Connect microphone to analyser
  const source = audioContext.createMediaStreamSource(audioStream);
  source.connect(analyser);

  console.log("🎧 Voice Activity Detection started");
  monitorVolume();
};

const monitorVolume = () => {
  if (!analyser) return;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  // Calculate average volume
  const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
  const volume = average / 255; // Normalize to 0-1

  // Log volume periodically for debugging (every 60 frames ~= every 1s)
  if (animationFrameId && animationFrameId % 60 === 0) {
    console.log(`🔊 Vol: ${volume.toFixed(3)} | Speaking: ${isSpeaking} | Recording: ${isRecording} `);
  }

  if (volume > SILENCE_THRESHOLD) {
    // User is speaking
    if (!isSpeaking) {
      isSpeaking = true;
      console.log("🎤 Speech detected");

      // ✅ AUTO-START RECORDING (Real-time optimization)
      if (!isRecording && !isAgentSpeaking) {
        startRecording();
      }
    }
    // Reset silence timeout
    if (silenceTimeout) {
      clearTimeout(silenceTimeout);
      silenceTimeout = null;
    }
  } else {
    // Silence detected
    if (isSpeaking && !silenceTimeout) {
      silenceTimeout = setTimeout(() => {
        isSpeaking = false;
        console.log("🔇 Silence detected - auto-stopping recording");

        // ✅ AUTO-STOP RECORDING (Real-time optimization)
        if (isRecording) {
          stopRecording(); // This sends complete blob to backend
        }

        silenceTimeout = null;
      }, SILENCE_DURATION);
    }
  }

  // Continue monitoring
  animationFrameId = requestAnimationFrame(monitorVolume);
};

// -------------------- Stop Audio Capture --------------------
const stopAudioCapture = () => {
  // Stop any active recording
  stopRecording();

  // Stop volume monitoring
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (silenceTimeout) {
    clearTimeout(silenceTimeout);
    silenceTimeout = null;
  }

  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  analyser = null;
  mediaRecorder = null;
  isRecording = false;
  isSpeaking = false;
  recordedChunks = [];
};

// -------------------- End Call --------------------
export const endCall = async () => {
  if (socket) {
    socket.emit('end-conversation', { sessionId: currentSessionId });
    socket.disconnect();
    socket = null;
  }

  if (livekitRoom) {
    await disconnectFromLiveKitRoom();
    livekitRoom = null;
  }

  stopAudioCapture();
  currentSessionId = null;
};

export const hangupCall = async () => {
  await endCall();
};

// -------------------- Send Text Message (for testing) --------------------
export const sendTextMessage = (message: string) => {
  if (socket && currentSessionId) {
    const prompt = usePromptStore.getState().prompt;

    socket.emit('text-message', {
      message,
      sessionId: currentSessionId,
      prompt,
      timestamp: new Date().toISOString()
    });
  }
};

// -------------------- Temporary TTS (will be replaced with real audio) --------------------
const speakText = (text: string) => {
  if (!text) return;
  if ('speechSynthesis' in window) {
    isAgentSpeaking = true;

    // Stop any active recording when agent starts speaking
    if (isRecording) {
      console.log("🤖 Agent speaking - stopping user recording");
      stopRecording();
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      isAgentSpeaking = false;
      console.log("🤖 Agent finished speaking");
    };

    utterance.onerror = () => {
      isAgentSpeaking = false;
    };

    window.speechSynthesis.speak(utterance);
  }
};

// -------------------- Handle User Interruption --------------------
export const handleUserInterrupt = () => {
  if (socket && isAgentSpeaking) {
    socket.emit('user-interrupt');
    window.speechSynthesis.cancel();
    isAgentSpeaking = false;
  }
};