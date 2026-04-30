import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

export default function WooCommerce() {
  const [step, setStep] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setStep(3);
    }, 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-zinc-900">WooCommerce Integration</h1>
        <p className="text-zinc-500 mt-2">Sync your orders and customers automatically or via CSV.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* API Sync Card */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
            <RefreshCw size={24} />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-2">API Real-time Sync</h3>
          <p className="text-zinc-500 text-sm mb-6">Connect your store via WooCommerce REST API for automatic order imports.</p>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Store URL</label>
              <input type="text" placeholder="https://yourstore.com" className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Consumer Key</label>
              <input type="password" placeholder="ck_..." className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Consumer Secret</label>
              <input type="password" placeholder="cs_..." className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>

          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSyncing ? <RefreshCw className="animate-spin" size={20} /> : 'Connect & Sync'}
          </button>
        </div>

        {/* CSV Import Card */}
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
            <Upload size={24} />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-2">CSV Bulk Import</h3>
          <p className="text-zinc-500 text-sm mb-6">Export your WooCommerce orders to CSV and upload them here.</p>
          
          <div className="border-2 border-dashed border-zinc-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center mb-8">
            <FileText size={48} className="text-zinc-300 mb-4" />
            <p className="text-sm text-zinc-600 mb-2">Drag and drop your CSV file here</p>
            <p className="text-xs text-zinc-400">or click to browse files</p>
          </div>

          <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
            <Upload size={20} />
            Upload CSV
          </button>
        </div>
      </div>

      {/* Import Status / Preview */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900">Sync Complete</h4>
                <p className="text-sm text-zinc-500">124 new orders imported successfully.</p>
              </div>
            </div>
            <button className="text-sm font-bold text-emerald-600 hover:underline flex items-center gap-1">
              View Sales <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-50">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">New Customers</p>
              <p className="text-xl font-bold text-zinc-900">42</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-zinc-900">৳3,450</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Duplicates Skipped</p>
              <p className="text-xl font-bold text-zinc-900">12</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
