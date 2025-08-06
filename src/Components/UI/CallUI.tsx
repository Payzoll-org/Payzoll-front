import { useState } from "react";
import { IoCall } from "react-icons/io5";
import { sendCallMessage } from "../../libs/messageUtils";
import { PiWarningCircleFill } from "react-icons/pi";

interface CallUIProps {
  onSendMessage: (message: string) => void;
}

const CallUI = () => {
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "connected" | "ended">("idle");

  const handleCall = async () => {
    setIsCalling(true);
    setCallStatus("calling");
    
    try {
      // Simulate call connection
      setTimeout(() => {
        setCallStatus("connected");
      }, 2000);
    } catch (error) {
      console.error("Error initiating call:", error);
      setCallStatus("idle");
      setIsCalling(false);
    }
  };

  
  const handleEndCall = async () => {
    try {
      
      setIsCalling(false);
      setCallStatus("ended");
      onSendMessage("Call ended");
      setTimeout(() => {
        setCallStatus("idle");
      }, 1000);
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  const handleHangup = async () => {
    try {
      
      setIsCalling(false);
      setCallStatus("idle");
      onSendMessage("Call cancelled");
    } catch (error) {
      console.error("Error cancelling call:", error);
    }
  };

  return (
    <div className="flex h-full item-center justify-center flex-col gap-4 p-4">
      <div className="text-center">
        <h2 className="text-lg  mb-2">Test Agent</h2>
        <div className="text-gray-600 text-xs gap-1 flex items-center justify-center bg-gray-100 rounded-sm py-1"> 
          <PiWarningCircleFill /> 
          <p>Please note call transfer is not supported in Webcall.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Phone Number Input */}
        

        {/* Call Status */}
        {callStatus !== "idle" && (
          <div className={`text-center p-3 rounded-md ${
            callStatus === "calling" ? "bg-yellow-100 text-yellow-800" :
            callStatus === "connected" ? "bg-green-100 text-green-800" :
            "bg-red-100 text-red-800"
          }`}>
            {callStatus === "calling" && "Calling..."}
            {callStatus === "connected" && "Call Connected"}
            {callStatus === "ended" && "Call Ended"}
          </div>
        )}

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