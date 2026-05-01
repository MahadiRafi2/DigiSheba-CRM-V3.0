import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  BarChart3, 
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Calendar
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';

export default function Dashboard() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/enhanced-stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(setStats);

    fetch('/api/sales', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setRecentOrders(data.slice(0, 5)));
  }, [token]);

  const handleStatusUpdate = async (id: number, status: string) => {
    await fetch(`/api/sales/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    
    // Refresh data
    const res = await fetch('/api/sales', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRecentOrders(data.slice(0, 5));
    
    // Refresh stats
    fetch('/api/enhanced-stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(setStats);
  };

  const formatDateSafely = (dateStr: string, formatStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return format(d, formatStr);
    } catch (e) {
      return 'Error';
    }
  };

  if (!stats) return <div className="p-8">Loading dashboard...</div>;
  if (stats.error) return <div className="p-8 text-red-500">Error: {stats.error}</div>;

  const profit = stats.profit || 0;
  const lifetime = stats.lifetime || 0;
  const customersCount = stats.customers || 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Admin Dashboard</h1>
          <p className="text-zinc-500">Real-time overview of your digital sales and analytics.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-xl font-bold text-sm self-start">
          <Clock size={16} /> Live Status
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Daily" value={`৳${stats.daily || 0}`} color="purple" icon={TrendingUp} />
        <StatCard title="Weekly" value={`৳${stats.weekly || 0}`} color="blue" icon={TrendingUp} />
        <StatCard title="Monthly" value={`৳${stats.monthly || 0}`} color="emerald" icon={TrendingUp} />
        <StatCard title="Yearly" value={`৳${stats.yearly || 0}`} color="amber" icon={TrendingUp} />
        <StatCard title="Lifetime" value={`৳${lifetime}`} color="zinc" icon={BarChart3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
            <h3 className="font-bold text-zinc-900">Recent Orders</h3>
            <button className="text-xs font-bold text-purple-600 hover:underline">View All Orders</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/30 text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-400">No orders yet</td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-zinc-900">{order.customer_name}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          {formatDateSafely(order.date, 'dd MMM, HH:mm')}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-zinc-100 text-zinc-600">
                          {order.product_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                          order.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 
                          order.status === 'Rejected' ? 'bg-red-50 text-red-600' : 
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {order.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {order.status === 'Pending' && (
                            <>
                              <button 
                                onClick={() => handleStatusUpdate(order.id, 'Approved')}
                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(order.id, 'Rejected')}
                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                title="Reject"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          <button className="p-1.5 text-zinc-400 hover:text-zinc-600 transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative group">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all" />
            <h3 className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-2">Total Profit</h3>
            <p className="text-4xl font-bold">৳{profit.toLocaleString()}</p>
            <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Customers</p>
                <p className="text-lg font-bold text-blue-400">{customersCount}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Margins</p>
                <p className="text-lg font-bold text-emerald-400">{lifetime > 0 ? ((profit / lifetime) * 100).toFixed(1) : 0}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-purple-600" /> Revenue Forecast
            </h3>
            <div className="space-y-6">
              <div className="h-32 flex items-end gap-1.5">
                {[30, 50, 40, 80, 60, 90, 70, 85, 45, 60, 75, 95].map((h, i) => (
                  <div key={i} className="flex-1 bg-zinc-100 rounded-t-md group relative cursor-pointer hover:bg-purple-500 transition-colors" style={{ height: `${h}%` }}>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      ৳{h * 150}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[8px] font-black text-zinc-300 uppercase tracking-tighter">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
                <span>Dec</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon: Icon }: any) {
  const colors: any = {
    purple: 'bg-purple-50 text-purple-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    zinc: 'bg-zinc-100 text-zinc-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group">
      <div className={`w-10 h-10 ${colors[color]} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
      <p className="text-xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}
