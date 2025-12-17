import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiTruck,
  FiCreditCard,
  FiUser,
  FiPackage,
  FiClock,
  FiTag,
} from 'react-icons/fi';
import Loader from '../components/Loader';
import {
  fetchAllOrders,
  updateOrderStatus,
  setPage as setAdminOrdersPage,
} from '../redux/slices/adminOrderSlice';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const LIMIT_OPTIONS = [10, 20, 50];

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-slate-100 text-slate-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-sky-100 text-sky-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

const PAYMENT_STYLES = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-rose-100 text-rose-800',
  refunded: 'bg-slate-100 text-slate-800',
};

const defaultPagination = {
  currentPage: 1,
  totalPages: 1,
  totalOrders: 0,
  hasNext: false,
  hasPrev: false,
};

const formatCurrency = (value = 0) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '--');
const shortId = (value = '') => `ORD-${String(value).slice(-6).toUpperCase()}`;

export default function AdminOrders() {
  const dispatch = useDispatch();
  const adminOrdersState = useSelector((state) => state.adminOrders);
  const {
    orders = [],
    loading,
    error,
    pagination: paginationState,
  } = adminOrdersState;
  const pagination = paginationState || defaultPagination;

  const [statusFilter, setStatusFilter] = useState('');
  const [limit, setLimit] = useState(LIMIT_OPTIONS[0]);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusForm, setStatusForm] = useState({
    status: 'pending',
    trackingNumber: '',
    notes: '',
  });
  const [showModal, setShowModal] = useState(false);

  const isInitialLoading = loading && orders.length === 0;
  const inlineLoading = loading && orders.length > 0;

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchValue.trim()), 400);
    return () => clearTimeout(handler);
  }, [searchValue]);

  const queryParams = useMemo(() => {
    const params = {
      page: pagination.currentPage,
      limit,
    };
    if (statusFilter) params.status = statusFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [pagination.currentPage, limit, statusFilter, debouncedSearch]);

  useEffect(() => {
    dispatch(fetchAllOrders(queryParams));
  }, [dispatch, queryParams]);

  const statusSummary = useMemo(() => {
    const base = STATUS_OPTIONS.filter((option) => option.value).reduce((acc, option) => {
      acc[option.value] = 0;
      return acc;
    }, {});
    orders.forEach((order) => {
      if (order.status && base[order.status] !== undefined) {
        base[order.status] += 1;
      }
    });
    return base;
  }, [orders]);

  const visibleRevenue = useMemo(() => (
    orders.reduce((acc, order) => acc + (order.total || 0), 0)
  ), [orders]);

  const handleRefresh = () => {
    dispatch(fetchAllOrders(queryParams));
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    if (pagination.currentPage !== 1) {
      dispatch(setAdminOrdersPage(1));
    }
  };

  const handleLimitChange = (value) => {
    setLimit(value);
    if (pagination.currentPage !== 1) {
      dispatch(setAdminOrdersPage(1));
    }
  };

  const handleSearchChange = (value) => {
    setSearchValue(value);
    if (pagination.currentPage !== 1) {
      dispatch(setAdminOrdersPage(1));
    }
  };

  const openStatusModal = (order) => {
    setSelectedOrder(order);
    setStatusForm({
      status: order.status || 'pending',
      trackingNumber: order.trackingNumber || '',
      notes: order.notes || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const handleStatusSubmit = async (event) => {
    event.preventDefault();
    if (!selectedOrder) return;

    const payload = {
      status: statusForm.status,
      trackingNumber: statusForm.trackingNumber.trim() || undefined,
      notes: statusForm.notes.trim() || undefined,
    };

    try {
      await dispatch(updateOrderStatus({ id: selectedOrder._id, statusData: payload })).unwrap();
      toast.success('Order status updated');
      closeModal();
      dispatch(fetchAllOrders(queryParams));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to update order status');
    }
  };

  const handlePageChange = (direction) => {
    const nextPage = pagination.currentPage + direction;
    if (nextPage < 1 || nextPage > Math.max(pagination.totalPages, 1)) return;
    dispatch(setAdminOrdersPage(nextPage));
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSearchValue('');
    setLimit(LIMIT_OPTIONS[0]);
    if (pagination.currentPage !== 1) {
      dispatch(setAdminOrdersPage(1));
    }
  };

  if (isInitialLoading) {
    return <Loader />;
  }

  if (error && orders.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-rose-700 mb-2">Unable to load orders</h2>
          <p className="text-sm text-rose-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
          >
            <FiRefreshCw />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Operations</p>
          <h1 className="text-3xl font-bold text-slate-900">Order Management</h1>
          <p className="text-sm text-slate-500">
            Review every order, track fulfilment, and keep customers updated in real time.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            <FiRefreshCw className="text-slate-500" />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-rose-50 p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/70 bg-white px-3">
              <FiSearch className="text-slate-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Customer, phone or order ID"
                className="w-full border-0 bg-transparent py-2 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/70 bg-white px-3">
              <FiFilter className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-full border-0 bg-transparent py-2 text-sm focus:outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Page size</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/70 bg-white px-3">
              <FiTag className="text-slate-400" />
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="w-full border-0 bg-transparent py-2 text-sm focus:outline-none"
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option} per page</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Visible revenue</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(visibleRevenue)}</p>
          <p className="text-xs text-slate-500">Across {orders.length} orders in view</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">In transit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{(statusSummary.shipped || 0) + (statusSummary.processing || 0)}</p>
          <p className="text-xs text-slate-500">Processing + shipped</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Delivered</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{statusSummary.delivered || 0}</p>
          <p className="text-xs text-slate-500">Completed journeys</p>
        </div>
      </div>

      {inlineLoading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Syncing latest updates...
        </div>
      )}

      {error && orders.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {orders.length === 0 && !inlineLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
          <p className="text-lg font-semibold text-slate-700">No orders match your filters</p>
          <p className="text-sm">Try adjusting the filters or refresh the feed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusLabel = STATUS_OPTIONS.find((option) => option.value === order.status)?.label || order.status;
            const paymentStatus = order.payment?.status || 'pending';
            const customMix = Array.isArray(order.items) && order.items.some((item) => typeof item.productId === 'string' && item.productId.startsWith('custom_'));
            const lineItems = Array.isArray(order.items) ? order.items : [];

            return (
              <article key={order._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{order.orderNumber || shortId(order._id)}</p>
                    <p className="text-xs text-slate-500">Placed {formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-full px-3 py-1 font-semibold ${STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-700'}`}>
                      {statusLabel || 'Unknown status'}
                    </span>
                    <span className={`rounded-full px-3 py-1 font-semibold ${PAYMENT_STYLES[paymentStatus] || 'bg-slate-100 text-slate-600'}`}>
                      {paymentStatus}
                    </span>
                    {customMix && (
                      <span className="rounded-full bg-fuchsia-100 px-3 py-1 font-semibold text-fuchsia-700">
                        Includes custom items
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="rounded-full bg-slate-100 p-2 text-slate-500">
                      <FiUser />
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Customer</p>
                      <p className="text-sm font-semibold text-slate-900">{order.shippingAddress?.name || order.userId?.name || 'Guest'}</p>
                      <p className="text-xs text-slate-500">{order.userId?.email || order.shippingAddress?.phone || '—'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="rounded-full bg-slate-100 p-2 text-slate-500">
                      <FiPackage />
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Items</p>
                      <p className="text-sm font-semibold text-slate-900">{lineItems.length} products</p>
                      <p className="text-xs text-slate-500">{lineItems.slice(0, 2).map((item) => `${item.title || 'Item'} ×${item.quantity}`).join(' • ') || '—'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="rounded-full bg-slate-100 p-2 text-slate-500">
                      <FiCreditCard />
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Amount</p>
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-slate-500 capitalize">{order.payment?.method || 'razorpay'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="rounded-full bg-slate-100 p-2 text-slate-500">
                      <FiTruck />
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Logistics</p>
                      <p className="text-sm font-semibold text-slate-900">{order.trackingNumber || 'Awaiting tracking'}</p>
                      <p className="text-xs text-slate-500">
                        {[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(', ') || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-xs uppercase text-slate-400">Shipping address</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {[order.shippingAddress?.address1, order.shippingAddress?.address2, order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.postalCode]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase text-slate-400">Notes</p>
                      <span className="text-xs text-slate-400">{order.notes ? 'Internal' : '—'}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">
                      {order.notes || 'No notes recorded for this order.'}
                    </p>
                  </div>
                </div>

                {lineItems.length > 0 && (
                  <details className="mt-4 rounded-xl border border-dashed border-slate-200 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-700">Line items overview</summary>
                    <div className="mt-3 divide-y divide-slate-100">
                      {lineItems.map((item, index) => (
                        <div key={`${order._id}-${item.variantId || index}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                          <div>
                            <p className="font-semibold text-slate-800">{item.title || 'Product'}</p>
                            <p className="text-xs text-slate-500">Variant: {item.color || item.variantId || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-800">{formatCurrency(item.price)}</p>
                            <p className="text-xs text-slate-500">Qty ×{item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <FiClock className="text-slate-400" />
                    Last updated {formatDateTime(order.updatedAt)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openStatusModal(order)}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Update status
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm text-slate-600 md:flex-row">
        <div>
          Showing page {pagination.currentPage} of {Math.max(pagination.totalPages || 1, 1)} · {pagination.totalOrders} total orders
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handlePageChange(-1)}
            disabled={pagination.currentPage <= 1}
            className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(1)}
            disabled={pagination.currentPage >= (pagination.totalPages || 1)}
            className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {showModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Update Status</p>
              <h3 className="text-xl font-semibold text-slate-900">{selectedOrder.orderNumber || shortId(selectedOrder._id)}</h3>
            </div>
            <form className="space-y-4" onSubmit={handleStatusSubmit}>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                >
                  {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking number</label>
                <input
                  type="text"
                  value={statusForm.trackingNumber}
                  onChange={(e) => setStatusForm((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                  placeholder="Enter courier tracking reference"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                <textarea
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Internal note for your ops team"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
