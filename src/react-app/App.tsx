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
    { path: '/', label: 'Upload', icon: '📤' },
    { path: '/compare', label: 'Compare', icon: '📊' },
    { path: '/dashboard', label: 'Dashboard', icon: '📈' },
    { path: '/mcp', label: 'AI Coach', icon: '🤖' },
  ];

  return (
    <div className="flex min-h-screen bg-f1-background">
      {/* Sidebar */}
      <aside className="w-64 bg-f1-panel border-r border-gray-800 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-f1-text">
            <span className="text-f1-accent">Telemetry</span>
            <br />
            <span className="text-f1-red">Compare</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Sim Racing Analytics</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    location.pathname === item.path
                      ? 'bg-f1-accent text-gray-900 font-semibold'
                      : 'text-f1-text hover:bg-gray-800 hover:text-f1-accent'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            Powered by Supabase & AI
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
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
