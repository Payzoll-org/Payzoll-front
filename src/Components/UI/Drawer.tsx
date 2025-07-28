import React from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({ open, onClose, title, children }) => {
  return (
    <div
      className={`fixed left-0 right-0 bottom-0 z-50 transition-transform duration-300 ${
        open ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ pointerEvents: open ? "auto" : "none" }}
    >
      <div className="bg-white rounded-t-2xl shadow-2xl p-6 max-h-[70vh] overflow-y-auto border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl px-2"
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>
        {children}
      </div>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-[-1] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        style={{ pointerEvents: open ? "auto" : "none" }}
      />
    </div>
  );
};

export default Drawer; 