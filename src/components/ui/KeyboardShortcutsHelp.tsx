import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Quick Actions',
      items: [
        { key: 'Tab', description: 'Open quick resource selection' },
        { key: 'Tab', modifier: 'while open', description: 'Navigate to next option' },
        { key: 'Shift + Tab', modifier: 'while open', description: 'Navigate to previous option' },
        { key: 'Enter', modifier: 'while open', description: 'Select current option' },
        { key: 'Backspace', modifier: 'while open', description: 'Go back one level' },
        { key: '1-9', modifier: 'categories only', description: 'Quick select by number' },
        { key: 'Escape', modifier: 'while open', description: 'Close quick selection' }
      ]
    },
    {
      category: 'General',
      items: [
        { key: '?', description: 'Show this help dialog' },
        { key: 'Escape', description: 'Close dialogs and overlays' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <Keyboard size={20} />
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {shortcuts.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <kbd className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm font-mono">
                        {shortcut.key}
                      </kbd>
                      {shortcut.modifier && (
                        <span className="text-xs text-gray-500">
                          {shortcut.modifier}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-700">
                      {shortcut.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            Keyboard shortcuts work when not typing in input fields
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;