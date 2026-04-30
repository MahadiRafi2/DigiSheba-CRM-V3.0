import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Product } from '../types';
import { Plus, Package, Edit2, Trash2, DollarSign, Mail, X, Save } from 'lucide-react';

export default function Products() {
  const { token } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [template, setTemplate] = useState({ subject: '', body: '' });
  const [savingTemplate, setSavingTemplate] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    type: '1month',
    selling_price: 0
  });

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchProducts = () => {
    fetch('/api/products', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(setProducts);
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(newProduct)
    });

    setIsModalOpen(false);
    setNewProduct({ name: '', type: '1month', selling_price: 0 });
    setEditingProduct(null);
    fetchProducts();
  };

  const handleDelete = async (id: number) => {
    console.log('Initiating delete for product ID:', id);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        console.log('Product deleted successfully');
        fetchProducts();
      } else {
        const err = await res.json();
        console.error('Delete failed:', err);
        alert(err.error || 'Failed to delete product');
      }
    } catch (err) {
      console.error('Network error during delete:', err);
      alert('An error occurred while deleting product');
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      type: product.type,
      selling_price: product.selling_price
    });
    setIsModalOpen(true);
  };

  const openTemplateModal = async (product: Product) => {
    setSelectedProduct(product);
    const res = await fetch(`/api/products/${product.id}/template`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setTemplate(data);
  };

  const saveTemplate = async () => {
    if (!selectedProduct) return;
    setSavingTemplate(true);
    await fetch(`/api/products/${selectedProduct.id}/template`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(template)
    });
    setSavingTemplate(false);
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Products</h1>
          <p className="text-zinc-500">Manage your digital products and pricing.</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setNewProduct({ name: '', type: '1month', selling_price: 0 });
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-zinc-100 text-zinc-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <Package size={24} />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openTemplateModal(product)}
                  className="p-2 text-zinc-400 hover:text-emerald-600 transition-colors"
                  title="Email Template"
                >
                  <Mail size={18} />
                </button>
                <button 
                  onClick={() => openEditModal(product)}
                  className="p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                {deletingId === product.id ? (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700 transition-colors"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="px-2 py-1 bg-zinc-200 text-zinc-600 text-[10px] font-bold rounded hover:bg-zinc-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setDeletingId(product.id)}
                    className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                    title="Delete Product"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-zinc-900">{product.name}</h3>
            <span className="inline-block mt-1 px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider rounded">
              {product.type}
            </span>

            <div className="mt-6">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Selling Price</p>
                <p className="text-xl font-bold text-emerald-700">৳{product.selling_price}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Package size={20} />
                </div>
                <h3 className="font-bold text-zinc-900">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Product Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Type</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  value={newProduct.type}
                  onChange={e => setNewProduct({...newProduct, type: e.target.value as any})}
                >
                  <option value="1month">1 Month</option>
                  <option value="3month">3 Months</option>
                  <option value="6month">6 Months</option>
                  <option value="1year">1 Year</option>
                  <option value="2year">2 Years</option>
                  <option value="3year">3 Years</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Selling Price (৳)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    value={newProduct.selling_price}
                    onChange={e => setNewProduct({...newProduct, selling_price: parseFloat(e.target.value)})}
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
                  className="flex-1 bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {editingProduct ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">Email Template</h3>
                  <p className="text-xs text-zinc-500">{selectedProduct.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-zinc-400 hover:text-zinc-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Subject</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Renewal Reminder: {{product_name}}"
                  value={template.subject}
                  onChange={e => setTemplate({...template, subject: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Body (HTML supported)</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[200px]"
                  placeholder="Hi {{customer_name}}, your subscription for {{product_name}} expires on {{renewal_date}}..."
                  value={template.body}
                  onChange={e => setTemplate({...template, body: e.target.value})}
                />
                <p className="text-[10px] text-zinc-400">
                  Available placeholders: <code className="bg-zinc-100 px-1">{"{{customer_name}}"}</code>, <code className="bg-zinc-100 px-1">{"{{product_name}}"}</code>, <code className="bg-zinc-100 px-1">{"{{renewal_date}}"}</code>
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedProduct(null)}
                className="px-6 py-2 rounded-xl font-bold text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveTemplate}
                disabled={savingTemplate}
                className="bg-zinc-900 text-white px-8 py-2 rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={20} />
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
