import { useState } from "react";

const CallSetting = () => {
  const [recording, setRecording] = useState(false);
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Call Settings</h3>
      <p className="text-sm text-gray-600">Configure call-related options for the agent.</p>
      <div className="flex items-center gap-2">
        <label className="text-sm">Enable Call Recording</label>
        <input
          type="checkbox"
          checked={recording}
          onChange={() => setRecording((r) => !r)}
          className="accent-black"
        />
      </div>
    </div>
  );
};

export default CallSetting; 