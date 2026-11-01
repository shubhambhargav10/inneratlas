"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Lock,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Download,
  CheckCircle,
  Clock,
  Layers,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [secretKey, setSecretKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [data, setData] = useState<{
    metrics: {
      totalOrdersCount: number;
      paidOrdersCount: number;
      totalRevenueInr: number;
      averageOrderValueInr: number;
      conversionRatePercent: number;
      activeAssessmentsCount: number;
      totalQuestionsCount: number;
    };
    orders: Array<any>;
    assessments: Array<any>;
  } | null>(null);

  // Check stored admin key in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("ina_admin_key");
    if (saved) {
      setSecretKey(saved);
      fetchAdminData(saved);
    }
  }, []);

  const fetchAdminData = async (key: string) => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: key }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Authentication failed");
      }

      setData(resData);
      setIsAuthenticated(true);
      sessionStorage.setItem("ina_admin_key", key);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to authenticate");
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminData(secretKey);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("ina_admin_key");
    setIsAuthenticated(false);
    setData(null);
    setSecretKey("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-[#E8E2D9] bg-white p-8 shadow-soft text-center">
          <div className="w-12 h-12 rounded-2xl bg-ink text-white flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-brand-300" />
          </div>

          <h1 className="text-2xl font-serif font-semibold text-ink mb-2">
            Administrator Gateway
          </h1>
          <p className="text-xs text-ink-muted mb-6">
            Enter the authorized admin key to access platform analytics and order management.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Admin Secret Key
              </label>
              <input
                type="password"
                required
                placeholder="Enter admin secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-600 bg-canvas/30"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-accent-coral/10 text-accent-coral text-xs">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-ink text-white font-semibold text-sm shadow-soft hover:bg-ink-light transition-all active:scale-95 disabled:opacity-70"
            >
              {isLoading ? "Verifying..." : "Access Administrator Dashboard"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E8E2D9] text-[11px] text-ink-muted">
            Protected endpoint • Unlogged access attempts audited
          </div>
        </div>
      </div>
    );
  }

  const { metrics, orders, assessments } = data!;

  return (
    <div className="bg-canvas min-h-screen py-10 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-[#E8E2D9] mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 block mb-1">
              Protected Administrator Portal
            </span>
            <h1 className="text-3xl font-serif text-ink font-semibold">
              Platform Analytics & Orders
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-ink-muted hover:text-ink px-3 py-1.5 rounded-lg border border-[#E8E2D9] hover:bg-canvas-subtle"
          >
            Lock & Logout
          </button>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Revenue */}
          <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Total Revenue
              </span>
              <div className="w-8 h-8 rounded-lg bg-accent-emerald/10 text-accent-emerald flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-serif font-bold text-ink">
              ₹{metrics.totalRevenueInr.toLocaleString()}
            </div>
            <div className="text-xs text-ink-muted mt-1">Paid Indian Rupees (INR)</div>
          </div>

          {/* Paid Orders */}
          <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Paid Orders
              </span>
              <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-serif font-bold text-ink">
              {metrics.paidOrdersCount}
            </div>
            <div className="text-xs text-ink-muted mt-1">
              Out of {metrics.totalOrdersCount} initiated
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Checkout Conversion
              </span>
              <div className="w-8 h-8 rounded-lg bg-accent-gold/10 text-accent-gold flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-serif font-bold text-ink">
              {metrics.conversionRatePercent}%
            </div>
            <div className="text-xs text-ink-muted mt-1">Order to Paid ratio</div>
          </div>

          {/* Average Order Value */}
          <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Avg Order Value
              </span>
              <div className="w-8 h-8 rounded-lg bg-canvas text-brand-700 flex items-center justify-center border border-[#E8E2D9]">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-serif font-bold text-ink">
              ₹{metrics.averageOrderValueInr}
            </div>
            <div className="text-xs text-ink-muted mt-1">Per paying customer</div>
          </div>
        </div>

        {/* Assessment Management Table */}
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-8 shadow-soft mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-serif font-semibold text-ink">
                Assessment Catalogue Status
              </h2>
              <p className="text-xs text-ink-muted">Active self-discovery products on platform</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700">
              {assessments.length} Active Frameworks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E8E2D9] text-ink-muted uppercase tracking-wider">
                <tr>
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Questions</th>
                  <th className="pb-3 font-semibold">Dimensions</th>
                  <th className="pb-3 font-semibold">Price (INR)</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D9]/60">
                {assessments.map((a) => (
                  <tr key={a.id} className="hover:bg-canvas/50">
                    <td className="py-3 font-semibold text-ink">{a.title}</td>
                    <td className="py-3 text-ink-muted">{a.category}</td>
                    <td className="py-3 text-ink-muted">{a.questionCount} Questions</td>
                    <td className="py-3 text-ink-muted">{a.dimensionCount} Dimensions</td>
                    <td className="py-3 font-semibold text-ink">₹{a.priceInr}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-emerald/10 text-accent-emerald">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders Table */}
        <div className="rounded-3xl border border-[#E8E2D9] bg-white p-6 sm:p-8 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-serif font-semibold text-ink">Recent Orders</h2>
              <p className="text-xs text-ink-muted">Real-time payment transactions and fulfillment</p>
            </div>
            <span className="text-xs font-semibold text-ink-muted">
              {orders.length} total orders recorded
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted">
              No orders recorded yet. Completed test transactions will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E8E2D9] text-ink-muted uppercase tracking-wider">
                  <tr>
                    <th className="pb-3 font-semibold">Order / Dossier</th>
                    <th className="pb-3 font-semibold">Customer</th>
                    <th className="pb-3 font-semibold">Assessment</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D9]/60">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-canvas/50">
                      <td className="py-3.5 font-mono font-medium text-ink">
                        {ord.reportCode || ord.orderNumber}
                      </td>
                      <td className="py-3.5">
                        <div className="font-semibold text-ink">{ord.customerName}</div>
                        <div className="text-[11px] text-ink-muted">{ord.customerEmail}</div>
                      </td>
                      <td className="py-3.5 capitalize text-ink-muted">
                        {ord.assessmentSlug.replace("-", " ")}
                      </td>
                      <td className="py-3.5 font-semibold text-ink">
                        ₹{(ord.amountPaise / 100).toFixed(0)}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.status === "paid"
                              ? "bg-accent-emerald/10 text-accent-emerald"
                              : "bg-accent-coral/10 text-accent-coral"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-ink-muted">
                        {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-3.5 text-right">
                        {ord.status === "paid" && (
                          <div className="inline-flex items-center space-x-2">
                            <a
                              href={`/api/reports/${ord.id}/download?token=${ord.accessToken}`}
                              download
                              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <Link
                              href={`/reports/${ord.id}?token=${ord.accessToken}`}
                              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-canvas transition-colors"
                              title="View Online"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
