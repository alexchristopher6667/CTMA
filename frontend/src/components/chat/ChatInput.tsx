import React, { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import { useDiscussion } from '../../context/DiscussionContext';

export const ChatInput: React.FC = () => {
  const { running, startDiscussion, stopDiscussion } = useDiscussion();
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (running) {
      stopDiscussion();
      return;
    }
    const q = prompt.trim();
    if (!q) return;
    setPrompt('');
    startDiscussion(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-3 sm:px-4 md:px-8 pb-3 sm:pb-6 space-y-2.5">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-end rounded-2xl bg-[#141a26]/95 border border-[#2c374b] p-2.5 shadow-glass focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all"
      >
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a technical or research question... (Shift+Enter for newline)"
          rows={1}
          className="w-full resize-none bg-transparent px-3 py-2 text-sm text-[#e5e9f2] placeholder-[#6b778d] focus:outline-none max-h-44 leading-relaxed"
        />

        <div className="flex items-center gap-2 flex-shrink-0 pl-2">
          {running ? (
            <button
              type="button"
              onClick={stopDiscussion}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="motion-press accent-fill flex items-center justify-center w-9 h-9 rounded-xl text-black font-bold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              title="Start Team Discussion"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
