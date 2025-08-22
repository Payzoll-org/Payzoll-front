import { useState } from "react";
import { IoCall } from "react-icons/io5";
import { PiWarningCircleFill } from "react-icons/pi";
import { startCall, endCall, hangupCall } from "../../libs/callUtils";

const CallUI = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "connected" | "ended">("idle");
  const [messages, setMessages] = useState<string[]>([]);

  const handleCall = () => {
    setIsCalling(true);
    setCallStatus("calling");

    startCall({
      onOpen: () => setCallStatus("connected"),
      onMessage: (msg) => setMessages((prev) => [...prev, `AI: ${msg}`]),
      onClose: () => {
        setCallStatus("ended");
        setIsCalling(false);
      },
      onError: () => {
        setCallStatus("ended");
        setIsCalling(false);
      },
    });
  };

  const handleEndCall = () => {
    endCall();
    setIsCalling(false);
    setCallStatus("ended");
    setTimeout(() => setCallStatus("idle"), 1000);
  };

  const handleHangup = () => {
    hangupCall();
    setIsCalling(false);
    setCallStatus("idle");
  };

  return (
    <div className="flex h-full item-center justify-center flex-col gap-4 p-4">
      <div className="text-center">
        <h2 className="text-lg mb-2">Test Agent</h2>
        <div className="text-gray-600 text-xs gap-1 flex items-center justify-center bg-gray-100 rounded-sm py-1">
          <PiWarningCircleFill />
          <p>Please note call transfer is not supported in Webcall.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Call Status */}
        {callStatus !== "idle" && (
          <div
            className={`text-center p-3 rounded-md ${
              callStatus === "calling"
                ? "bg-yellow-100 text-yellow-800"
                : callStatus === "connected"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {callStatus === "calling" && "Calling..."}
            {callStatus === "connected" && "Call Connected"}
            {callStatus === "ended" && "Call Ended"}
          </div>
        )}

        {/* Messages */}
        <div className="border p-2 h-40 overflow-y-scroll text-sm bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>

        {/* Call Controls */}
        <div className="flex gap-3 justify-center">
          {!isCalling ? (
            <button
              onClick={handleCall}
              className="flex items-center justify-center gap-2 px-8 py-1.5 bg-black text-white rounded-sm hover:bg-white hover:text-black hover:border disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <span>Test</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleEndCall}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <IoCall className="text-lg" />
                <span>End Call</span>
              </button>
              {callStatus === "calling" && (
                <button
                  onClick={handleHangup}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                >
                  <span>Cancel</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallUI;