import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import PasswordGate from './components/auth/PasswordGate';
import UploadPage from './pages/Upload';
import ComparePage from './pages/Compare';
import DashboardPage from './pages/Dashboard';
import MCPPage from './pages/MCP';

function App() {
  return (
    <PasswordGate>
      <Router>
        <AppContent />
      </Router>
    </PasswordGate>
  );
}

function AppContent() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Upload Telemetry' },
    { path: '/compare', label: 'Compare Laps' },
    { path: '/dashboard', label: 'Analytics' },
    { path: '/mcp', label: 'AI Coach' },
  ];

  return (
    <div className="flex min-h-screen bg-f1-background">
      {/* Sidebar */}
      <aside className="w-56 bg-f1-panel border-r border-f1-border flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-f1-border">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-f1-red">F1</span>
            <span className="text-f1-text"> TELEMETRY</span>
          </h1>
          <p className="text-xs text-f1-textGray mt-2 uppercase tracking-wider">Analytics Suite</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 pt-6">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`block px-4 py-3 text-sm font-medium transition-all uppercase tracking-wide ${
                    location.pathname === item.path
                      ? 'bg-f1-red text-white'
                      : 'text-f1-textGray hover:bg-f1-card hover:text-f1-accent'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-f1-border">
          <p className="text-xs text-f1-textGray text-center tracking-wide">
            POWERED BY SUPABASE
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8 max-w-5xl">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/mcp" element={<MCPPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
