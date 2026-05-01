import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Clock, CheckCircle, XCircle, ArrowLeft, Mail, User, Phone, Calendar, ShieldCheck, Timer } from 'lucide-react';
import { useBrandingStore } from '../store/brandingStore';
import { format, differenceInDays, isAfter } from 'date-fns';

export default function TrackOrder() {
  const navigate = useNavigate();
  const { siteName, logoUrl } = useBrandingStore();
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/public/track?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="text-emerald-500" size={16} />;
      case 'Rejected': return <XCircle className="text-red-500" size={16} />;
      default: return <Clock className="text-amber-500" size={16} />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Rejected': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  const getDaysLeft = (renewalDate: string) => {
    if (!renewalDate) return null;
    const days = differenceInDays(new Date(renewalDate), new Date());
    return days > 0 ? days : 0;
  };

  const getStatusMessage = (status: string, renewalDate: string) => {
    if (status !== 'Approved') return 'Awaiting approval from team.';
    if (!renewalDate) return 'Subscription active. Fixed duration.';
    
    const days = getDaysLeft(renewalDate);
    if (days === null) return 'Active';
    if (days > 7) return 'Your subscription is healthy and active.';
    if (days > 0) return 'Your subscription is expiring soon. Please renew.';
    return 'Your subscription has expired.';
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-center">
          <div className="flex items-center gap-2 sm:gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-8 sm:h-10 w-auto object-contain" />
            ) : (
              <>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-xl">
                  {siteName?.[0] || 'D'}
                </div>
                <span className="font-bold text-base sm:text-xl tracking-tight text-zinc-900">{siteName}</span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <div className="bg-white p-6 sm:p-10 lg:p-14 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl shadow-purple-100/50 border border-zinc-100 mb-8 sm:12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-50 text-purple-600 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 sm:8 shadow-inner">
            <Search size={32} className="sm:hidden" />
            <Search size={40} className="hidden sm:block" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-zinc-900 mb-3 tracking-tight">Check Order Status</h2>
          <p className="text-sm sm:text-lg text-zinc-500 mb-6 sm:10 max-w-lg mx-auto leading-relaxed">Enter your purchase email address to track your order and subscription details instantly.</p>
          
          <form onSubmit={handleSearch} className="flex flex-col sm:row gap-3 sm:gap-4 max-w-xl mx-auto bg-zinc-50 sm:p-2 rounded-2xl sm:rounded-3xl border border-zinc-100 sm:mt-8 p-3">
            <div className="relative flex-1">
              <Mail className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={20} sm:size={24} />
              <input 
                type="email" 
                required
                placeholder="Purchase email"
                className="w-full pl-12 sm:pl-14 pr-4 py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-white border border-zinc-200 outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-bold text-zinc-900 text-sm sm:text-base"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-purple-600 text-white px-8 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-xl shadow-purple-300 flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base outline-none active:scale-95"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Track Now <ArrowLeft className="rotate-180" size={18} /></>
              )}
            </button>
          </form>
        </div>

        {searched && (
          <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-2 sm:px-4">
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900">Found {orders.length} Order{orders.length !== 1 ? 's' : ''}</h3>
              <div className="h-px flex-1 bg-zinc-200 mx-4 sm:6 hidden xs:block" />
              <p className="text-[10px] sm:text-sm font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">{email}</p>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white p-12 sm:p-16 rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-zinc-200 text-center space-y-6">
                <div className="w-14 h-14 bg-zinc-50 text-zinc-300 rounded-xl flex items-center justify-center mx-auto">
                  <Package size={28} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-zinc-900">No Orders Found</h4>
                  <p className="text-sm text-zinc-500 font-medium">Try searching with a different email address.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {orders.map((order) => {
                  const daysLeft = getDaysLeft(order.renewal_date);
                  return (
                    <div key={order.id} className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-zinc-200 overflow-hidden shadow-xl sm:shadow-2xl shadow-zinc-200/40">
                      {/* Section 1: Top Bar / Header */}
                      <div className="p-6 sm:p-8 border-b border-zinc-100 flex flex-col sm:row sm:items-center justify-between gap-4 sm:gap-6 bg-zinc-50/50">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                          <div className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border-2 text-[10px] sm:text-sm font-black uppercase tracking-wider shadow-sm ${getStatusClass(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status || 'Pending'}
                          </div>
                          <div className="h-8 w-px bg-zinc-200 hidden xs:block" />
                          <div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-0.5">Order ID</p>
                            <p className="font-mono font-bold text-zinc-900 text-base sm:text-lg">#{order.id.toString().padStart(6, '0')}</p>
                          </div>
                        </div>
                          <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-0 border-zinc-100">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-0.5">Order Date</p>
                            <p className="font-bold text-zinc-600 sm:text-lg flex items-center justify-start sm:justify-end gap-2 text-sm">
                              <Calendar size={16} className="text-zinc-400" />
                              {order.date ? format(new Date(order.date), 'dd MMM, yyyy') : 'N/A'}
                            </p>
                          </div>
                      </div>

                      <div className="p-6 sm:p-10 lg:p-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
                        {/* Section 2: Customer Information */}
                        <div className="space-y-4 sm:space-y-6">
                          <h4 className="flex items-center gap-3 text-[11px] sm:text-sm font-black text-zinc-900 uppercase tracking-[0.15em] border-b border-zinc-100 pb-3 sm:pb-4">
                            <User size={16} className="text-purple-600" />
                            Customer Info
                          </h4>
                          <div className="grid grid-cols-2 sm:block gap-4">
                            <div className="col-span-2">
                              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase mb-1">Full Name</p>
                              <p className="font-bold text-zinc-900 text-sm sm:text-base">{order.customer_name}</p>
                            </div>
                            <div>
                              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase mb-1">Mobile</p>
                              <p className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base">
                                <Phone size={12} className="text-zinc-300" />
                                {order.phone || 'N/A'}
                              </p>
                            </div>
                            <div className="sm:mt-4">
                              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase mb-1">Email</p>
                              <p className="font-bold text-zinc-900 flex items-center gap-2 text-sm sm:text-base truncate">
                                <Mail size={12} className="text-zinc-300" />
                                {order.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Subscription Details */}
                        <div className="space-y-4 sm:space-y-6">
                          <h4 className="flex items-center gap-3 text-[11px] sm:text-sm font-black text-zinc-900 uppercase tracking-[0.15em] border-b border-zinc-100 pb-3 sm:pb-4">
                            <Package size={16} className="text-purple-600" />
                            Plan Details
                          </h4>
                          <div className="grid grid-cols-2 sm:block gap-4">
                            <div className="col-span-2">
                              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase mb-1">Plan</p>
                              <div className="inline-flex items-center gap-2 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-100">
                                <ShieldCheck size={14} className="text-purple-600" />
                                <p className="font-bold text-purple-900 text-xs sm:text-sm">{order.product_name}</p>
                              </div>
                            </div>
                            <div className="sm:mt-4">
                              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase mb-1">Duration</p>
                              <p className="font-bold text-zinc-900 text-sm sm:text-base">
                                {order.renewal_date ? 
                                  `${differenceInDays(new Date(order.renewal_date), new Date(order.date))} Days` : 
                                  'Lifetime'
                                }
                              </p>
                            </div>
                            <div className="sm:mt-4">
                              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase mb-1">Method</p>
                              <p className="font-bold text-emerald-600 text-sm sm:text-base">{order.payment_method}</p>
                            </div>
                          </div>
                        </div>

                        {/* Section 4: Subscription Status */}
                        <div className="space-y-4 sm:space-y-6 bg-zinc-50 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-zinc-100 sm:col-span-2 lg:col-span-1">
                          <h4 className="flex items-center gap-3 text-[11px] sm:text-sm font-black text-zinc-900 uppercase tracking-[0.15em] border-b border-zinc-200/50 pb-3 sm:pb-4">
                            <Timer size={16} className="text-purple-600" />
                            Status & Renewal
                          </h4>
                          <div className="space-y-4 sm:space-y-5">
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase">Days Left</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl sm:text-2xl font-black text-purple-600 leading-none">
                                  {daysLeft !== null ? daysLeft : '∞'}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Days</span>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-white rounded-xl border border-zinc-200">
                              <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1 flex items-center gap-1">
                                <ShieldCheck size={10} /> Message
                              </p>
                              <p className="text-[11px] sm:text-xs font-bold text-zinc-700 leading-snug">
                                {getStatusMessage(order.status, order.renewal_date)}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase">Expiry Date</p>
                              <p className="font-black text-zinc-900 text-sm">
                                {order.renewal_date ? format(new Date(order.renewal_date), 'dd MMM, yy') : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!searched && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12 px-2">
            {[
              { title: 'Secure Check', desc: 'Verified status tracking systems.', icon: ShieldCheck },
              { title: 'Auto Updates', desc: 'Real-time renewal date calculation.', icon: Clock },
              { title: 'Instant Support', desc: 'Get help with your subscription.', icon: User }
            ].map((feature, i) => (
              <div key={i} className="p-5 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 hover:border-purple-200 transition-all hover:bg-purple-50/20 active:scale-95">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon size={20} />
                </div>
                <h4 className="font-bold text-zinc-900 mb-1 text-sm sm:text-base">{feature.title}</h4>
                <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
