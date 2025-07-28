import { IoIosArrowDown } from "react-icons/io";
import { RiFunctionLine } from "react-icons/ri";
import { useState, useRef, useEffect } from "react";
import SpeechSetting from "./UI/SpeechSetting";
import CallSetting from "./UI/CallSetting";
import React from "react";

interface Setting {
  key: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  component?: React.ReactNode;
}

const SETTINGS: Setting[] = [
  {
    key: "speech",
    name: "Speech Setting",
    icon: <RiFunctionLine />,
    description: "Configure how the agent speaks and listens.",
    component: <SpeechSetting />,
  },
  {
    key: "functions",
    name: "Functions",
    icon: <RiFunctionLine />,
    description: "Manage agent functions and integrations.",
  },
  {
    key: "call",
    name: "Call Setting",
    icon: <RiFunctionLine />,
    description: "Configure call-related options for the agent.",
    component: <CallSetting />,
  },
  {
    key: "webhooks",
    name: "Webhooks",
    icon: <RiFunctionLine />,
    description: "Set up webhooks for external event notifications.",
  },
  {
    key: "mcps",
    name: "MCPs",
    icon: <RiFunctionLine />,
    description: "Manage MCPs (Multi-Channel Providers) for the agent.",
  },
  {
    key: "security",
    name: "Security",
    icon: <RiFunctionLine />,
    description: "Configure security settings for the agent.",
  },
  {
    key: "flashback",
    name: "Flashback Setting",
    icon: <RiFunctionLine />,
    description: "Configure flashback and history options.",
  },
];

const AgentSetting = () => {
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  const handleToggle = (key: string) => {
    setOpenKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="h-full px-1 w-full">
      {SETTINGS.map((setting) => {
        const isOpen = openKeys.includes(setting.key);
        const contentRef = useRef<HTMLDivElement>(null);
        const [height, setHeight] = useState("0px");

        useEffect(() => {
          if (isOpen && contentRef.current) {
            setHeight(`${contentRef.current.scrollHeight}px`);
          } else {
            setHeight("0px");
          }
        }, [isOpen]);

        return (
          <div className="border-b" key={setting.key}>
            <div
              className="flex items-center py-3 justify-between hover:underline cursor-pointer transition"
              onClick={() => handleToggle(setting.key)}
            >
              <div className="flex items-center gap-2">
                {setting.icon}
                <h1>{setting.name}</h1>
              </div>
              <IoIosArrowDown
                className={`transition-transform duration-200 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </div>

            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out`}
              style={{ maxHeight: height }}
            >
              <div ref={contentRef} className="p-4">
                {setting.component ? (
                  setting.component
                ) : (
                  <>
                    <p className="text-gray-600 text-sm">
                      {setting.description}
                    </p>
                    <button className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition">
                      Add
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AgentSetting;