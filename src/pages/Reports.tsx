import React from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  BarChart3, 
  Calendar,
  ArrowRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const data = [
  { name: 'Jan', revenue: 4000, profit: 2400 },
  { name: 'Feb', revenue: 3000, profit: 1398 },
  { name: 'Mar', revenue: 2000, profit: 1800 },
  { name: 'Apr', revenue: 2780, profit: 1908 },
  { name: 'May', revenue: 1890, profit: 1200 },
  { name: 'Jun', revenue: 2390, profit: 1500 },
];

const pieData = [
  { name: 'Monthly', value: 400 },
  { name: 'Quarterly', value: 300 },
  { name: 'Lifetime', value: 300 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

export default function Reports() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Reports & Analytics</h1>
          <p className="text-zinc-500">Deep dive into your sales performance and growth.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl font-medium hover:bg-zinc-50 transition-colors flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-emerald-600" />
            Excel
          </button>
          <button className="bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl font-medium hover:bg-zinc-50 transition-colors flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <BarChart3 size={20} />
              </div>
              <h3 className="font-bold text-zinc-900">Revenue vs Profit</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-zinc-500">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5 ml-4">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <span className="text-xs text-zinc-500">Profit</span>
              </div>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Mix */}
        <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <PieChartIcon size={20} />
            </div>
            <h3 className="font-bold text-zinc-900">Product Mix</h3>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-\${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm text-zinc-600">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-zinc-900">{item.value} sales</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Monthly Profit Report', desc: 'Detailed breakdown of net profit and margins.', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Customer Retention', desc: 'Analyze returning customers and lifetime value.', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Tax Summary', desc: 'Simplified report for tax filing and accounting.', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((report, i) => (
          <button key={i} className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm hover:border-zinc-300 hover:shadow-md transition-all text-left group">
            <div className={`w-12 h-12 \${report.bg} \${report.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <report.icon size={24} />
            </div>
            <h4 className="font-bold text-zinc-900 mb-2">{report.title}</h4>
            <p className="text-sm text-zinc-500 mb-4">{report.desc}</p>
            <div className="flex items-center gap-1 text-sm font-bold text-zinc-900">
              Generate <ArrowRight size={16} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
