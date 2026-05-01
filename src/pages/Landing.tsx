import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Mail, User, Phone, CheckCircle, ArrowRight, Zap, Shield } from 'lucide-react';
import { Product } from '../types';
import { useBrandingStore } from '../store/brandingStore';
import { useAuthStore } from '../store/authStore';

export default function Landing() {
  const navigate = useNavigate();
  const { siteName, logoUrl, showFloatingLogin } = useBrandingStore();
  const token = useAuthStore(state => state.token);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    product_id: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/public/products')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Landing fetch error:', err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id) return;
    
    setIsSubmitting(true);
    
    try {
      const product = products.find(p => p.id === parseInt(formData.product_id));
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: product?.selling_price || 0,
          payment_method: 'bKash'
        })
      });

      if (res.ok) {
        setSuccess(true);
        setFormData({ name: '', email: '', phone: '', product_id: '' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-medium">Loading {siteName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:h-screen lg:overflow-hidden bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-zinc-100 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-10 w-auto object-contain" />
            ) : (
              <>
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                  {siteName?.[0] || 'D'}
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">{siteName}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/canva-renewal')} 
              className="text-sm font-bold text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
            >
              Canva Renewal <Zap size={16} fill="currentColor" />
            </button>
            <button 
              onClick={() => navigate('/track')} 
              className="text-sm font-semibold text-zinc-600 hover:text-purple-600 transition-colors flex items-center gap-2"
            >
              Track Order <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-grow flex items-center py-12 lg:py-0 px-6 overflow-y-auto lg:overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-full text-sm font-bold tracking-wide uppercase">
              Premium Digital Products
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-zinc-900 leading-[1.1] tracking-tight">
              Get Your Digital Access <span className="text-purple-600">Instantly.</span>
            </h1>
            <p className="text-xl text-zinc-500 max-w-lg leading-relaxed">
              Join thousands of happy customers and get access to the best digital products with lifetime support and automatic renewals.
            </p>
            <div className="flex items-center gap-8 pt-4">
              <div className="flex -space-x-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-zinc-200" />
                ))}
              </div>
              <div>
                <p className="font-bold text-zinc-900">4,000+ Happy Users</p>
                <div className="flex gap-1 text-amber-400">
                  {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 lg:p-12 rounded-[2.5rem] shadow-2xl shadow-purple-200/50 border border-purple-50">
            {success ? (
              <div className="text-center py-12 space-y-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} />
                </div>
                <h3 className="text-3xl font-bold text-zinc-900">Order Received!</h3>
                <p className="text-zinc-500">We've received your order. Please wait for our team to approve it. You will receive an email shortly.</p>
                <button 
                  onClick={() => setSuccess(false)} 
                  className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all"
                >
                  Order Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-zinc-900">Order Now</h3>
                  <p className="text-zinc-500">Fill in the details to get started</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <input 
                      type="text" 
                      required
                      placeholder="Your Full Name"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <input 
                      type="email" 
                      required
                      placeholder="Email Address"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <input 
                      type="tel" 
                      required
                      placeholder="Phone Number"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <select 
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-100 bg-zinc-50 outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                      value={formData.product_id}
                      onChange={e => setFormData({...formData, product_id: e.target.value})}
                    >
                      <option value="">Select Package</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - ৳{p.selling_price}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting || loading}
                  className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Place Order Now'}
                  <ArrowRight size={20} />
                </button>
                <p className="text-center text-xs text-zinc-400">Secure ৳ payment via bKash / Nagad / Rocket</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Floating Admin Login Button */}
      {showFloatingLogin && (
        <button 
          onClick={() => navigate(token ? '/admin' : '/login')}
          className="fixed bottom-8 right-8 w-14 h-14 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-50 group overflow-hidden"
          title={token ? "Admin Dashboard" : "Admin Login"}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Shield size={24} className="group-hover:rotate-12 transition-transform" />
          <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full border-2 border-zinc-900 animate-pulse" />
        </button>
      )}
    </div>
  );
}
