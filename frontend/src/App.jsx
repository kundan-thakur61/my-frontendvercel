import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
} from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUserProfile, logout } from './redux/slices/authSlice';
import { fetchWishlist } from './redux/slices/wishlistSlice';
import { PageLoader } from './components/Loader';

// Layout components
import Header from './components/Header';
import Footer from './components/Footer';

// Public pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Themes from './pages/Themes';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CustomMobilePage from './pages/CustomMobilePage';
import MobileCoverCustomizer from './components/App';
import MyDesigns from './pages/MyDesigns';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import OrderSuccess from './pages/OrderSuccess';
import Wishlist from './pages/Wishlist';
import ThemeDetail from './pages/ThemeDetail';
import Collection from './pages/collection.jsx';
import GalleryImagePage from './pages/GalleryImagePage.jsx';




// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminCustomOrders from './pages/AdminCustomOrders';
import AdminUsers from './pages/AdminUsers';
import AdminMobileManagement from './pages/AdminMobileManagement';
import AdminThemes from './pages/AdminThemes';
import AdminOrders from './pages/AdminOrders';
import CustomOrders from './pages/CustomOrders';

// Protected route wrapper
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);

  // On first mount, if a token exists but user isn't loaded yet, fetch profile
  useEffect(() => {
    if (token && !user) {
      dispatch(getUserProfile());
    }
    // when user is available, load wishlist
    if (token && user) {
      dispatch(fetchWishlist());
    }
  }, [dispatch, token, user]);

  // Listen for unauthorized events (e.g., token expired)
  useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(logout());
    };

    window.addEventListener('app:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('app:unauthorized', handleUnauthorized);
    };
  }, [dispatch]);

  // If we have a token but are still loading the user profile, show a full-page loader
  if (token && loading && !user) {
    return <PageLoader />;
  }

  const Layout = () => (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-16">
        <Outlet />
      </main>
      <Footer />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );

  const router = createBrowserRouter([
    {
      path: '/',
      element: <Layout />,
      children: [
        { index: true, element: <Home /> },
        { path: 'products', element: <Products /> },
        { path: 'products/:id', element: <ProductDetails /> },
        { path: 'themes', element: <Themes /> },
        { path: 'themes/:slug', element: <ThemeDetail /> },
        { path: 'theme', element: <Navigate to="/themes" replace /> },
        { path: 'collection/:handle', element: <Collection /> },
        { path: 'collection/:handle/gallery', element: <GalleryImagePage /> },

        


        { path: 'cart', element: <Cart /> },
        { path: 'login', element: <Login /> },
        { path: 'signup', element: <Signup /> },
        { path: 'customizer', element: <CustomMobilePage /> },
        { path: 'customizer/:slug', element: <CustomMobilePage /> },
        { path: 'custom-mobile', element: <CustomMobilePage /> },
        { path: 'custom-mobile/:slug', element: <CustomMobilePage /> },
        { path: 'order-success/:id', element: <OrderSuccess /> },

        { path: 'checkout', element: (
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        ) },
        { path: 'profile', element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ) },
        { path: 'orders', element: (
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        ) },
        { path: 'wishlist', element: (
          <ProtectedRoute>
            <React.Suspense fallback={<PageLoader />}>
              <Wishlist />
            </React.Suspense>
          </ProtectedRoute>
        ) },
        { path: 'my-designs', element: (
          <ProtectedRoute>
            <MyDesigns />
          </ProtectedRoute>
        ) },
        { path: 'custom-designs', element: (
          <ProtectedRoute>
            <MyDesigns />
          </ProtectedRoute>
        ) },

        { path: 'admin', element: (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        ) },
        { path: 'admin/products', element: (
          <AdminRoute>
            <AdminProducts />
          </AdminRoute>
        ) },
        { path: 'admin/orders', element: (
          <AdminRoute>
            <AdminOrders />
          </AdminRoute>
        ) },
        { path: 'admin/mobile/:type?', element: (
          <AdminRoute>
            <AdminMobileManagement />
          </AdminRoute>
        ) },
        { path: 'admin/themes', element: (
          <AdminRoute>
            <AdminThemes />
          </AdminRoute>
        ) },
        { path: 'admin/users', element: (
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        ) },
        { path: 'admin/custom-orders', element: (
          <AdminRoute>
            <AdminCustomOrders />
          </AdminRoute>
        ) },
        { path: 'custom-orders', element: (
          <ProtectedRoute>
            <CustomOrders />
          </ProtectedRoute>
        ) },
      ],
    },
  ]);

  return (
    <RouterProvider router={router} future={{ v7_startTransition: true, v7_relativeSplatPath: true }} />
  );
}

export default App;
