import React from "react";
import { Modal } from "../ui/Modal";
import { Heart } from "lucide-react";

export const SupportModal = ({ isOpen, onClose, allowClickOutside = true }) => (
  <Modal
    isOpen={isOpen}
    title="Support MacroGG"
    onClose={onClose}
    allowClickOutside={allowClickOutside}
  >
    <div className="space-y-4">
      <p>
        MacroGG is free to use. If it helps you stay on track, you can support
        continued development through the protein powder fund.
      </p>
      <div className="dialog-surface">
        <p className="dialog-muted">
          Contributions help maintain servers and add new features.
        </p>
      </div>
      <a
        href="https://ko-fi.com/macrogg"
        target="_blank"
        rel="noopener noreferrer"
        className="button button-primary w-full"
      >
        <Heart size={16} /> Support on Ko-fi
      </a>
    </div>
  </Modal>
);
