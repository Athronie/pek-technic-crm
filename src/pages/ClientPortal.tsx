import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { catalogDb, salesDb } from '../lib/db';
import { Client, Price, Product, QuoteLine } from '../types';

interface Props {
  profileId: string;
}

export function ClientPortal({ profileId }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [ptRef, setPtRef] = useState('');
  const [oem, setOem] = useState('');
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);

  useEffect(() => {
    const load = async () => {
      const [productsResult, clientResult] = await Promise.all([
        catalogDb.from('products').select('*').order('created_at', { ascending: false }),
        salesDb.from('clients').select('*').eq('created_by', profileId).maybeSingle()
      ]);

      if (!productsResult.error) setProducts(productsResult.data as Product[]);
      if (!clientResult.error) setClient(clientResult.data as Client | null);

      const pricesResult = await salesDb
        .from('prices')
        .select('*')
        .or(`client_id.is.null,client_id.eq.${clientResult.data?.id ?? -1}`)
        .order('min_qty', { ascending: false });

      if (!pricesResult.error) setPrices(pricesResult.data as Price[]);
    };

    load();
  }, [profileId]);

  const visibleProducts = useMemo(() => {
    return products.filter((product) =>
      (!brand || product.brand_id.toLowerCase().includes(brand.toLowerCase())) &&
      (!category || product.category.toLowerCase().includes(category.toLowerCase())) &&
      (!ptRef || product.pt_ref.toLowerCase().includes(ptRef.toLowerCase())) &&
      (!oem || product.description.toLowerCase().includes(oem.toLowerCase()))
    );
  }, [products, brand, category, ptRef, oem]);

  const getPrice = (productId: number, quantity = 1) => {
    const exactClientRows = prices
      .filter((row) => row.product_id === productId && row.client_id === client?.id && row.min_qty <= quantity)
      .sort((a, b) => b.min_qty - a.min_qty);
    if (exactClientRows.length) return exactClientRows[0];

    const defaultRows = prices
      .filter((row) => row.product_id === productId && row.client_id === null && row.min_qty <= quantity)
      .sort((a, b) => b.min_qty - a.min_qty);
    return defaultRows[0] ?? null;
  };

  const upsertQuoteLine = (product: Product, quantity: number) => {
    setQuoteLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) => (line.product.id === product.id ? { ...line, quantity } : line));
      }
      return [...current, { product, quantity }];
    });
  };

  const requestQuote = async () => {
    if (!client || quoteLines.length === 0) return;
    const { data: quoteRecord } = await salesDb
      .from('quotes')
      .insert({ client_id: client.id, requested_by: profileId, status: 'requested' })
      .select('id')
      .single();

    if (!quoteRecord) return;

    await salesDb.from('quote_items').insert(
      quoteLines.map((line) => {
        const row = getPrice(line.product.id, line.quantity);
        return {
          quote_id: quoteRecord.id,
          product_id: line.product.id,
          quantity: line.quantity,
          unit_price: row?.price ?? 0,
          currency: row?.currency ?? 'USD'
        };
      })
    );

    alert('Quote requested successfully.');
  };

  const exportExcel = () => {
    const data = quoteLines.map((line) => {
      const row = getPrice(line.product.id, line.quantity);
      return {
        PT_REF: line.product.pt_ref,
        DESCRIPTION: line.product.description,
        QTY: line.quantity,
        UNIT_PRICE: row?.price ?? 0,
        CURRENCY: row?.currency ?? 'USD',
        TOTAL: (row?.price ?? 0) * line.quantity
      };
    });

    const sheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Quote');
    XLSX.writeFile(workbook, 'quote.xlsx');
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Quote', 10, 15);

    let y = 30;
    quoteLines.forEach((line) => {
      const row = getPrice(line.product.id, line.quantity);
      const total = (row?.price ?? 0) * line.quantity;
      doc.text(`${line.product.pt_ref} | Qty: ${line.quantity} | ${row?.currency ?? 'USD'} ${total.toFixed(2)}`, 10, y);
      y += 8;
    });

    doc.save('quote.pdf');
  };

  return (
    <main className="shell">
      <h1>Client Portal</h1>
      <p className="muted">{client ? `${client.company_name} (${client.status})` : 'No linked client profile found.'}</p>

      <section className="card">
        <h2>Products and prices</h2>
        <div className="filters">
          <input placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <input placeholder="PT Ref" value={ptRef} onChange={(e) => setPtRef(e.target.value)} />
          <input placeholder="OEM" value={oem} onChange={(e) => setOem(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>PT Ref</th><th>Description</th><th>Category</th><th>Brand</th><th>Price</th><th>Qty</th></tr></thead>
          <tbody>
            {visibleProducts.map((product) => {
              const priceRow = getPrice(product.id, 1);
              return (
                <tr key={product.id}>
                  <td>{product.pt_ref}</td>
                  <td>{product.description}</td>
                  <td>{product.category}</td>
                  <td>{product.brand_id}</td>
                  <td>{priceRow ? `${priceRow.currency} ${priceRow.price}` : 'No price'}</td>
                  <td><input type="number" min={1} defaultValue={1} onChange={(e) => upsertQuoteLine(product, Number(e.target.value))} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Quote builder</h2>
        <p>{quoteLines.length} lines selected.</p>
        <div className="actions">
          <button onClick={requestQuote}>Request quote</button>
          <button onClick={exportPdf}>Export PDF</button>
          <button onClick={exportExcel}>Export Excel</button>
        </div>
      </section>
    </main>
  );
}
