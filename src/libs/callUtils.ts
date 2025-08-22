import { usePromptStore } from '../Zustand/AgentConfiguration';

let currentSessionId: string | null = null;
const WS_URL = "ws://localhost:8000/ws";

export interface CallHandlers {
  onOpen?: () => void;
  onMessage?: (message: string) => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onTranscript?: (text: string) => void; // optional real-time transcript
}

let socket: WebSocket | null = null;
let recognition: SpeechRecognition | null = null;
let transcriptBuffer = "";
let sendTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 700; // wait time after user stops speaking

// -------------------- Start Call --------------------
export const startCall = (handlers: CallHandlers) => {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("✅ WebSocket connected");
    sendJSON({ message: "User started the call!" });
    handlers.onOpen?.();

    startSpeechRecognition(handlers);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.session_id) currentSessionId = data.session_id;
      handlers.onMessage?.(data.response);
    } catch {
      console.log("📩 Raw message from AI:", event.data);
      handlers.onMessage?.(event.data);
    }
  };

  socket.onclose = () => {
    console.log("❌ WebSocket disconnected");
    stopSpeechRecognition(true); // send remaining speech
    handlers.onClose?.();
  };

  socket.onerror = (err) => {
    console.error("⚠️ WebSocket error:", err);
    handlers.onError?.(err);
  };

  return socket;
};

// -------------------- End / Hangup --------------------
export const endCall = () => {
  if (socket) {
    stopSpeechRecognition(true);
    sendJSON({ message: "User ended the call!" });
    socket.close();
    socket = null;
  }
};

export const hangupCall = () => {
  if (socket) {
    stopSpeechRecognition(true);
    sendJSON({ message: "User cancelled the call!" });
    socket.close();
    socket = null;
  }
};

// -------------------- Speech Recognition --------------------
const startSpeechRecognition = (handlers: CallHandlers) => {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error("❌ SpeechRecognition not supported in this browser.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    transcriptBuffer = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcriptBuffer += event.results[i][0].transcript;
    }

    handlers.onTranscript?.(transcriptBuffer);

    if (sendTimeout) clearTimeout(sendTimeout);

    sendTimeout = setTimeout(() => {
      const prompt = usePromptStore.getState().prompt;
      if (transcriptBuffer.trim() !== "") {
        console.log("✅ Sending final speech to backend:", transcriptBuffer, prompt);
        sendJSON({
          message: transcriptBuffer,
          session_id: currentSessionId,
          prompt
        });
        transcriptBuffer = "";
      }
    }, DEBOUNCE_MS);
  };

  recognition.onerror = (event) => {
    console.error("⚠️ SpeechRecognition error:", event.error);
    // Restart on recoverable errors
    if (event.error === "no-speech" || event.error === "network") {
      recognition?.start();
    }
  };

  recognition.onend = () => {
    // Automatic restart to keep STT alive
    console.log("🎤 SpeechRecognition ended, restarting...");
    if (recognition) recognition.start();
  };

  recognition.start();
};

// -------------------- Stop Speech Recognition --------------------
const stopSpeechRecognition = (sendRemaining: boolean = false) => {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }

  if (sendRemaining && transcriptBuffer.trim() !== "") {
    const prompt = usePromptStore.getState().prompt;
    sendJSON({
      message: transcriptBuffer,
      session_id: currentSessionId,
      prompt
    });
    transcriptBuffer = "";
  }

  if (sendTimeout) {
    clearTimeout(sendTimeout);
    sendTimeout = null;
  }
};

// -------------------- Helper: send JSON --------------------
const sendJSON = (obj: any) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(obj));
  }
};