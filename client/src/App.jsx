// App.jsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@coreui/coreui/dist/css/coreui.min.css'; // CoreUI styling

import AdminLayout from './layout/AdminLayout';

import AdminDashboard from './AdminDashboard';
import Login from './Login';
import Dash from './Dashboard';
import Map1 from './MapDisplay';
import MapEditor from './MapEditor2';
import Invent from './InventoryManager';
import AddProduct from './AddProduct';
import UpdateProduct from './UpdateProduct';
import UserMenu from './UserMenu';
import Category from './Category';
import Unit from './Unit';
import Branches from './Branches';
// import SavedMaps from './SavedMaps';
import Kiosk from './CustomerKiosk';
import StaffDashboard from './StaffDashboard';
import Cashier from './Cashier';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const userRole = localStorage.getItem('currentUserRole');
  if (!allowedRoles.includes(userRole)) {
    // Redirect based on role to their primary page
    if (userRole === 'admin') return <Navigate to="/admin-dashboard" replace />;
    if (userRole === 'manager') return <Navigate to="/dashboard" replace />;
    if (userRole === 'staff') return <Navigate to="/staff-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  return children;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/admin-dashboard",
    element: <ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/dashboard",
    element: <ProtectedRoute allowedRoles={['manager']}><AdminLayout><Dash /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/map-display",
    element: <ProtectedRoute allowedRoles={['admin']}><AdminLayout><Map1 /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/map2",
    element: <ProtectedRoute allowedRoles={['manager']}><AdminLayout><MapEditor /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/invent",
    element: <ProtectedRoute allowedRoles={['manager', 'staff', 'cashier']}><AdminLayout><Invent /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/inventory-history",
    element: <ProtectedRoute allowedRoles={['admin']}><AdminLayout><Invent /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/staff-dashboard",
    element: <ProtectedRoute allowedRoles={['staff']}><AdminLayout><StaffDashboard /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/addproduct",
    element: <ProtectedRoute allowedRoles={['manager', 'staff']}><AdminLayout><AddProduct /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/update/:id",
    element: <ProtectedRoute allowedRoles={['manager', 'staff']}><AdminLayout><UpdateProduct /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/kiosk",
    element: <AdminLayout><Kiosk /></AdminLayout>,
  },
  {
    path: "/users",
    element: <ProtectedRoute allowedRoles={['admin']}><AdminLayout><UserMenu /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/usermenu",
    element: <ProtectedRoute allowedRoles={['admin']}><AdminLayout><UserMenu /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/category",
    element: <ProtectedRoute allowedRoles={['manager']}><AdminLayout><Category /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/unit",
    element: <ProtectedRoute allowedRoles={['manager']}><AdminLayout><Unit /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/branches",
    element: <ProtectedRoute allowedRoles={['admin']}><AdminLayout><Branches /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/saved-maps",
    element: <ProtectedRoute allowedRoles={['manager', 'admin']}><AdminLayout><Map1 /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "/cashier",
    element: <ProtectedRoute allowedRoles={['cashier', 'staff', 'manager', 'admin']}><AdminLayout><Cashier /></AdminLayout></ProtectedRoute>,
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
