import React, { useState, useCallback, useEffect, useRef } from 'react';
import TurndownService from 'turndown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clipboard, 
  MagicWand, 
  Trash2, 
  Moon, 
  Sun, 
  Copy, 
  Download, 
  Printer, 
  FileText, 
  UploadCloud, 
  Check, 
  Zap,
  MoreVertical,
  Type,
  Link,
  MessageSquare,
  Sparkles,
  Maximize2,
  Table as TableIcon,
  X,
  Globe,
  Menu,
  Coffee,
  Info,
  Heart,
  BookOpen
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for class merging */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Utilities ---

const extractUrls = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return Array.from(new Set(text.match(urlRegex)));
};

const markdownTableToCSV = (markdown: string) => {
  const lines = markdown.trim().split('\n');
  return lines
    .filter(line => line.includes('|') && !line.includes('---'))
    .map(line => line.split('|').filter(cell => cell.trim() !== '').map(cell => `"${cell.trim()}"`).join(','))
    .join('\n');
};

// --- Turndown Service Setup ---
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-',
  strongDelimiter: '**'
});

// Custom rules for better conversion
turndownService.addRule('stripUnwanted', {
  filter: ['script', 'style', 'nav', 'header', 'footer', 'aside'],
  replacement: () => ''
});

// --- Components ---

const Toast = ({ message, type = 'success', onClose }: { message: string, type?: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn(
        "fixed bottom-12 right-6 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-[100] flex items-center gap-2",
        type === 'success' ? "bg-slate-900 text-white" : "bg-red-500 text-white"
      )}
    >
      {type === 'success' ? <Check size={16} /> : <Zap size={16} />}
      {message}
    </motion.div>
  );
};

