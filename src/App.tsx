import React, { useState, useEffect } from "react";
import { Home, Users, Clock, FileText, Settings as SettingsIcon, Plus, ArrowLeft } from "lucide-react";
import Dashboard from "./screens/Dashboard";
import WorkersList from "./screens/WorkersList";
import AttendanceEntryScreen from "./screens/AttendanceEntryScreen";
import EntriesList from "./screens/EntriesList";
import Reports from "./screens/Reports";
import SettingsScreen from "./screens/SettingsScreen";
import Backup from "./screens/Backup";

type View = "dashboard" | "workers" | "add-entry" | "entries" | "reports" | "settings" | "backup";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [params, setParams] = useState<any>({});

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "");
      const [view, ...rest] = hash.split("/");
      if (view) {
        setCurrentView(view as View);
        if (rest.length > 0) setParams({ id: rest[0] });
      } else {
        setCurrentView("dashboard");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (view: View, param?: string) => {
    window.location.hash = `#/${view}${param ? `/${param}` : ""}`;
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard onNavigate={navigate} />;
      case "workers":
        return <WorkersList onNavigate={navigate} />;
      case "add-entry":
        return <AttendanceEntryScreen onNavigate={navigate} entryId={params.id} />;
      case "entries":
        return <EntriesList onNavigate={navigate} />;
      case "reports":
        return <Reports />;
      case "settings":
        return <SettingsScreen />;
      case "backup":
        return <Backup />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  const menuItems = [
    { id: "dashboard", icon: <Home size={20} />, label: "Home" },
    { id: "entries", icon: <Clock size={20} />, label: "Log" },
    { id: "workers", icon: <Users size={20} />, label: "Workers" },
    { id: "reports", icon: <FileText size={20} />, label: "Reports" },
    { id: "settings", icon: <SettingsIcon size={20} />, label: "Settings" },
  ];

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-white shadow-xl relative">
      <header className="bg-blue-600 text-white p-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentView !== "dashboard" && (
            <button onClick={() => window.history.back()} className="p-1 hover:bg-blue-700 rounded transition">
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className="text-lg font-bold capitalize">
            {currentView === "dashboard" ? "Attendance Pro" : currentView.replace("-", " ")}
          </h1>
        </div>
        <button onClick={() => navigate("add-entry")} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition">
          <Plus size={24} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20 p-4">{renderView()}</main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-slate-200 flex justify-around p-2 z-10">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id as View)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              currentView === item.id ? "text-blue-600" : "text-slate-500"
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
