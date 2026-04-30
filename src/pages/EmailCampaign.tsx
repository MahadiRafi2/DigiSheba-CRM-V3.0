import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { Mail, Send, Users, FileText, AlertCircle, CheckCircle2, Loader2, Info, X } from 'lucide-react';

export default function EmailCampaign() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'customers' | 'manual'>('customers');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    manualEmails: ''
  });

  const emailList = useMemo(() => {
    if (!formData.manualEmails) return [];
    return formData.manualEmails
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
  }, [formData.manualEmails]);

  const validatedEmails = useMemo(() => {
    return emailList.map(email => ({
      email,
      isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }));
  }, [emailList]);

  const validCount = validatedEmails.filter(e => e.isValid).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.body) return;

    const emailsToSend = validatedEmails.filter(e => e.isValid).map(e => e.email);
    if (activeTab === 'manual' && emailsToSend.length === 0) {
      setStatus({ type: 'error', text: 'No valid emails found.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    const endpoint = activeTab === 'customers' 
      ? '/api/email-campaign/customers' 
      : '/api/email-campaign/manual';

    const payload = activeTab === 'customers'
      ? { subject: formData.subject, body: formData.body }
      : { 
          subject: formData.subject, 
          body: formData.body, 
          emails: emailsToSend
        };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', text: `Campaign sent successfully to ${data.count} recipients!` });
        if (activeTab === 'manual') setFormData({ ...formData, manualEmails: '' });
      } else {
        setStatus({ type: 'error', text: data.error || 'Failed to send campaign' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: 'An unexpected error occurred.' });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Email Campaigns</h1>
          <p className="text-zinc-500">Send bulk emails to your customers or external lists.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-zinc-100">
          <button 
            onClick={() => setActiveTab('customers')}
            className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'customers' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Users size={18} />
            All Customers
          </button>
          <button 
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            <Send size={18} />
            Manual Bulk
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {status && (
            <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="text-sm font-medium">{status.text}</p>
            </div>
          )}

          <div className="space-y-4">
            {activeTab === 'manual' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Recipient Emails</label>
                  <textarea 
                    required
                    placeholder="Paste emails separated by commas or new lines..."
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px] font-mono text-sm"
                    value={formData.manualEmails}
                    onChange={e => setFormData({ ...formData, manualEmails: e.target.value })}
                  />
                  <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Info size={12} />
                    Example: help@google.com, me@domain.com or one per line.
                  </p>
                </div>

                {emailList.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Detected Emails ({validCount}/{emailList.length} valid)</h3>
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, manualEmails: '' })}
                        className="text-xs font-bold text-red-500 hover:text-red-600"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      {validatedEmails.map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold shadow-sm ${
                            item.isValid 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-red-50 text-red-700 border-red-100'
                          }`}
                        >
                          <Mail size={12} />
                          {item.email}
                          {!item.isValid && <AlertCircle size={12} title="Invalid email format" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Email Subject</label>
              <input 
                type="text" 
                required
                placeholder="Special Offer Just For You!"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Message Body</label>
              <textarea 
                required
                placeholder="Write your email content here..."
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 min-h-[240px] leading-relaxed"
                value={formData.body}
                onChange={e => setFormData({ ...formData, body: e.target.value })}
              />
              {activeTab === 'customers' && (
                <p className="text-[10px] text-zinc-400">
                  Tip: Use <code className="bg-zinc-100 px-1 rounded">{"{{name}}"}</code> to insert the customer's name.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
            <div className="text-xs text-zinc-400 max-w-md">
              Please ensure your SMTP settings are correctly configured in Settings before sending. 
              Bulk sending may take some time depending on the list size.
            </div>
            <button 
              type="submit"
              disabled={loading || (activeTab === 'manual' && !formData.manualEmails)}
              className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {loading ? 'Sending Campaign...' : 'Send Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