const Lightbox = ({ src, onClose }: { src: string, onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
    className="fixed inset-0 z-[200] bg-editorial-text/95 p-10 flex items-center justify-center cursor-zoom-out backdrop-blur-sm"
  >
    <motion.img 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      src={src} 
      className="max-w-full max-h-full object-contain border-8 border-white shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    />
    <button className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors">
      <X size={40} strokeWidth={1} />
    </button>
  </motion.div>
);

const FloatingToolbar = ({ position, selection, onAction }: { position: { x: number, y: number }, selection: string, onAction: (action: string) => void }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9, y: 5 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    style={{ left: position.x, top: position.y }}
    className="fixed z-[150] -translate-x-1/2 -translate-y-full mb-4 flex items-center bg-editorial-text text-white shadow-2xl border border-editorial-border p-1 divide-x divide-white/10"
  >
    <ToolbarBtn icon={<Copy size={14} />} onClick={() => onAction('copy')} />
    <ToolbarBtn icon={<Zap size={14} className="text-brand-primary" />} onClick={() => onAction('highlight')} />
    <ToolbarBtn icon={<Sparkles size={14} className="text-amber-400" />} onClick={() => onAction('polish')} label="Polish" />
    <ToolbarBtn icon={<MessageSquare size={14} className="text-blue-400" />} onClick={() => onAction('summarize')} label="Summarize" />
    <ToolbarBtn icon={<BookOpen size={14} className="text-green-400" />} onClick={() => onAction('explain')} label="Explain" />
    <ToolbarBtn icon={<Download size={14} />} onClick={() => onAction('export')} />
  </motion.div>
);

const ToolbarBtn = ({ icon, onClick, label }: { icon: React.ReactNode, onClick: () => void, label?: string }) => (
  <button onClick={onClick} className="px-3 py-2 hover:bg-white/10 transition-colors flex items-center gap-2">
    {icon}
    {label && <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>}
  </button>
);

const IngestModal = ({ isOpen, onClose, onIngest, isLoading }: { isOpen: boolean, onClose: () => void, onIngest: (url: string) => void, isLoading: boolean }) => {
  const [url, setUrl] = useState('');
  
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] bg-editorial-text/40 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md p-8 border border-editorial-border shadow-2xl"
      >
        <div className="mb-6">
          <span className="font-serif italic text-sm text-brand-primary border-b border-brand-primary pb-1 mb-3 inline-block">The Ingestion Pipeline</span>
          <h2 className="text-2xl font-serif">Fetch External Source</h2>
          <p className="text-xs text-slate-500 mt-2">Enter a URL to strip its content and convert to structured Markdown.</p>
        </div>
        <input 
          autoFocus
          type="url"
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full h-12 px-4 border border-editorial-border bg-editorial-bg dark:bg-slate-950 outline-none focus:border-brand-primary transition-colors text-sm mb-6"
        />
        <div className="flex justify-end gap-3">
          <HeaderButton label="Cancel" onClick={onClose} />
          <HeaderButton 
            primary 
            label={isLoading ? "Processing..." : "Engage Ingestion"} 
            onClick={() => onIngest(url)} 
            disabled={isLoading || !url}
            icon={isLoading ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> : <Sparkles size={14} />}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

const AboutModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[200] bg-editorial-text/60 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-2xl p-10 border border-editorial-border shadow-2xl overflow-y-auto max-h-[80vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-serif">Why Bindel?</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-white"><X size={24} /></button>
        </div>
        <div className="space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p><strong>The Goal:</strong> Bindel was built to bridge the gap between raw, messy web scraping and clean, high-academic writing. Traditional note-taking apps require too much formatting and manual intervention. Bindel automates the ingestion pipeline.</p>
          <p><strong>Why It's Different:</strong> Bindel acts as a smart canvas. It strips away distractions, automatically generates footnotes from injected URLs, and seamlessly integrates with Google Gemini to refine your prose into "excellent writing" with a single click. It's a reading and writing mode that actually respects your focus.</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SliceMenu = ({ isOpen, onClose, onClear, onExport, onAbout, isSupporter, onSupport }: any) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[150] bg-black/20 backdrop-blur-sm" />
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }} className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-950 border-r border-editorial-border z-[160] flex flex-col shadow-2xl">
            <div className="p-8 border-b border-editorial-border flex justify-between items-center">
              <h2 className="text-xl font-serif">Menu Slice</h2>
              <button onClick={onClose} className="hover:text-brand-primary transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 p-6 space-y-2 overflow-y-auto">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">File Operations</div>
              <MenuButton icon={<Download size={16} />} label="Export Markdown" onClick={onExport} />
              <MenuButton icon={<Trash2 size={16} />} label="Clear Canvas" onClick={onClear} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" />
              
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-8 mb-4">Application</div>
              <MenuButton icon={<Info size={16} />} label="About Bindel" onClick={onAbout} />
            </div>
            <div className="p-6 border-t border-editorial-border bg-editorial-bg dark:bg-slate-900/50">
              {isSupporter ? (
                <div className="flex items-center gap-3 text-brand-primary p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-lg">
                  <Heart size={20} className="fill-brand-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider">Premium Supporter</span>
                </div>
              ) : (
                <button onClick={onSupport} className="w-full flex items-center justify-center gap-2 p-3 bg-[#FFDD00] text-black font-bold hover:scale-[1.02] transition-transform rounded-lg shadow-lg">
                  <Coffee size={18} /> Buy me a Coffee
                </button>
              )}
              <p className="text-[10px] text-slate-500 mt-3 text-center leading-relaxed">Support the project and unlock unlimited AI polishes & priority processing.</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const MenuButton = ({ icon, label, onClick, className }: any) => (
  <button onClick={onClick} className={cn("w-full flex items-center gap-3 p-3 text-sm font-medium hover:bg-editorial-bg dark:hover:bg-slate-900 transition-colors rounded-md text-left", className)}>
    {icon} {label}
  </button>
);

