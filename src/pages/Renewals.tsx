import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Sale } from '../types';
import { Mail, Search, Calendar, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Renewals() {
  const { token } = useAuthStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [sending, setSending] = useState<number | null>(null);
  const [status, setStatus] = useState<{ id: number, type: 'success' | 'error', text: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'list' | 'templates'>('list');
  const [renewalSettings, setRenewalSettings] = useState({
    day30_subject: '', day30_body: '',
    day15_subject: '', day15_body: '',
    expired_subject: '', expired_body: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/sales', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      // Filter Approved orders
      setSales(data.filter((s: Sale) => s.status === 'Approved'));
    });

    fetch('/api/settings/renewal-emails', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(setRenewalSettings);
  }, [token]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/renewal-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(renewalSettings)
      });
      if (res.ok) {
        alert('Settings saved successfully!');
      }
    } catch (err) {
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  const filteredSales = sales.filter(sale => 
    sale.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const sendEmail = async (sale: Sale) => {
    setSending(sale.id);
    setStatus(null);
    try {
      const res = await fetch(`/api/sales/${sale.id}/send-renewal-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ id: sale.id, type: 'success', text: 'Email sent!' });
      } else {
        setStatus({ id: sale.id, type: 'error', text: data.error || 'Failed to send' });
      }
    } catch (err) {
      setStatus({ id: sale.id, type: 'error', text: 'Error occurred' });
    }
    setSending(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Renewals & Expiry</h1>
          <p className="text-zinc-500">Track upcoming expirations and send renewal reminders.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-zinc-200">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Renewal List
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'templates' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Email Templates
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Search renewals..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Product</th>
                  <th className="px-6 py-4 font-semibold">Expiry Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedSales.map((sale) => {
                  const hasDate = !!sale.renewal_date;
                  const expiry = hasDate ? new Date(sale.renewal_date) : null;
                  const now = new Date();
                  const diffTime = expiry ? expiry.getTime() - now.getTime() : 0;
                  const diffDays = expiry ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
                  const isExpired = hasDate && diffDays <= 0;
                  
                  let urgencyClass = 'bg-emerald-50 text-emerald-600';
                  if (hasDate) {
                    if (diffDays <= 3) urgencyClass = 'bg-red-50 text-red-600 animate-pulse';
                    else if (diffDays <= 7) urgencyClass = 'bg-amber-50 text-amber-600';
                  }

                  return (
                    <tr key={sale.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-zinc-900">{sale.customer_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-600 font-medium">{sale.product_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm text-zinc-900 font-bold">
                            <Calendar size={14} className="text-zinc-400" />
                            {expiry ? format(expiry, 'dd MMM, yyyy') : 'No Date Set'}
                          </div>
                          {hasDate ? (
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-fit ${urgencyClass}`}>
                              {isExpired ? 'Expired' : `${diffDays} Days Left`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full w-fit bg-zinc-50 text-zinc-400">
                              Manual Renewal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${isExpired ? 'bg-zinc-100 text-zinc-400' : 'bg-emerald-50 text-emerald-600'}`}>
                          {isExpired ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {status?.id === sale.id && (
                            <span className={`text-xs font-medium flex items-center gap-1 ${status.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                              {status.text}
                            </span>
                          )}
                          <button 
                            onClick={() => sendEmail(sale)}
                            disabled={sending === sale.id}
                            className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                            {sending === sale.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                            Send Reminder
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-4">
              <p className="text-sm text-zinc-500">
                Showing <span className="font-bold text-zinc-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-zinc-900">{Math.min(currentPage * itemsPerPage, filteredSales.length)}</span> of <span className="font-bold text-zinc-900">{filteredSales.length}</span> results
              </p>
              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1 rounded-lg border border-zinc-200 text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[32px] px-2 py-1 rounded-lg border text-sm font-medium transition-colors ${
                          currentPage === page 
                            ? 'bg-zinc-900 border-zinc-900 text-white' 
                            : 'border-zinc-200 hover:bg-white text-zinc-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                  
                  if (
                    (page === 2 && currentPage > 3) || 
                    (page === totalPages - 1 && currentPage < totalPages - 2)
                  ) {
                    return <span key={page} className="px-1 text-zinc-400 font-bold">...</span>;
                  }
                  
                  return null;
                })}

                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1 rounded-lg border border-zinc-200 text-sm font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={saveSettings} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* 30 Days Reminder */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm">30</span>
                30 Days Reminder
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Subject</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="Subject for 30 day reminder"
                    value={renewalSettings.day30_subject}
                    onChange={e => setRenewalSettings({...renewalSettings, day30_subject: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Body</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none"
                    placeholder="Content for 30 day reminder"
                    value={renewalSettings.day30_body}
                    onChange={e => setRenewalSettings({...renewalSettings, day30_body: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* 15 Days Reminder */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center text-sm">15</span>
                15 Days Reminder
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Subject</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    placeholder="Subject for 15 day reminder"
                    value={renewalSettings.day15_subject}
                    onChange={e => setRenewalSettings({...renewalSettings, day15_subject: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Body</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-amber-500 font-medium resize-none"
                    placeholder="Content for 15 day reminder"
                    value={renewalSettings.day15_body}
                    onChange={e => setRenewalSettings({...renewalSettings, day15_body: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Expiry Notification */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4 col-span-full">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <span className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm">0</span>
                Expiry Notification
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Subject</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-red-500 font-medium"
                    placeholder="Subject for expired notification"
                    value={renewalSettings.expired_subject}
                    onChange={e => setRenewalSettings({...renewalSettings, expired_subject: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Body</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-red-500 font-medium resize-none"
                    placeholder="Content for expired notification"
                    value={renewalSettings.expired_body}
                    onChange={e => setRenewalSettings({...renewalSettings, expired_body: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-2xl text-white flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold">Available Variables</p>
              <p className="text-sm text-zinc-400">Use these placeholders in your templates: <code className="text-emerald-400">{'{customer_name}'}</code>, <code className="text-emerald-400">{'{product_name}'}</code></p>
            </div>
            <button 
              type="submit"
              disabled={saving}
              className="bg-white text-zinc-900 px-8 py-3 rounded-xl font-bold hover:bg-zinc-100 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              Save All Templates
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
