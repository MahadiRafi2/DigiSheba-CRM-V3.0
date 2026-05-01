import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Sale, Customer, Product } from '../types';
import { Plus, Search, Filter, Download, CreditCard, Calendar, X, Save, ShoppingCart, CheckCircle, XCircle, MoreVertical, Edit, Trash2, RefreshCw, Upload, FileDown, FileSpreadsheet } from 'lucide-react';
import { addMonths, format, addDays } from 'date-fns';
import * as XLSX from 'xlsx';

export default function Sales() {
  const { token } = useAuthStore();
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const [newSale, setNewSale] = useState({
    name: '',
    email: '',
    phone: '',
    product_id: '',
    amount: 0,
    payment_method: 'bKash',
    date: format(new Date(), 'yyyy-MM-dd'),
    renewal_date: ''
  });

  const filteredSales = (Array.isArray(sales) ? sales : []).filter(sale => {
    const matchesSearch = 
      sale.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.phone?.includes(searchQuery) ||
      sale.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.id?.toString().includes(searchQuery);
    
    const matchesStatus = filterStatus === 'All' || sale.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const handleStatusUpdate = async (id: number, status: string) => {
    await fetch(`/api/sales/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    fetchData();
  };

  const handleDelete = async (id: number) => {
    console.log('Attempting to delete sale with ID:', id);
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        console.log('Sale deleted successfully');
        fetchData();
      } else {
        const err = await res.json();
        console.error('Delete failed:', err);
        alert(`Error: ${err.error || 'Failed to delete'}`);
      }
    } catch (err) {
      console.error('Network or other error during delete:', err);
      alert('An unexpected error occurred during deletion.');
    }
  };

  const handleEdit = (sale: any) => {
    setEditingSale(sale);
    
    // Ensure dates are in YYYY-MM-DD format for input type="date"
    const formatDateForInput = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    };

    setNewSale({
      name: sale.customer_name,
      email: sale.email,
      phone: sale.phone || '',
      product_id: sale.product_id.toString(),
      amount: sale.amount,
      payment_method: sale.payment_method,
      date: formatDateForInput(sale.date),
      renewal_date: formatDateForInput(sale.renewal_date)
    });
    setIsModalOpen(true);
  };

  const fetchData = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    
    try {
      const [salesRes, prodRes] = await Promise.all([
        fetch('/api/sales', { headers }),
        fetch('/api/products', { headers })
      ]);
      
      const salesData = await salesRes.json();
      const productsData = await prodRes.json();
      
      setSales(Array.isArray(salesData) ? salesData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setSales([]);
      setProducts([]);
    }
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

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
      let renewalDate = '';
      const saleDate = new Date(newSale.date);
      
      if (product.type === '1month') {
        renewalDate = format(addMonths(saleDate, 1), 'yyyy-MM-dd');
      } else if (product.type === '3month') {
        renewalDate = format(addMonths(saleDate, 3), 'yyyy-MM-dd');
      } else if (product.type === '6month') {
        renewalDate = format(addMonths(saleDate, 6), 'yyyy-MM-dd');
      } else if (product.type === '1year') {
        renewalDate = format(addMonths(saleDate, 12), 'yyyy-MM-dd');
      } else if (product.type === '2year') {
        renewalDate = format(addMonths(saleDate, 24), 'yyyy-MM-dd');
      } else if (product.type === '3year') {
        renewalDate = format(addMonths(saleDate, 36), 'yyyy-MM-dd');
      } else if (product.type === 'lifetime') {
        renewalDate = ''; // No renewal for lifetime
      }

      setNewSale({
        ...newSale,
        product_id: productId,
        amount: product.selling_price,
        renewal_date: renewalDate
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSale.name || !newSale.email || !newSale.product_id) return;
    
    setIsSubmitting(true);
    try {
      const profit = newSale.amount;
      
      const endpoint = editingSale ? `/api/sales/${editingSale.id}` : '/api/sales';
      const method = editingSale ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newSale,
          customer_name: newSale.name, // Mapping UI state to DB field
          profit,
          product_id: parseInt(newSale.product_id)
        })
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setEditingSale(null);
        setNewSale({
          name: '',
          email: '',
          phone: '',
          product_id: '',
          amount: 0,
          payment_method: 'bKash',
          date: format(new Date(), 'yyyy-MM-dd'),
          renewal_date: ''
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
    setIsSubmitting(false);
  };

  const exportToCSV = () => {
    const headers = ['Order ID', 'Customer', 'Product', 'Amount', 'Status', 'Date'];
    const csvData = sales.map(s => [
      s.id,
      s.customer_name,
      s.product_name,
      s.amount,
      s.status || 'Pending',
      s.date
    ]);
    
    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadDemoSheet = () => {
    const demoData = [
      {
        'Customer Name': 'John Doe',
        'Email': 'john@example.com',
        'Mobile Number': '01700000000',
        'Product Name': 'Basic Plan',
        'Amount': 500,
        'Profit': 200,
        'Payment Method': 'bKash',
        'Date': '2024-01-01',
        'Renewal Date': '2024-02-01'
      },
      {
        'Customer Name': 'Jane Smith',
        'Email': 'jane@example.com',
        'Mobile Number': '01800000000',
        'Product Name': 'Premium Plan',
        'Amount': 1500,
        'Profit': 500,
        'Payment Method': 'Nagad',
        'Date': '2024-01-05',
        'Renewal Date': '2025-01-05'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(demoData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "import_demo.xlsx");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const formattedOrders = data.map(item => ({
          customer_name: item['Customer Name'] || item['customer_name'] || item['Name'] || item['Customer'] || item['Client'],
          email: item['Email'] || item['email'] || item['E-mail'],
          phone: item['Phone'] || item['phone'] || item['Phone Number'] || item['Mobile'] || item['Contact'] || item['Mobile Number'] || item['WhatsApp'],
          product_name: item['Product Name'] || item['product_name'] || item['Product'] || item['Item'],
          amount: parseFloat(item['Amount'] || item['amount'] || item['Price'] || item['Total'] || 0),
          profit: parseFloat(item['Profit'] || item['profit'] || 0),
          payment_method: item['Payment Method'] || item['payment_method'] || item['Payment'] || item['Gateway'] || item['Method'],
          date: item['Date'] || item['date'] || item['Sale Date'] || item['Created At'],
          renewal_date: item['Renewal Date'] || item['renewal_date'] || item['Next Payment'] || item['Expiry Date']
        })).filter(o => o.customer_name && o.product_name);

        if (formattedOrders.length === 0) {
          alert('No valid orders found in the sheet.');
          setImporting(false);
          return;
        }

        const res = await fetch('/api/sales/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ orders: formattedOrders })
        });

        if (res.ok) {
          const result = await res.json();
          alert(`Successfully imported ${result.count} orders!`);
          setIsImportModalOpen(false);
          fetchData();
        } else {
          const err = await res.json();
          alert(`Import failed: ${err.error}`);
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
      } finally {
        setImporting(false);
        e.target.value = ''; // Reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Sales History</h1>
          <p className="text-zinc-500">Track every transaction and renewal.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-zinc-100 text-zinc-700 px-4 py-2 rounded-xl font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <Upload size={20} />
            Import CSV/Excel
          </button>
          <button 
            onClick={exportToCSV}
            className="bg-zinc-100 text-zinc-700 px-4 py-2 rounded-xl font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
          >
            <Download size={20} />
            Export CSV
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            New Sale
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search sales..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <select 
                className="pl-10 pr-3 py-2 rounded-lg border border-zinc-200 text-sm outline-none appearance-none bg-white cursor-pointer hover:bg-zinc-50"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Sale Date</th>
                <th className="px-6 py-4 font-semibold">Renewal Date</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Payment</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedSales.length > 0 ? paginatedSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-900 font-bold">
                      {formatDateSafely(sale.date, 'dd MMM, yy')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-zinc-900 font-bold">
                        {formatDateSafely(sale.renewal_date, 'dd MMM, yy')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-zinc-900">{sale.customer_name}</p>
                    <p className="text-[10px] text-zinc-400">{sale.phone || 'No Phone'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-zinc-600">{sale.product_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-zinc-900">৳{sale.amount.toFixed(2)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-zinc-500 font-medium">{sale.payment_method}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                      sale.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 
                      sale.status === 'Rejected' ? 'bg-red-50 text-red-600' : 
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {sale.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {sale.status === 'Pending' ? (
                        <>
                          <button 
                            onClick={() => handleStatusUpdate(sale.id, 'Approved')}
                            title="Approve Order"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(sale.id, 'Rejected')}
                            title="Reject Order"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => handleStatusUpdate(sale.id, 'Pending')}
                          title="Reset to Pending"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <RefreshCw size={16} />
                        </button>
                      )}
                      <div className="w-px h-4 bg-zinc-200 mx-1" />
                      <button 
                        onClick={() => handleEdit(sale)}
                        title="Edit Order"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(sale.id);
                        }}
                        title="Delete Order"
                        className="p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-400">
                    No sales found.
                  </td>
                </tr>
              )}
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
                // Show first page, last page, and pages around current page
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
                
                // Show dots
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

      {/* New Sale Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <ShoppingCart size={20} />
                </div>
                <h3 className="font-bold text-zinc-900">{editingSale ? 'Edit Order' : 'Enter New Sale'}</h3>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingSale(null);
                  setNewSale({
                    name: '',
                    email: '',
                    phone: '',
                    product_id: '',
                    amount: 0,
                    payment_method: 'bKash',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    renewal_date: ''
                  });
                }} 
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Customer Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="John Doe"
                      value={newSale.name}
                      onChange={e => setNewSale({...newSale, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="john@example.com"
                      value={newSale.email}
                      onChange={e => setNewSale({...newSale, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Phone (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="+123456789"
                      value={newSale.phone}
                      onChange={e => setNewSale({...newSale, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Product</label>
                    <select 
                      required
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={newSale.product_id}
                      onChange={e => handleProductChange(e.target.value)}
                    >
                      <option value="">Choose a product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (৳{p.selling_price})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sale Amount (৳)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newSale.amount}
                    onChange={e => setNewSale({...newSale, amount: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Payment Method</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newSale.payment_method}
                    onChange={e => setNewSale({...newSale, payment_method: e.target.value})}
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sale Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newSale.date}
                    onChange={e => setNewSale({...newSale, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Renewal Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newSale.renewal_date}
                    onChange={e => setNewSale({...newSale, renewal_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {isSubmitting ? 'Saving...' : editingSale ? 'Update Order' : 'Record Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Upload size={20} />
                </div>
                <h3 className="font-bold text-zinc-900">Import Orders</h3>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 bg-zinc-50 rounded-full text-zinc-400 border border-zinc-100 mb-2">
                  <FileSpreadsheet size={32} />
                </div>
                <h4 className="font-bold text-zinc-900">Choose your Excel/CSV file</h4>
                <p className="text-sm text-zinc-500">Upload your orders list to import them instantly.</p>
              </div>

              <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 hover:border-blue-400 transition-colors text-center relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv"
                  onChange={handleImportFile}
                  disabled={importing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <p className="text-sm font-medium text-zinc-600">
                  {importing ? "Importing data, please wait..." : "Click to select or drag and drop"}
                </p>
                <p className="text-[10px] text-zinc-400 mt-1">.xlsx, .xls or .csv formats supported</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <FileDown className="text-blue-500 shrink-0" size={18} />
                <div>
                  <h5 className="text-sm font-bold text-blue-900">Need help with formatting?</h5>
                  <p className="text-[11px] text-blue-700 mb-2">Download our demo sheet to see the required column names and structure.</p>
                  <button 
                    onClick={downloadDemoSheet}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Download Demo Template
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="w-full py-3 rounded-xl font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