export default function App() {
  // --- States ---
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSupporter, setIsSupporter] = useState(false);
  const [fontSize, setFontSize] = useState('text-base');
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [highlights, setHighlights] = useState<{ id: string, text: string }[]>([]);
  const [toasts, setToasts] = useState<{ id: number, message: string, type?: 'success' | 'error' }[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number, y: number } | null>(null);
  const [selection, setSelection] = useState('');
  
  const outputRef = useRef<HTMLDivElement>(null);
  const editAreaRef = useRef<HTMLTextAreaElement>(null);

  // --- Handlers ---

  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setToolbarPos(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Only show if selection is within the output panel
    if (outputRef.current && outputRef.current.contains(sel.anchorNode)) {
      setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top });
      setSelection(sel.toString());
    } else {
      setToolbarPos(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [handleSelection]);

  const handleToolbarAction = (action: string) => {
    if (action === 'copy') {
      copyToClipboard(selection, 'Selection');
    } else if (action === 'highlight') {
      const id = Date.now().toString();
      setHighlights(prev => [...prev, { id, text: selection }]);
      
      // Inject highlight into output
      const highlightedText = `<mark class="highlight-yellow">${selection}</mark>`;
      setOutput(prev => prev.replace(selection, highlightedText));
      showToast('Text highlighted');
    } else if (action === 'polish') {
      aiPolish(selection, true, "Improve the following text to be more academic, professional, and clear. Maintain all factual information and core meaning. Output ONLY the improved text.");
    } else if (action === 'summarize') {
      aiPolish(selection, true, "Provide a concise summary of the following text. Output ONLY the summary.");
    } else if (action === 'explain') {
      aiPolish(selection, true, "Explain the following text simply and clearly, as if to a beginner. Output ONLY the explanation.");
    } else if (action === 'export') {
      const blob = new Blob([selection], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'snippet.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
    setToolbarPos(null);
    window.getSelection()?.removeAllRanges();
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newTheme);
  };

  const toggleFontSize = () => {
    const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl'];
    const nextIndex = (sizes.indexOf(fontSize) + 1) % sizes.length;
    setFontSize(sizes[nextIndex]);
    showToast(`Font size: ${sizes[nextIndex].replace('text-', '')}`);
  };

  const cleanPlainText = (text: string) => {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  };

  const convertContent = useCallback((rawText?: string) => {
    const targetInput = rawText !== undefined ? rawText : input;
    if (!targetInput.trim()) return;

    setIsConverting(true);
    
    // Simulate slight delay for "magic" feel
    setTimeout(() => {
      try {
        let markdown = '';
        const lowerInput = targetInput.toLowerCase();
        
        // Intelligent Recognition
        const isHtml = targetInput.includes('<') && (targetInput.includes('</') || lowerInput.includes('<html') || lowerInput.includes('<div') || lowerInput.includes('<p'));

        if (isHtml) {
          markdown = turndownService.turndown(targetInput);
        } else {
          markdown = cleanPlainText(targetInput);
        }

        // Feature: Automatically generate collapsible footnotes for URLs
        const urls = extractUrls(markdown); // Extract from markdown to be sure
        if (urls.length > 0) {
          let processedMarkdown = markdown;
          const footnoteItems: string[] = [];

          urls.forEach((url, index) => {
            const footnoteId = index + 1;
            // Replace URL with [URL](URL)<sup>[n]</sup> and add unique link
            const urlPattern = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            processedMarkdown = processedMarkdown.replace(urlPattern, `[${url}](${url})<sup id="ref-${footnoteId}">[${footnoteId}](#fn-${footnoteId})</sup>`);
            footnoteItems.push(`<li id="fn-${footnoteId}">${url} <a href="#ref-${footnoteId}">↩</a></li>`);
          });

          const footnotesSection = `\n\n---\n\n<details class="footnotes-section">\n<summary style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:var(--color-brand-primary);cursor:pointer;list-style:none;">Source References & Footnotes</summary>\n\n<ol>\n${footnoteItems.join('\n')}\n</ol>\n\n</details>`;
          markdown = processedMarkdown + footnotesSection;
        }

        setOutput(markdown);
        setViewMode('view');
        showToast('Document transformed');
      } catch (err) {
        console.error(err);
        showToast('Transformation failed', 'error');
      } finally {
        setIsConverting(false);
      }
    }, 400);
  }, [input]);

  const clearContent = () => {
    if (output.trim() && !window.confirm('Wipe canvas?')) return;
    setInput('');
    setOutput('');
    showToast('Canvas cleared');
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard`);
    } catch (err) {
      showToast('Failed to copy', 'error');
    }
  };

  const downloadMarkdown = () => {
    if (!output.trim()) return;
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Download started');
  };

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
      
      const pastedData = e.clipboardData?.getData('text');
      if (pastedData) {
        setInput(pastedData);
        convertContent(pastedData);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [convertContent]);

  const ingestFromUrl = async (url: string) => {
    if (!url) return;

    setIsExtracting(true);
    showToast('Ingesting content...');
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // We combine title and content
      const compositeContent = `<h1>${data.title}</h1>\n\n${data.content}`;
      setInput(compositeContent);
      setIsModalOpen(false);
      convertContent(compositeContent);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to ingest URL', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const aiPolish = async (targetText?: string, isSnippet = false, customPrompt?: string) => {
    const textToPolish = targetText || input;
    if (!textToPolish.trim()) return;

    setIsPolishing(true);
    showToast(isSnippet ? 'AI is processing snippet...' : 'AI is polishing writing...');

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = customPrompt || "You are an expert research editor. Improve the following text to be more academic, professional, and clear. Maintain all factual information and core meaning. Use high-modern academic structure. If it's HTML, return proper Markdown. Output ONLY the improved text.";
      
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${prompt}\n\nText:\n${textToPolish}`,
      });

      const polished = response.text;
      if (isSnippet && targetText) {
        setOutput(prev => prev.replace(targetText, polished));
        showToast('Snippet polished');
      } else {
        setInput(polished);
        convertContent(polished);
        showToast('Full document polished');
      }
    } catch (err) {
      console.error(err);
      showToast('AI polishing failed', 'error');
    } finally {
      setIsPolishing(false);
    }
  };

  // --- Effects ---

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    const savedContent = localStorage.getItem('research_output');
    if (savedContent) setOutput(savedContent);
    const savedInput = localStorage.getItem('research_input');
    if (savedInput) setInput(savedInput);
  }, []);

  useEffect(() => {
    localStorage.setItem('research_output', output);
    localStorage.setItem('research_input', input);
  }, [output, input]);

  // --- Drop Zone Logic ---
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInput(text);
        convertContent(text);
        showToast(`Imported: ${file.name}`);
      };
      reader.readAsText(file);
    }
  };

  // --- Render Helpers ---
  const charCount = input.length;
  const wordCount = output.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className={cn(
      "h-screen flex flex-col md:grid md:grid-cols-1 md:grid-rows-[100px_1fr_40px] transition-colors duration-300",
      isDark ? "bg-slate-950 text-slate-100" : "bg-editorial-bg text-editorial-text"
    )}>
      {/* Header */}
      <header className="h-[100px] col-span-full px-6 md:px-20 flex items-center justify-between border-b border-editorial-border bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-brand-primary">
            <Menu size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl tracking-tighter uppercase font-serif">Bindel</h1>
            <div className="text-[9px] uppercase tracking-[4px] opacity-50 mt-1">Unified Smart Canvas</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center bg-editorial-pane dark:bg-slate-900 p-1 border border-editorial-border dark:border-slate-800 mr-2">
            <button 
              onClick={() => setViewMode('view')}
              className={cn("px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all", viewMode === 'view' ? "bg-white dark:bg-slate-800 shadow-sm text-brand-primary" : "text-slate-500 hover:text-slate-700")}
            >
              Reader
            </button>
            <button 
              onClick={() => setViewMode('edit')}
              className={cn("px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all", viewMode === 'edit' ? "bg-white dark:bg-slate-800 shadow-sm text-brand-primary" : "text-slate-500 hover:text-slate-700")}
            >
              Editor
            </button>
          </div>

          <div className="flex items-center gap-2">
             <HeaderButton 
              icon={isPolishing ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-amber-400 border-t-transparent" /> : <Sparkles size={16} className="text-amber-500" />} 
              onClick={() => aiPolish()} 
              disabled={isPolishing || !input}
              label="Excellent Writing"
              className="px-6"
            />
            <HeaderButton 
              active 
              icon={isExtracting ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-400 border-t-transparent" /> : <Globe size={16} />} 
              onClick={() => setIsModalOpen(true)} 
              label="Ingest" 
              disabled={isExtracting}
              primary
            />
          </div>

          <div className="flex items-center ml-2 pl-4 border-l border-editorial-border dark:border-slate-800 gap-1.5">
            <HeaderButton icon={<Type size={16} />} onClick={toggleFontSize} tooltip="Text Size" />
            <HeaderButton icon={isDark ? <Sun size={16} /> : <Moon size={16} />} onClick={toggleTheme} tooltip="Toggle Theme" />
            <HeaderButton icon={<Trash2 size={16} />} onClick={clearContent} tooltip="Clear Canvas" />
            <HeaderButton icon={<Download size={16} />} onClick={downloadMarkdown} disabled={!output} tooltip="Export .md" />
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main 
        className="flex-1 overflow-hidden relative bg-white dark:bg-slate-950"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Magic Drop Zone Overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-brand-primary/10 backdrop-blur-xl flex items-center justify-center pointer-events-none"
            >
               <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 p-12 border-2 border-dashed border-brand-primary shadow-2xl flex flex-col items-center gap-6 text-center max-w-sm"
              >
                <div className="w-20 h-20 bg-brand-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/30">
                  <UploadCloud size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold mb-2">Ingest Fragment</h3>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 opacity-80">Drop content anywhere to transform</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-full overflow-y-auto px-6 py-12 md:py-20 scroll-smooth">
          <div className="max-w-[1000px] mx-auto min-h-full">
            {output ? (
              viewMode === 'view' ? (
                <div ref={outputRef} className={cn("markdown-body relative group animate-in fade-in slide-in-from-bottom-4 duration-700", fontSize)}>
                   <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        img: ({ node, ...props }) => (
                          <div className="my-10 flex flex-col items-center">
                            <img 
                              {...props} 
                              onClick={() => setLightboxSrc(props.src || null)}
                              className="cursor-zoom-in hover:shadow-2xl transition-all duration-500 rounded-sm border border-editorial-border" 
                            />
                            {props.alt && <span className="text-[10px] uppercase tracking-widest mt-4 opacity-50 font-bold">{props.alt}</span>}
                          </div>
                        ),
                        table: ({ node, children, ...props }) => {
                          const tableRef = useRef<HTMLTableElement>(null);
                          return (
                            <div className="relative group/table my-10 overflow-x-auto border border-editorial-border p-4 bg-editorial-bg/30">
                              <table {...props} ref={tableRef} className="w-full">{children}</table>
                              <button 
                                onClick={() => {
                                  if (tableRef.current) {
                                    const csv = markdownTableToCSV(output); 
                                    copyToClipboard(csv, 'Table as CSV');
                                  }
                                }}
                                className="absolute top-2 right-2 opacity-0 group-hover/table:opacity-100 transition-opacity bg-editorial-text text-white p-2 text-[9px] font-bold uppercase tracking-wider"
                              >
                                <TableIcon size={12} className="inline mr-1" /> Copy CSV
                              </button>
                            </div>
                          );
                        }
                      }}
                    >
                      {output}
                    </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  ref={editAreaRef}
                  value={output}
                  onChange={(e) => setOutput(e.target.value)}
                  className={cn("w-full h-[80vh] resize-none bg-transparent outline-none font-mono leading-relaxed border-l border-editorial-border pl-8", fontSize)}
                />
              )
            ) : (
              <div 
                className="h-[60vh] flex flex-col items-center justify-center text-center group cursor-pointer"
                onClick={() => {
                  try {
                    navigator.clipboard.readText().then(text => {
                      if (text) {
                        setInput(text);
                        convertContent(text);
                      }
                    });
                  } catch(e) {
                    showToast('Paste content to begin');
                  }
                }}
              >
                <div className="w-24 h-24 mb-8 relative">
                   <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border border-brand-primary/20 rounded-full"
                   />
                   <div className="absolute inset-4 bg-brand-primary/5 rounded-full flex items-center justify-center group-hover:bg-brand-primary/10 transition-colors">
                      <Sparkles size={32} className="text-brand-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                   </div>
                </div>
                <h2 className="text-3xl font-serif mb-4">Paste to Begin</h2>
                <p className="text-[11px] uppercase tracking-[3px] text-slate-400 max-w-sm line-height-relaxed">
                  Universal Workspace for Researchers.<br/>
                  Drop files, paste urls, or use clipboard.
                </p>
                <div className="mt-8 flex items-center gap-2 text-slate-300">
                   <HeaderButton icon={<Clipboard size={14} />} onClick={() => {}} label="Auto-detect Active" className="border-none bg-transparent h-auto opacity-50 cursor-default" />
                </div>
                <label className="mt-6 flex items-center gap-2 cursor-pointer text-brand-primary border border-brand-primary/30 px-6 py-3 rounded-lg hover:bg-brand-primary/10 transition-colors font-bold uppercase tracking-wider text-[11px]">
                  <UploadCloud size={16} /> Upload Document (.txt, .md, .html)
                  <input type="file" accept=".txt,.md,.html" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const text = event.target?.result as string;
                        setInput(text);
                        convertContent(text);
                        showToast(`Imported: ${file.name}`);
                      };
                      reader.readAsText(file);
                    }
                  }} />
                </label>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="h-10 col-span-full border-t border-editorial-border px-10 flex items-center justify-between bg-white dark:bg-slate-950 text-[9px] text-slate-400 uppercase tracking-widest font-bold shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            Engine: <span className="text-brand-primary font-black italic">V.II.Alpha</span>
            <span className="bg-editorial-text text-white px-2 py-0.5 text-[8px] rounded-none">Active</span>
          </div>
          <span className="opacity-20">/</span>
          <span className="flex items-center gap-1.5"><Zap size={10} className="text-brand-primary" /> Auto-Formatting Engaged</span>
        </div>
        <div className="flex items-center gap-6">
          <span>Words: {wordCount}</span>
          <span className="opacity-20">/</span>
          <span>Chars: {charCount.toLocaleString()}</span>
          <span className="opacity-20">/</span>
          <span>Integrity: 99.9%</span>
        </div>
      </footer>

      {/* Toasts */}
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast 
            key={toast.id} 
            message={toast.message} 
            type={toast.type} 
            onClose={() => removeToast(toast.id)} 
          />
        ))}
        {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
        {toolbarPos && <FloatingToolbar position={toolbarPos} selection={selection} onAction={handleToolbarAction} />}
        <IngestModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onIngest={ingestFromUrl} 
          isLoading={isExtracting} 
        />
        <SliceMenu 
          isOpen={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)} 
          onClear={clearContent} 
          onExport={downloadMarkdown} 
          onAbout={() => { setIsMenuOpen(false); setIsAboutOpen(true); }}
          isSupporter={isSupporter}
          onSupport={() => { window.open('https://buymeacoffee.com/bindel', '_blank'); setIsSupporter(true); showToast('Thanks for supporting!'); }}
        />
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      </AnimatePresence>
    </div>
  );
}

const HeaderButton = ({ 
  icon, 
  onClick, 
  label, 
  tooltip, 
  primary = false, 
  active = false,
  disabled = false,
  className
}: { 
  icon?: React.ReactNode, 
  onClick: () => void, 
  label?: string, 
  tooltip?: string,
  primary?: boolean,
  active?: boolean,
  disabled?: boolean,
  className?: string
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={tooltip}
    className={cn(
      "h-10 px-4 flex items-center justify-center gap-2 border border-editorial-border transition-all active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed",
      "text-[11px] font-bold uppercase tracking-wider",
      primary 
        ? "bg-brand-primary text-white border-brand-primary hover:bg-brand-hover shadow-sm" 
        : "text-editorial-text dark:text-slate-400 hover:bg-editorial-bg dark:hover:bg-slate-900 bg-white dark:bg-slate-950",
      className
    )}
  >
    {icon}
    {label && <span>{label}</span>}
  </button>
);

