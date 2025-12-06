import { io, Socket } from 'socket.io-client';
import { usePromptStore } from '../Zustand/AgentConfiguration';

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
let mediaRecorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;
let isRecording = false;
let isAgentSpeaking = false;

// -------------------- Start Call --------------------
export const startCall = (handlers: CallHandlers) => {
  // Connect to audio microservice (not Python agent)
  socket = io(AUDIO_SERVICE_URL, {
    transports: ['websocket'],
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log("✅ Connected to Audio Service");
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

  socket.on('agent-response', (data) => {
    console.log("🤖 Agent response:", data.text);
    handlers.onMessage?.(data.text);

    // TODO: This will be replaced with real audio playback
    // For now, using browser TTS as placeholder
    speakText(data.text);
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
};

// -------------------- Audio Capture (Real-time chunks) --------------------
const startAudioCapture = async (handlers: CallHandlers) => {
  try {
    // Get microphone access with echo cancellation
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      }
    });

    // Create MediaRecorder for chunked audio
    mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && socket && !isAgentSpeaking) {
        // Convert blob to ArrayBuffer and send to audio service
        event.data.arrayBuffer().then(buffer => {
          socket?.emit('audio-chunk', buffer);
        });
      }
    };

    mediaRecorder.onstart = () => {
      console.log("🎙️ Audio capture started");
      isRecording = true;
    };

    mediaRecorder.onstop = () => {
      console.log("🛑 Audio capture stopped");
      isRecording = false;
    };

    // Start recording in 150ms chunks (optimal for real-time)
    mediaRecorder.start(150);

  } catch (error) {
    console.error("❌ Failed to start audio capture:", error);
    handlers.onError?.(error);
  }
};

// -------------------- Stop Audio Capture --------------------
const stopAudioCapture = () => {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
  }

  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }

  mediaRecorder = null;
  isRecording = false;
};

// -------------------- End Call --------------------
export const endCall = () => {
  if (socket) {
    socket.emit('stop-conversation');
    socket.emit('text-message', {
      message: "User ended the call!",
      sessionId: currentSessionId
    });

    stopAudioCapture();
    socket.disconnect();
    socket = null;
    currentSessionId = null;
  }
};

export const hangupCall = () => {
  if (socket) {
    socket.emit('stop-conversation');
    socket.emit('text-message', {
      message: "User cancelled the call!",
      sessionId: currentSessionId
    });

    stopAudioCapture();
    socket.disconnect();
    socket = null;
    currentSessionId = null;
  }
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

  isAgentSpeaking = true;

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang === "en-US" && v.name.includes("Google")) || voices[0];
  if (preferredVoice) utterance.voice = preferredVoice;

  utterance.lang = "en-US";
  utterance.volume = 1;
  utterance.rate = 1;
  utterance.pitch = 1;

  utterance.onend = () => {
    isAgentSpeaking = false;
    console.log("🔊 TTS finished");
  };

  utterance.onerror = () => {
    isAgentSpeaking = false;
    console.error("❌ TTS error");
  };

  window.speechSynthesis.speak(utterance);
};

// -------------------- Handle User Interruption --------------------
export const handleUserInterrupt = () => {
  if (socket && isAgentSpeaking) {
    socket.emit('user-interrupt');
    window.speechSynthesis.cancel();
    isAgentSpeaking = false;
  }
};