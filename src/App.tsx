import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import WriteCheque from "./pages/WriteCheque";
import Register from "./pages/Register";
import Payees from "./pages/Payees";
import Accounts from "./pages/Accounts";
import Templates from "./pages/Templates";
import TemplateEditor from "./pages/TemplateEditor";
import Reports from "./pages/Reports";

interface NavEntry {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const NAV: { section: string; items: NavEntry[] }[] = [
  {
    section: "Cheques",
    items: [
      { to: "/", label: "Dashboard", icon: "▤", end: true },
      { to: "/write", label: "Write a Cheque", icon: "✎" },
      { to: "/register", label: "Cheque Register", icon: "☰" },
      { to: "/reports", label: "Reports", icon: "▦" },
    ],
  },
  {
    section: "Setup",
    items: [
      { to: "/payees", label: "Payees", icon: "☺" },
      { to: "/accounts", label: "Bank Accounts", icon: "▣" },
      { to: "/templates", label: "Cheque Templates", icon: "▭" },
    ],
  },
];

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="brand">
        <span className="logo">₱</span>
        Check Writer
      </div>
      {NAV.map((group) => (
        <div key={group.section}>
          <div className="nav-section">{group.section}</div>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/write" element={<WriteCheque />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/payees" element={<Payees />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/:id" element={<TemplateEditor />} />
        </Routes>
      </main>
    </div>
  );
}
