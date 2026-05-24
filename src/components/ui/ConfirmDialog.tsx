"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from "react";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface PromptOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
}

export function usePrompt() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("usePrompt must be used within a ConfirmProvider");
  }
  return context.prompt;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  // Confirm state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions>({ message: "" });
  const [resolveConfirmPromise, setResolveConfirmPromise] = useState<(value: boolean) => void>();

  // Prompt state
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptOptions, setPromptOptions] = useState<PromptOptions>({ message: "" });
  const [promptValue, setPromptValue] = useState("");
  const [resolvePromptPromise, setResolvePromptPromise] = useState<(value: string | null) => void>();
  
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmOptions({
        title: opts.title || "提示",
        message: opts.message,
        confirmText: opts.confirmText || "确定",
        cancelText: opts.cancelText || "取消",
        danger: opts.danger || false,
      });
      setResolveConfirmPromise(() => resolve);
      setIsConfirmOpen(true);
    });
  }, []);

  const prompt = useCallback((opts: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptOptions({
        title: opts.title || "提示",
        message: opts.message,
        defaultValue: opts.defaultValue || "",
        confirmText: opts.confirmText || "确定",
        cancelText: opts.cancelText || "取消",
      });
      setPromptValue(opts.defaultValue || "");
      setResolvePromptPromise(() => resolve);
      setIsPromptOpen(true);
    });
  }, []);

  useEffect(() => {
    if (isPromptOpen && inputRef.current) {
      // Small delay to ensure render is complete before focus
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isPromptOpen]);

  const handleConfirmClose = (value: boolean) => {
    setIsConfirmOpen(false);
    if (resolveConfirmPromise) {
      resolveConfirmPromise(value);
    }
  };

  const handlePromptClose = (submit: boolean) => {
    setIsPromptOpen(false);
    if (resolvePromptPromise) {
      resolvePromptPromise(submit ? promptValue : null);
    }
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePromptClose(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handlePromptClose(false);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      
      {/* Confirm Dialog */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {confirmOptions.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {confirmOptions.message}
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
              >
                {confirmOptions.cancelText}
              </button>
              <button
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  confirmOptions.danger
                    ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                }`}
              >
                {confirmOptions.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Dialog */}
      {isPromptOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {promptOptions.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {promptOptions.message}
              </p>
              <input
                ref={inputRef}
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={handlePromptKeyDown}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => handlePromptClose(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
              >
                {promptOptions.cancelText}
              </button>
              <button
                onClick={() => handlePromptClose(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {promptOptions.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
