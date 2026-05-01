import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Mail, Save, Shield, Server, User, Send, RefreshCw, AlertCircle, Users, Trash2, Plus, Key, ShieldCheck, Loader2 } from 'lucide-react';
import { useBrandingStore } from '../store/brandingStore';

export default function Settings() {
  const { token } = useAuthStore();
  const updateBrandingStore = useBrandingStore(state => state.updateBranding);
  const [smtp, setSmtp] = useState({
    host: '',
    port: 587,
    user: '',
    pass: '',
    from_email: '',
    from_name: '',
    secure: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [woo, setWoo] = useState({
    store_url: '',
    consumer_key: '',
    consumer_secret: ''
  });

  const [activeTab, setActiveTab] = useState<'smtp' | 'woo' | 'templates' | 'branding' | 'access'>('smtp');
  const [users, setUsers] = useState<any[]>([]);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [templates, setTemplates] = useState({
    approved_subject: '',
    approved_body: '',
    rejected_subject: '',
    rejected_body: ''
  });
  const [testEmail, setTestEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [branding, setBranding] = useState({
    logo_url: '',
    admin_logo_url: '',
    favicon_url: '',
    site_name: 'DigiSheba',
    show_floating_login: 1
  });

  useEffect(() => {
    // Fetch SMTP
    fetch('/api/settings/smtp', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.host) {
        setSmtp({
          ...data,
          secure: data.secure === 1
        });
      }
    });

    // Fetch Templates
    fetch('/api/settings/templates', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setTemplates(data);
    });

    // Fetch Branding
    fetch('/api/settings/branding', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data) {
        setBranding({
          ...data,
          show_floating_login: data.show_floating_login ?? 1
        });
      }
    });

    // Fetch Users
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    });

    // Set initial profile
    const currentUser = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user;
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        email: currentUser.email || '',
        password: ''
      });
    }
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      let endpoint = '';
      let body = {};

      if (activeTab === 'smtp') {
        endpoint = '/api/settings/smtp';
        body = smtp;
      } else if (activeTab === 'woo') {
        endpoint = '/api/settings/woo';
        body = woo;
      } else if (activeTab === 'branding') {
        endpoint = '/api/settings/branding';
        body = branding;
      } else {
        endpoint = '/api/settings/templates';
        body = templates;
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        if (activeTab === 'branding') {
          updateBrandingStore(branding);
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    }
    setSaving(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setProfile({ ...profile, password: '' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to update profile' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    }
    setSaving(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'New user added successfully!' });
        setNewUser({ name: '', email: '', password: '' });
        // Refresh users list
        const uRes = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
        const uData = await uRes.json();
        setUsers(uData);
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to add user' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred.' });
    }
    setSaving(false);
  };

  const handleTestSmtp = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }
    setTestingSmtp(true);
    try {
      const res = await fetch('/api/settings/smtp/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...smtp, email: testEmail, site_name: branding.site_name })
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok) {
          alert('Test email sent successfully! Please check your inbox.');
        } else {
          alert(`SMTP Error: ${data.error || 'Failed to send'}\nDetails: ${data.details || 'No details provided'}`);
        }
      } else {
        const text = await res.text();
        console.error("Non-JSON Response Payload:", text);
        alert(`Server returned non-JSON error (${res.status}): ${text.substring(0, 500)}`);
      }
    } catch (err: any) {
      console.error("Fetch/JSON Error:", err);
      alert(`Connection Error: ${err.message}`);
    }
    setTestingSmtp(false);
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        setMessage({ type: 'success', text: 'User removed successfully!' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to remove user' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="animate-pulse p-6">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">System Settings</h1>
        <p className="text-zinc-500">Configure your system preferences, email automation, and shop integrations.</p>
      </div>

      <div className="flex items-center gap-4 bg-zinc-100 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('smtp')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'smtp' ? 'bg-white text-purple-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          SMTP & Email
        </button>
        <button 
          onClick={() => setActiveTab('woo')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'woo' ? 'bg-white text-purple-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          WooCommerce API
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'templates' ? 'bg-white text-purple-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          Templates
        </button>
        <button 
          onClick={() => setActiveTab('branding')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'branding' ? 'bg-white text-purple-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          Branding
        </button>
        <button 
          onClick={() => setActiveTab('access')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'access' ? 'bg-white text-purple-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
        >
          Access Control
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        {activeTab === 'smtp' ? (
          <form onSubmit={handleSave} className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Mail size={20} />
              </div>
              <h2 className="font-bold text-zinc-900">SMTP Configuration</h2>
            </div>
            
            {message.text && activeTab === 'smtp' && (
              <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Server size={14} /> SMTP Host
                </label>
                <input 
                  type="text" 
                  placeholder="smtp.gmail.com"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500"
                  value={smtp.host}
                  onChange={e => setSmtp({...smtp, host: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Port</label>
                <input 
                  type="number" 
                  placeholder="587"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500"
                  value={smtp.port}
                  onChange={e => setSmtp({...smtp, port: parseInt(e.target.value)})}
                  required
                />
              </div>
              {/* Other SMTP fields same as before but styled consistent */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">SMTP User</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500" value={smtp.user} onChange={e => setSmtp({...smtp, user: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">SMTP Pass</label>
                <input type="password" className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500" value={smtp.pass} onChange={e => setSmtp({...smtp, pass: e.target.value})} required />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900 mb-4">Email Template Guidance</h3>
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Use the following placeholders in your product email templates (find them in the Products section):
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-white border border-zinc-200 rounded-md text-[10px] font-bold text-purple-600">{"{{customer_name}}"}</span>
                  <span className="px-2 py-1 bg-white border border-zinc-200 rounded-md text-[10px] font-bold text-purple-600">{"{{product_name}}"}</span>
                  <span className="px-2 py-1 bg-white border border-zinc-200 rounded-md text-[10px] font-bold text-purple-600">{"{{renewal_date}}"}</span>
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving} className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2">
              <Save size={20} /> Save SMTP
            </button>

            <div className="mt-8 pt-8 border-t border-zinc-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Send size={18} />
                </div>
                <h3 className="font-bold text-zinc-900">Test SMTP Settings</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Enter an email address to send a test message using your saved SMTP configurations.</p>
              <div className="flex gap-3">
                <input 
                  type="email" 
                  placeholder="test@example.com"
                  className="flex-grow px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={handleTestSmtp}
                  disabled={testingSmtp}
                  className="bg-white border border-zinc-200 text-zinc-900 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors flex items-center gap-2"
                >
                  {testingSmtp ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Test Now
                </button>
              </div>
            </div>
          </form>
        ) : activeTab === 'woo' ? (
          <form onSubmit={handleSave} className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <RefreshCw size={20} />
              </div>
              <h2 className="font-bold text-zinc-900">WooCommerce Integration</h2>
            </div>

            {message.text && activeTab === 'woo' && (
              <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {message.text}
              </div>
            )}
            
            {/* ... rest of woo form ... */}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Store URL</label>
                <input 
                  type="text" 
                  placeholder="https://yourstore.com"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500"
                  value={woo.store_url}
                  onChange={e => setWoo({...woo, store_url: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Consumer Key</label>
                <input 
                  type="text" 
                  placeholder="ck_..."
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500"
                  value={woo.consumer_key}
                  onChange={e => setWoo({...woo, consumer_key: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Consumer Secret</label>
                <input 
                  type="password" 
                  placeholder="cs_..."
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500"
                  value={woo.consumer_secret}
                  onChange={e => setWoo({...woo, consumer_secret: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
              <p className="text-xs text-blue-600 leading-relaxed">
                Connect your store to automatically import orders. Ensure the REST API is enabled in your WooCommerce settings and the keys have <strong>Read/Write</strong> permissions.
              </p>
            </div>

            <button type="submit" disabled={saving} className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2">
              <Save size={20} /> Save WooCommerce Config
            </button>
          </form>
        ) : activeTab === 'branding' ? (
          <form onSubmit={handleSave} className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Shield size={20} />
              </div>
              <h2 className="font-bold text-zinc-900">Branding & Identity</h2>
            </div>

            {message.text && activeTab === 'branding' && (
              <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {message.text}
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Site Name</label>
                <input 
                  type="text" 
                  placeholder="DigiSheba"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  value={branding.site_name}
                  onChange={e => setBranding({...branding, site_name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Home Page Logo URL</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500"
                    value={branding.logo_url}
                    onChange={e => setBranding({...branding, logo_url: e.target.value})}
                  />
                  {branding.logo_url && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-center">
                      <img src={branding.logo_url} alt="Logo Preview" className="max-h-12 object-contain" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Admin Panel Logo URL</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com/admin-logo.png"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500"
                    value={branding.admin_logo_url}
                    onChange={e => setBranding({...branding, admin_logo_url: e.target.value})}
                  />
                  {branding.admin_logo_url && (
                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-center">
                      <img src={branding.admin_logo_url} alt="Admin Logo Preview" className="max-h-12 object-contain" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Favicon URL</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com/favicon.ico"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500"
                    value={branding.favicon_url}
                    onChange={e => setBranding({...branding, favicon_url: e.target.value})}
                  />
                  <p className="text-[10px] text-zinc-400">Recommended size: 32x32px or 64x64px.</p>
                </div>

                <div className="pt-4 flex items-center justify-between p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-purple-900">Floating Admin Login</label>
                    <p className="text-xs text-purple-600">Show a floating login button on the home page for quick access.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setBranding({...branding, show_floating_login: Number(branding.show_floating_login) ? 0 : 1})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${Number(branding.show_floating_login) ? 'bg-purple-600' : 'bg-zinc-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${Number(branding.show_floating_login) ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving} className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2">
              <Save size={20} /> Save Branding
            </button>
          </form>
        ) : activeTab === 'access' ? (
          <div className="p-8 space-y-12">
            {/* Profile Section */}
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <User size={20} />
                </div>
                <h2 className="font-bold text-zinc-900">My Admin Profile</h2>
              </div>

              {message.text && activeTab === 'access' && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    value={profile.name}
                    onChange={e => setProfile({...profile, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Admin Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    value={profile.email}
                    onChange={e => setProfile({...profile, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">New Password (leave blank to keep current)</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                      value={profile.password}
                      onChange={e => setProfile({...profile, password: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={saving} className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2">
                <Save size={18} /> Update Profile
              </button>
            </form>

            <div className="h-px bg-zinc-100" />

            {/* Team Management */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Users size={20} />
                  </div>
                  <h2 className="font-bold text-zinc-900">Manage Admins & Moderators</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* User List */}
                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Existing Team Members</label>
                  <div className="space-y-3">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-zinc-200 shadow-sm">
                            <User size={18} className="text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{u.name}</p>
                            <p className="text-xs text-zinc-500">{u.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New User */}
                <form onSubmit={handleAddUser} className="space-y-4 bg-purple-50/30 p-6 rounded-3xl border border-purple-100">
                   <h3 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                    <Plus size={16} /> Add New Member
                  </h3>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Full Name"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                      value={newUser.name}
                      onChange={e => setNewUser({...newUser, name: e.target.value})}
                      required
                    />
                    <input 
                      type="email" 
                      placeholder="Email Address"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                      required
                    />
                    <input 
                      type="password" 
                      placeholder="Password"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      required
                    />
                    <button type="submit" disabled={saving} className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-purple-200">
                      <ShieldCheck size={18} /> Create Access
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-8 space-y-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Shield size={20} />
              </div>
              <h2 className="font-bold text-zinc-900">Custom Email Templates</h2>
            </div>

            {message.text && activeTab === 'templates' && (
              <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {message.text}
              </div>
            )}

            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Order Approved Email
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subject</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                      value={templates.approved_subject}
                      onChange={e => setTemplates({...templates, approved_subject: e.target.value})}
                      placeholder="e.g. Your Order is Approved!"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Body Message</label>
                    <textarea 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px]"
                      value={templates.approved_body}
                      onChange={e => setTemplates({...templates, approved_body: e.target.value})}
                      placeholder="Hi {customer_name}, your order for {product_name} is approved."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-red-600 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Order Rejected Email
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subject</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                      value={templates.rejected_subject}
                      onChange={e => setTemplates({...templates, rejected_subject: e.target.value})}
                      placeholder="e.g. Update on your Order"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Body Message</label>
                    <textarea 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 min-h-[120px]"
                      value={templates.rejected_body}
                      onChange={e => setTemplates({...templates, rejected_body: e.target.value})}
                      placeholder="Hi {customer_name}, unfortunately we couldn't process your order."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <p className="text-xs font-bold text-zinc-500 mb-2">Available Placeholders:</p>
              <div className="flex flex-wrap gap-2">
                <code className="px-2 py-1 bg-white border border-zinc-200 rounded text-purple-600 text-[10px]">{"{customer_name}"}</code>
                <code className="px-2 py-1 bg-white border border-zinc-200 rounded text-purple-600 text-[10px]">{"{product_name}"}</code>
                <code className="px-2 py-1 bg-white border border-zinc-200 rounded text-purple-600 text-[10px]">{"{status}"}</code>
              </div>
            </div>

            <button type="submit" disabled={saving} className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 w-full justify-center">
              <Save size={20} /> Save Email Templates
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
