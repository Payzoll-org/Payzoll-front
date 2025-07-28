const SpeechSetting = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Speech Settings</h3>
      <p className="text-sm text-gray-600">Configure how the agent speaks and listens.</p>
      <div>
        <label className="block text-sm font-medium mb-1">Voice Type</label>
        <input
          type="text"
          placeholder="e.g. Male, Female, Neutral"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>
    </div>
  );
};

export default SpeechSetting; 