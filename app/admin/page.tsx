'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Upload, FileText, Loader2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check (in production, use proper authentication)
    if (password === 'vedic2024') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Please select a valid PDF file');
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to extract PDF');
      }

      const data = await response.json();
      setExtractedText(data.text);
    } catch (err) {
      setError('Error extracting PDF: ' + (err as Error).message);
    } finally {
      setIsExtracting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <div className="p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-6">
              Admin Access
            </h1>

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-sm text-purple-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400"
                  placeholder="Enter admin password"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 font-medium transition-all"
              >
                Login
              </button>
            </form>

            <Link href="/" className="block mt-4 text-center text-purple-300 hover:text-purple-200 text-sm">
              Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/5 backdrop-blur-lg border border-white/10 hover:border-purple-400/50 transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-purple-200 mt-1">Upload and manage Sanskrit chants</p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/50 hover:bg-red-600/30 text-red-300 transition-all"
          >
            Logout
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* PDF Upload Section */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
            <h2 className="text-xl font-semibold mb-4 text-purple-300 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Sanskrit PDF
            </h2>

            <div className="mb-4">
              <label className="block w-full">
                <div className="border-2 border-dashed border-purple-400/30 rounded-xl p-8 text-center hover:border-purple-400/60 transition-all cursor-pointer">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                  <p className="text-purple-200 mb-2">
                    {selectedFile ? selectedFile.name : 'Click to select PDF file'}
                  </p>
                  <p className="text-sm text-purple-300/70">
                    Upload a PDF with Sanskrit text
                  </p>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            {selectedFile && (
              <button
                onClick={handleExtract}
                disabled={isExtracting}
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Extract Text
                  </>
                )}
              </button>
            )}
          </div>

          {/* Extracted Text Preview */}
          <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10">
            <h2 className="text-xl font-semibold mb-4 text-purple-300">
              Extracted Text Preview
            </h2>

            <div className="h-96 overflow-y-auto p-4 rounded-lg bg-black/30 font-mono text-sm">
              {extractedText ? (
                <pre className="whitespace-pre-wrap text-purple-100">{extractedText}</pre>
              ) : (
                <p className="text-purple-300/50 text-center mt-20">
                  No text extracted yet. Upload a PDF to begin.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10"
        >
          <h3 className="text-lg font-semibold mb-3 text-purple-300">How to Use</h3>
          <ol className="space-y-2 text-purple-200 text-sm">
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">1.</span>
              <span>Upload a PDF file containing Sanskrit text with proper Unicode encoding</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">2.</span>
              <span>Click &quot;Extract Text&quot; to process the PDF and extract Sanskrit content</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">3.</span>
              <span>Review the extracted text and manually annotate syllables with swara notation</span>
            </li>
            <li className="flex gap-3">
              <span className="text-cyan-400 font-bold">4.</span>
              <span>Save the annotated chant to make it available in the practice section</span>
            </li>
          </ol>
        </motion.div>
      </div>
    </div>
  );
}
