import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  X, 
  Clock, 
  Search, 
  Settings, 
  Package, 
  CreditCard,
  User,
  Smartphone,
  Mail,
  Zap,
  MoreVertical,
  Filter,
  Edit,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';

interface CanvaOrder {
  id: number;
  name: string;
  phone: string;
  email: string;
  package_name: string;
  price: number;
  payment_method: string;
  transaction_id: string;
  sender_number: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
}

interface PackageInfo {
  name: string;
  price: number;
}

interface PaymentInfo {
  bkash: string;
  nagad: string;
  rocket: string;
}

export default function AdminCanvaRenewal() {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState<CanvaOrder[]>([]);
  const [settings, setSettings] = useState({
    packages: [] as PackageInfo[],
    payment_info: { bkash: '', nagad: '', rocket: '' } as PaymentInfo,
    banner_url: '',
    page_title: '',
    page_description: '',
    bkash_logo: '',
    nagad_logo: '',
    rocket_logo: '',
    redirect_url: '',
    approval_email_template: '',
    rejection_email_template: '',
    approval_email_subject: '',
    rejection_email_subject: ''
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [editingOrder, setEditingOrder] = useState<CanvaOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchData = async () => {
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        fetch('/api/admin/canva-renewal/orders', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/canva-renewal/settings', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const ordersData = await ordersRes.json();
      const settingsData = await settingsRes.json();
      setOrders(ordersData);
      setSettings({
        ...settingsData,
        banner_url: settingsData.banner_url || 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2071&auto=format&fit=crop',
        page_title: settingsData.page_title || 'Canva Pro Lifetime Renewal',
        page_description: settingsData.page_description || 'আপনার বর্তমান ক্যানভা প্রো একাউন্টটি পুনরায় সচল করুন খুব সহজেই। প্রিমিয়াম সকল ফিচার ব্যবহার করুন আনলিমিটেড।'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/canva-renewal/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating status');
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      const res = await fetch(`/api/admin/canva-renewal/orders/${editingOrder.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editingOrder)
      });
      if (res.ok) {
        setEditingOrder(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update order');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating order');
    }
  };

  const handleDelete = async (id: number) => {
    console.log('Attempting to delete Canva order with ID:', id);
    if (!confirm('Are you sure you want to delete this order?')) {
      console.log('Delete cancelled by user');
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/canva-renewal/orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        console.log('Canva order deleted successfully');
        fetchData();
      } else {
        const err = await res.json();
        console.error('Delete failed:', err);
        alert(err.error || 'Failed to delete order');
      }
    } catch (err) {
      console.error('Network error during delete:', err);
      alert('An error occurred while deleting order');
    }
  };

  const saveSettings = async () => {
    try {
      const res = await fetch('/api/admin/canva-renewal/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Settings saved successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery) ||
      order.transaction_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Canva Renewal Control</h1>
          <p className="text-zinc-500 text-sm">Manage packages and customer renewal orders</p>
        </div>
        <div className="flex p-1 bg-zinc-100 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Orders
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Search orders..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="text-zinc-400" size={18} />
              <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold outline-none cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Package/Price</th>
                  <th className="px-6 py-4">Payment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedOrders.length > 0 ? paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-900">{order.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <Smartphone size={10} /> {order.phone}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <Mail size={10} /> {order.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900">{order.package_name}</span>
                        <span className="text-xs font-bold text-purple-600">৳{order.price}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase text-zinc-900">{order.payment_method}</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <Smartphone size={10} /> {order.sender_number}
                        </div>
                        <span className="text-xs font-mono font-bold text-zinc-500">{order.transaction_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                        order.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                        order.status === 'Rejected' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-zinc-400">
                          {order.status !== 'Pending' && (
                            <button 
                              onClick={() => handleStatusUpdate(order.id, 'Pending')}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                              title="Set to Pending"
                            >
                              <Clock size={18} />
                            </button>
                          )}
                          {order.status !== 'Approved' && (
                            <button 
                              onClick={() => handleStatusUpdate(order.id, 'Approved')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Approve Order"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          {order.status !== 'Rejected' && (
                            <button 
                              onClick={() => handleStatusUpdate(order.id, 'Rejected')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Reject Order"
                            >
                              <X size={18} />
                            </button>
                          )}
                          <button 
                            onClick={() => setEditingOrder(order)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit Order"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(order.id)}
                            className="p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
                            title="Delete Order"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-4">
              <p className="text-sm text-zinc-500">
                Showing <span className="font-bold text-zinc-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-zinc-900">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> of <span className="font-bold text-zinc-900">{filteredOrders.length}</span> results
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 space-y-6">
            <div className="space-y-6">
              <h3 className="font-bold flex items-center gap-2">
                <ImageIcon className="text-zinc-600" size={20} />
                Banner & Redirect
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Banner Image URL</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                      value={settings.banner_url}
                      onChange={e => setSettings({ ...settings, banner_url: e.target.value })}
                    />
                  </div>
                  {settings.banner_url && (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-100 bg-zinc-50">
                      <img src={settings.banner_url} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-bold">Banner Preview</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Success Redirect URL</label>
                    <input 
                      type="text" 
                      placeholder="https://t.me/your_link"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                      value={settings.redirect_url}
                      onChange={e => setSettings({ ...settings, redirect_url: e.target.value })}
                    />
                  </div>
                  <div className="p-4 bg-purple-50 rounded-2xl flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                      <ExternalLink size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">Auto Redirect</p>
                      <p className="text-[10px] text-zinc-600 leading-relaxed mt-1">
                        If set, customers will be redirected to this URL immediately after placing an order.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Page Title</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  value={settings.page_title}
                  onChange={e => setSettings({ ...settings, page_title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Page Description</label>
                <textarea 
                  className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-medium min-h-[100px]"
                  value={settings.page_description}
                  onChange={e => setSettings({ ...settings, page_description: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Mail className="text-blue-600" size={20} />
                  Email Notifications
                </h3>
                <div className="flex gap-2">
                  {['name', 'package', 'price', 'transaction_id'].map(p => (
                    <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded lowercase">
                      {'{'}{p}{'}'}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-zinc-50 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black uppercase text-emerald-600">Approval Email</h4>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-400">Subject</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-bold"
                      value={settings.approval_email_subject}
                      onChange={e => setSettings({ ...settings, approval_email_subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-400">Body (Placeholders: {'{name}, {package}, {price}, {transaction_id}'})</label>
                    <textarea 
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-medium min-h-[120px]"
                      value={settings.approval_email_template}
                      onChange={e => setSettings({ ...settings, approval_email_template: e.target.value })}
                    />
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black uppercase text-red-600">Rejection Email</h4>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-400">Subject</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-bold"
                      value={settings.rejection_email_subject}
                      onChange={e => setSettings({ ...settings, rejection_email_subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-400">Body (Placeholders: {'{name}, {package}, {price}, {transaction_id}'})</label>
                    <textarea 
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-medium min-h-[120px]"
                      value={settings.rejection_email_template}
                      onChange={e => setSettings({ ...settings, rejection_email_template: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Package className="text-purple-600" size={20} />
                  Renewal Packages
                </h3>
              <button 
                onClick={() => setSettings({
                  ...settings, 
                  packages: [...settings.packages, { name: '', price: 0 }]
                })}
                className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all font-bold text-xs flex items-center gap-1"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            
            <div className="space-y-3">
              {settings.packages.map((pkg, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    placeholder="Package Name (e.g. 1 Month)"
                    className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-sm font-bold outline-none"
                    value={pkg.name}
                    onChange={e => {
                      const newPkgs = [...settings.packages];
                      newPkgs[idx].name = e.target.value;
                      setSettings({ ...settings, packages: newPkgs });
                    }}
                  />
                  <input 
                    type="number" 
                    placeholder="Price"
                    className="w-24 px-3 py-2 rounded-lg border border-zinc-200 text-sm font-bold outline-none"
                    value={pkg.price}
                    onChange={e => {
                      const newPkgs = [...settings.packages];
                      newPkgs[idx].price = parseFloat(e.target.value);
                      setSettings({ ...settings, packages: newPkgs });
                    }}
                  />
                  <button 
                    onClick={() => {
                      const newPkgs = settings.packages.filter((_, i) => i !== idx);
                      setSettings({ ...settings, packages: newPkgs });
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="font-bold flex items-center gap-2">
                <CreditCard className="text-emerald-600" size={20} />
                Payment Information
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">bKash (Personal)</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                        value={settings.payment_info.bkash}
                        onChange={e => setSettings({
                          ...settings, 
                          payment_info: { ...settings.payment_info, bkash: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">bKash Logo URL</label>
                      <input 
                        type="text" 
                        placeholder="https://..."
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                        value={settings.bkash_logo}
                        onChange={e => setSettings({ ...settings, bkash_logo: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    {settings.bkash_logo ? (
                      <img src={settings.bkash_logo} alt="bKash" className="h-16 object-contain" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon size={24} className="mx-auto text-zinc-300 mb-2" />
                        <span className="text-[10px] text-zinc-400">No bKash Logo</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nagad (Personal)</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                        value={settings.payment_info.nagad}
                        onChange={e => setSettings({
                          ...settings, 
                          payment_info: { ...settings.payment_info, nagad: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nagad Logo URL</label>
                      <input 
                        type="text" 
                        placeholder="https://..."
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                        value={settings.nagad_logo}
                        onChange={e => setSettings({ ...settings, nagad_logo: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    {settings.nagad_logo ? (
                      <img src={settings.nagad_logo} alt="Nagad" className="h-16 object-contain" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon size={24} className="mx-auto text-zinc-300 mb-2" />
                        <span className="text-[10px] text-zinc-400">No Nagad Logo</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Rocket (Personal)</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                        value={settings.payment_info.rocket}
                        onChange={e => setSettings({
                          ...settings, 
                          payment_info: { ...settings.payment_info, rocket: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Rocket Logo URL</label>
                      <input 
                        type="text" 
                        placeholder="https://..."
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                        value={settings.rocket_logo}
                        onChange={e => setSettings({ ...settings, rocket_logo: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    {settings.rocket_logo ? (
                      <img src={settings.rocket_logo} alt="Rocket" className="h-16 object-contain" />
                    ) : (
                      <div className="text-center">
                        <ImageIcon size={24} className="mx-auto text-zinc-300 mb-2" />
                        <span className="text-[10px] text-zinc-400">No Rocket Logo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={saveSettings}
              className="w-full bg-zinc-900 text-white font-bold py-3 rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setEditingOrder(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl border border-zinc-100 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Edit Order Details</h2>
              <button onClick={() => setEditingOrder(null)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    value={editingOrder.name}
                    onChange={e => setEditingOrder({ ...editingOrder, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Phone</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    value={editingOrder.phone}
                    onChange={e => setEditingOrder({ ...editingOrder, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold text-sm"
                    value={editingOrder.email}
                    onChange={e => setEditingOrder({ ...editingOrder, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Price</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    value={editingOrder.price}
                    onChange={e => setEditingOrder({ ...editingOrder, price: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sender Number</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    value={editingOrder.sender_number}
                    onChange={e => setEditingOrder({ ...editingOrder, sender_number: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Transaction ID</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                    value={editingOrder.transaction_id}
                    onChange={e => setEditingOrder({ ...editingOrder, transaction_id: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                    value={editingOrder.status}
                    onChange={e => setEditingOrder({ ...editingOrder, status: e.target.value as any })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-900 text-white font-bold py-4 rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Save size={18} />
                Update Order
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
