import { FormEvent, useEffect, useMemo, useState } from 'react';
import { catalogDb, salesDb } from '../lib/db';
import { Client, Price, Product } from '../types';

interface Props {
  profileId: string;
}

const defaultProductForm = { pt_ref: '', description: '', category: '', brand_id: '' };
const defaultClientForm = { company_name: '', contact_person: '' };
const defaultPriceForm = { product_id: '', client_id: '', currency: 'USD', min_qty: 1, price: 0 };

export function AdminDashboard({ profileId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [productForm, setProductForm] = useState(defaultProductForm);
  const [clientForm, setClientForm] = useState(defaultClientForm);
  const [priceForm, setPriceForm] = useState(defaultPriceForm);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  const refresh = async () => {
    const [productsResult, clientsResult, pricesResult] = await Promise.all([
      catalogDb.from('products').select('*').order('created_at', { ascending: false }),
      salesDb.from('clients').select('*').order('created_at', { ascending: false }),
      salesDb.from('prices').select('*').order('created_at', { ascending: false })
    ]);

    if (!productsResult.error) setProducts(productsResult.data as Product[]);
    if (!clientsResult.error) setClients(clientsResult.data as Client[]);
    if (!pricesResult.error) setPrices(pricesResult.data as Price[]);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchValue = `${product.pt_ref} ${product.description}`.toLowerCase();
      return (
        searchValue.includes(search.toLowerCase()) &&
        (!categoryFilter || product.category === categoryFilter) &&
        (!brandFilter || product.brand_id === brandFilter)
      );
    });
  }, [products, search, categoryFilter, brandFilter]);

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { ...productForm };

    if (editingProductId) {
      await catalogDb.from('products').update(payload).eq('id', editingProductId);
    } else {
      await catalogDb.from('products').insert(payload);
    }

    setProductForm(defaultProductForm);
    setEditingProductId(null);
    await refresh();
  };

  const saveClient = async (event: FormEvent) => {
    event.preventDefault();
    await salesDb.from('clients').insert({ ...clientForm, created_by: profileId, status: 'pending' });
    setClientForm(defaultClientForm);
    await refresh();
  };

  const setClientStatus = async (clientId: number, status: Client['status']) => {
    await salesDb.from('clients').update({ status }).eq('id', clientId);
    await refresh();
  };

  const savePrice = async (event: FormEvent) => {
    event.preventDefault();
    await salesDb.from('prices').insert({
      product_id: Number(priceForm.product_id),
      client_id: priceForm.client_id ? Number(priceForm.client_id) : null,
      currency: priceForm.currency,
      min_qty: Number(priceForm.min_qty),
      price: Number(priceForm.price)
    });
    setPriceForm(defaultPriceForm);
    await refresh();
  };

  const deleteProduct = async (id: number) => {
    await catalogDb.from('products').delete().eq('id', id);
    await refresh();
  };

  return (
    <main className="shell">
      <h1>Admin Dashboard</h1>
      <div className="grid two">
        <section className="card">
          <h2>Products management</h2>
          <p className="muted">Excel import placeholder ready for later integration.</p>
          <button className="secondary" disabled>Import from Excel (coming soon)</button>
          <form onSubmit={saveProduct}>
            <label>PT Ref<input value={productForm.pt_ref} onChange={(e) => setProductForm((s) => ({ ...s, pt_ref: e.target.value }))} required /></label>
            <label>Description<input value={productForm.description} onChange={(e) => setProductForm((s) => ({ ...s, description: e.target.value }))} required /></label>
            <label>Category<input value={productForm.category} onChange={(e) => setProductForm((s) => ({ ...s, category: e.target.value }))} required /></label>
            <label>Brand<input value={productForm.brand_id} onChange={(e) => setProductForm((s) => ({ ...s, brand_id: e.target.value }))} required /></label>
            <button type="submit">{editingProductId ? 'Update product' : 'Add product'}</button>
          </form>

          <div className="filters">
            <input placeholder="Search PT Ref / OEM / description" value={search} onChange={(e) => setSearch(e.target.value)} />
            <input placeholder="Filter category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} />
            <input placeholder="Filter brand" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} />
          </div>

          <table>
            <thead><tr><th>PT Ref</th><th>Description</th><th>Category</th><th>Brand</th><th /></tr></thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>{product.pt_ref}</td><td>{product.description}</td><td>{product.category}</td><td>{product.brand_id}</td>
                  <td>
                    <button onClick={() => { setEditingProductId(product.id); setProductForm(product); }}>Edit</button>
                    <button className="danger" onClick={() => deleteProduct(product.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>Client onboarding approvals</h2>
          <form onSubmit={saveClient}>
            <label>Company<input value={clientForm.company_name} onChange={(e) => setClientForm((s) => ({ ...s, company_name: e.target.value }))} required /></label>
            <label>Contact person<input value={clientForm.contact_person} onChange={(e) => setClientForm((s) => ({ ...s, contact_person: e.target.value }))} required /></label>
            <button type="submit">Create onboarding request</button>
          </form>
          <table>
            <thead><tr><th>Company</th><th>Contact</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.company_name}</td><td>{client.contact_person}</td><td>{client.status}</td>
                  <td>
                    <button onClick={() => setClientStatus(client.id, 'approved')}>Approve</button>
                    <button onClick={() => setClientStatus(client.id, 'rejected')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card">
        <h2>Price management</h2>
        <form className="inline" onSubmit={savePrice}>
          <select value={priceForm.product_id} onChange={(e) => setPriceForm((s) => ({ ...s, product_id: e.target.value }))} required>
            <option value="">Select product</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.pt_ref}</option>)}
          </select>
          <select value={priceForm.client_id} onChange={(e) => setPriceForm((s) => ({ ...s, client_id: e.target.value }))}>
            <option value="">Default price (all clients)</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}
          </select>
          <input placeholder="Currency" value={priceForm.currency} onChange={(e) => setPriceForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))} required />
          <input type="number" min={1} placeholder="Min qty" value={priceForm.min_qty} onChange={(e) => setPriceForm((s) => ({ ...s, min_qty: Number(e.target.value) }))} required />
          <input type="number" min={0} step="0.01" placeholder="Price" value={priceForm.price} onChange={(e) => setPriceForm((s) => ({ ...s, price: Number(e.target.value) }))} required />
          <button type="submit">Save price row</button>
        </form>

        <table>
          <thead><tr><th>Product</th><th>Client scope</th><th>Currency</th><th>Min Qty</th><th>Price</th></tr></thead>
          <tbody>
            {prices.map((price) => (
              <tr key={price.id}>
                <td>{products.find((product) => product.id === price.product_id)?.pt_ref ?? price.product_id}</td>
                <td>{price.client_id ? clients.find((client) => client.id === price.client_id)?.company_name : 'Default'}</td>
                <td>{price.currency}</td>
                <td>{price.min_qty}</td>
                <td>{price.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
