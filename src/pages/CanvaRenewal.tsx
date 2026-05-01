import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBrandingStore } from '../store/brandingStore';
import { 
  CheckCircle2, 
  ArrowLeft, 
  ShieldCheck, 
  Zap,
  Smartphone,
  Mail,
  User,
  Package,
  Loader2,
  Copy,
  Check,
  Hash,
  Lock,
  ChevronLeft,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PackageInfo {
  name: string;
  price: number;
}

interface PaymentInfo {
  bkash?: string;
  nagad?: string;
  rocket?: string;
}

export default function CanvaRenewal() {
  const navigate = useNavigate();
  const { siteName, logoUrl } = useBrandingStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [settings, setSettings] = useState<{ 
    packages: PackageInfo[], 
    payment_info: PaymentInfo,
    banner_url: string,
    page_title: string,
    page_description: string,
    bkash_logo: string,
    nagad_logo: string,
    rocket_logo: string,
    redirect_url: string
  }>({
    packages: [],
    payment_info: {},
    banner_url: '',
    page_title: '',
    page_description: '',
    bkash_logo: '',
    nagad_logo: '',
    rocket_logo: '',
    redirect_url: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    package_name: '',
    price: 0,
    payment_method: 'bkash',
    sender_number: '',
    transaction_id: ''
  });

  useEffect(() => {
    fetch('/api/public/canva-renewal/settings')
      .then(res => res.json())
      .then(data => {
        const safeData = {
          ...data,
          packages: Array.isArray(data.packages) ? data.packages : [],
          payment_info: data.payment_info || {}
        };
        setSettings({
          ...safeData,
          banner_url: safeData.banner_url || 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=2071&auto=format&fit=crop',
          page_title: safeData.page_title || 'Canva Pro Lifetime Renewal',
          page_description: safeData.page_description || 'আপনার বর্তমান ক্যানভা প্রো একাউন্টটি পুনরায় সচল করুন খুব সহজেই। প্রিমিয়াম সকল ফিচার ব্যবহার করুন আনলিমিটেড।',
          bkash_logo: safeData.bkash_logo || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0Nl_p-C7QeO-o_R-U8P8a7Gv2u6v4-U7f8w&s',
          nagad_logo: safeData.nagad_logo || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6l6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6L6A&s',
          rocket_logo: safeData.rocket_logo || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT-Gv-C7QeO-o_R-U8P8a7Gv2u6v4-U7f8w&s'
        });
        if (safeData.packages.length > 0) {
          setFormData(prev => ({
            ...prev,
            package_name: safeData.packages[0].name,
            price: safeData.packages[0].price
          }));
        }
      });
  }, []);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.email || !formData.transaction_id || !formData.sender_number) {
      setError('দয়া করে সব ঘর পূরণ করুন।');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/public/canva-renewal/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        if (settings.redirect_url) {
          window.location.href = settings.redirect_url;
        } else {
          setSuccess(true);
        }
      } else {
        setError('অর্ডার সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।');
      }
    } catch (err) {
      setError('সার্ভার ত্রুটি। ইন্টারনাল কানেকশন চেক করুন।');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentNumber = () => {
    const method = formData.payment_method as keyof PaymentInfo;
    return settings.payment_info[method] || '01XXXXXXXXX';
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center p-8 border border-zinc-100 rounded-3xl shadow-2xl shadow-zinc-200"
        >
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-emerald-100">
            <Check size={40} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 mb-3">ধন্যবাদ! অর্ডার সফল হয়েছে</h2>
          <p className="text-zinc-500 font-medium leading-relaxed mb-8">
            আমাদের পক্ষ থেকে ১-৩০ মিনিটের মধ্যে তথ্য যাচাই করে রিনিউয়াল সম্পন্ন করা হবে। কনফার্মেশন পাবেন ইমেইলে।
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-[#E91E63] text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-pink-100"
          >
            হোম পেজে ফিরে যান
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center">
      <div className="w-full max-w-xl bg-white shadow-2xl shadow-zinc-200 min-h-screen sm:min-h-0 sm:my-8 sm:rounded-[2rem] overflow-hidden">
        {/* Banner Section */}
        <div className="relative aspect-[16/10] bg-zinc-100 overflow-hidden">
          <img 
            src={settings.banner_url} 
            alt={settings.page_title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-zinc-900 w-4' : 'bg-zinc-300'}`} />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-zinc-900">{settings.page_title}</h1>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed">
              {settings.page_description}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Customer Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <User size={18} />
                </div>
                <h3 className="font-bold text-zinc-900">আপনার তথ্য দিন</h3>
              </div>

              <div className="space-y-3">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#E91E63] transition-colors" size={20} />
                  <input 
                    type="text" 
                    required
                    placeholder="পূর্ণ নাম লিখুন *"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 outline-none focus:border-[#E91E63] focus:ring-4 focus:ring-pink-50 transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="relative group">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#E91E63] transition-colors" size={20} />
                  <input 
                    type="tel" 
                    required
                    placeholder="মোবাইল নাম্বার লিখুন *"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 outline-none focus:border-[#E91E63] focus:ring-4 focus:ring-pink-50 transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#E91E63] transition-colors" size={20} />
                  <input 
                    type="email" 
                    required
                    placeholder="ইমেইল ঠিকানা লিখুন *"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 outline-none focus:border-[#E91E63] focus:ring-4 focus:ring-pink-50 transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Package Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Package size={18} />
                </div>
                <h3 className="font-bold text-zinc-900">প্যাকেজ নির্বাচন করুন</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {settings.packages.map((pkg, idx) => (
                  <button 
                    key={idx}
                    type="button"
                    onClick={() => setFormData({...formData, package_name: pkg.name, price: pkg.price})}
                    className={`p-4 rounded-2xl border-4 text-left transition-all relative ${
                      formData.package_name === pkg.name 
                      ? 'border-[#E91E63] bg-white shadow-lg' 
                      : 'border-transparent bg-zinc-50 hover:bg-zinc-100'
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${formData.package_name === pkg.name ? 'text-[#E91E63]' : 'text-zinc-400'}`}>
                      {pkg.name}
                    </span>
                    <span className="text-lg font-black text-zinc-900">৳{pkg.price}</span>
                    {formData.package_name === pkg.name && (
                      <div className="absolute top-2 right-2 text-[#E91E63]">
                        <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Payment Method */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-50 text-[#E91E63] rounded-lg">
                  <CreditCard size={18} />
                </div>
                <h3 className="font-bold text-zinc-900">পেমেন্ট মেথড নির্বাচন করুন</h3>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { id: 'bkash', name: 'bKash', logo: settings.bkash_logo },
                  { id: 'nagad', name: 'Nagad', logo: settings.nagad_logo },
                  { id: 'rocket', name: 'Rocket', logo: settings.rocket_logo }
                ].map((method) => (
                  <button 
                    key={method.id}
                    type="button"
                    onClick={() => setFormData({...formData, payment_method: method.id})}
                    className={`relative flex flex-col items-center gap-2 p-2 sm:p-3 rounded-2xl border-2 transition-all ${
                      formData.payment_method === method.id 
                      ? 'border-[#E91E63] bg-pink-50/20 shadow-lg' 
                      : 'border-zinc-100 bg-white hover:border-zinc-200'
                    }`}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-white shadow-sm border border-zinc-50 mb-0.5 sm:mb-1">
                      {method.logo ? (
                        <img src={method.logo} alt={method.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-zinc-400">
                          {method.name}
                        </div>
                      )}
                    </div>
                    
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      formData.payment_method === method.id ? 'border-[#E91E63] bg-[#E91E63]' : 'border-zinc-200'
                    }`}>
                      {formData.payment_method === method.id && <Check size={10} className="text-white" strokeWidth={4} />}
                    </div>
                    <span className="font-black text-[9px] sm:text-[10px] uppercase text-zinc-900 tracking-tight">{method.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 4: Payment Instruction */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Zap size={18} />
                </div>
                <h3 className="font-bold text-zinc-900">পেমেন্ট করুন এই নাম্বারে</h3>
              </div>

              <div className="bg-pink-50 rounded-2xl p-4 sm:p-5 border border-pink-100 flex flex-col sm:flex-row items-center justify-between gap-4 group">
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center text-[#E91E63] shadow-sm shrink-0">
                    <Smartphone size={20} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xl sm:text-3xl font-black text-[#E91E63] font-mono tracking-tighter truncate">
                      {getPaymentNumber()}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => copyToClipboard(getPaymentNumber())}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                    copied ? 'bg-emerald-500 text-white shadow-xl' : 'bg-white text-[#E91E63] shadow-md hover:bg-pink-100'
                  }`}
                >
                  {copied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} />}
                  {copied ? 'Copied!' : 'Copy Number'}
                </button>
              </div>
            </div>

            {/* Section 5: Payment Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-zinc-50 text-zinc-600 rounded-lg">
                  <Hash size={18} />
                </div>
                <h3 className="font-bold text-zinc-900">পেমেন্ট ডিটেইলস দিন</h3>
              </div>

              <div className="space-y-3">
                <div className="relative group">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#E91E63] transition-colors" size={20} />
                  <input 
                    type="tel" 
                    required
                    placeholder="পেমেন্ট সেন্ডার নাম্বার লিখুন *"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 outline-none focus:border-[#E91E63] focus:ring-4 focus:ring-pink-50 transition-all font-medium text-zinc-900 placeholder:text-zinc-400"
                    value={formData.sender_number}
                    onChange={e => setFormData({...formData, sender_number: e.target.value})}
                  />
                </div>
                <div className="relative group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#E91E63] transition-colors" size={20} />
                  <input 
                    type="text" 
                    required
                    placeholder="ট্রানজ্যাকশন আইডি লিখুন *"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-zinc-200 outline-none focus:border-[#E91E63] focus:ring-4 focus:ring-pink-50 transition-all font-mono font-bold text-zinc-900 placeholder:font-sans placeholder:text-zinc-400 placeholder:font-medium"
                    value={formData.transaction_id}
                    onChange={e => setFormData({...formData, transaction_id: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100">
                <Zap size={18} fill="currentColor" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#E91E63] text-white font-black py-5 rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-pink-100 active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Lock size={20} />}
              অর্ডার কনফার্ম করুন
            </button>

            <div className="flex items-center justify-center gap-2 text-zinc-400 font-bold text-xs pb-6">
              <ShieldCheck size={16} />
              আপনার তথ্য ১০০% নিরাপদ এবং গোপনীয়
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
