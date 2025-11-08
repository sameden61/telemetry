import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PasswordGate from './components/auth/PasswordGate';
import UploadPage from './pages/Upload';
import ComparePage from './pages/Compare';
import DashboardPage from './pages/Dashboard';
import MCPPage from './pages/MCP';

function App() {
  return (
    <PasswordGate>
      <Router>
        <div className="min-h-screen bg-f1-background">
          <nav className="bg-f1-panel border-b border-gray-800">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-f1-text">
                  Telemetry Compare
                </h1>
                <div className="flex gap-4">
                  <NavLink to="/">Upload</NavLink>
                  <NavLink to="/compare">Compare</NavLink>
                  <NavLink to="/dashboard">Dashboard</NavLink>
                  <NavLink to="/mcp">MCP Chat</NavLink>
                </div>
              </div>
            </div>
          </nav>

          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/mcp" element={<MCPPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </PasswordGate>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-f1-text hover:text-f1-accent transition-colors font-medium"
    >
      {children}
    </Link>
  );
}

export default App;
