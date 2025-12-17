import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiBox, FiFileText, FiUsers, FiTruck } from 'react-icons/fi';

export default function AdminSidebar({ className = '' }) {
  const { pathname } = useLocation();

    const items = [
    { to: '/admin', label: 'Dashboard', icon: <FiHome /> },
    { to: '/admin/products', label: 'Products', icon: <FiBox /> },
    { to: '/admin/orders', label: 'Orders', icon: <FiTruck /> },
    { to: '/admin/mobile', label: 'Mobile Management', icon: <FiFileText /> },
      { to: '/admin/themes', label: 'Themes', icon: <FiFileText /> },
    { to: '/admin/custom-orders', label: 'Custom Orders', icon: <FiFileText /> },
    { to: '/admin/users', label: 'Users', icon: <FiUsers /> },
  ];

  return (
    <nav className={`bg-white rounded-lg shadow p-3 ${className}`} aria-label="Admin sidebar">
      <ul className="space-y-1">
        {items.map((it) => {
          const active = pathname === it.to;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={`flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  active ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-lg">{it.icon}</span>
                <span className="text-sm">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
