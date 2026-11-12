
import { useEffect, useState } from "react";
import { NavLink, Link, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import API from "../services/api";
import "../CSS Styling/WorkspaceLayout.css";

function WorkspaceLayout() {
  const userData = useSelector((state) => state.user?.userData);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await API.get("/company/me");
        setCompany(response.data?.company || null);
      } catch (error) {
        console.error("Unable to load company details:", error);
      }
    };

    fetchCompany();
  }, []);

  const userName = userData?.name || "Account Owner";

  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar">
        <Link to="/dashboard" className="workspace-brand">
          <div className="workspace-brand-icon">PF</div>
          <span>PayFlow</span>
        </Link>

        <div className="workspace-sidebar-label">WORKSPACE</div>

        <nav className="workspace-nav">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `workspace-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="workspace-nav-icon">▦</span>
            Overview
          </NavLink>

          <NavLink
            to="/employees"
            end
            className={({ isActive }) =>
              `workspace-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="workspace-nav-icon">♙</span>
            Employees
          </NavLink>

          <NavLink
            to="/payroll-payments"
            className={({ isActive }) =>
              `workspace-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="workspace-nav-icon">⇄</span>
            Payroll Payments
          </NavLink>

          <NavLink
            to="/payroll-batches"
            className={({ isActive }) =>
              `workspace-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="workspace-nav-icon">▤</span>
            Payroll Batches
          </NavLink>

          <NavLink
            to="/payroll-imports"
            className={({ isActive }) =>
              `workspace-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="workspace-nav-icon">◷</span>
            Payroll Imports
          </NavLink>
        </nav>

        <div className="workspace-sidebar-bottom">
          <div className="workspace-company">
            <div className="workspace-company-avatar">
              {company?.name?.charAt(0)?.toUpperCase() || "P"}
            </div>

            <div className="workspace-company-info">
              <strong>{company?.name || "Your workspace"}</strong>
              <span>
                {company ? "Company account" : "Personal workspace"}
              </span>
            </div>
          </div>

          <Link to="/dashboard" className="workspace-settings">
            <span>⚙</span>
            Company Settings
          </Link>

          <div className="workspace-account">
            <span className="workspace-account-avatar">
              {userName.charAt(0).toUpperCase()}
            </span>

            <div>
              <strong>{userName}</strong>
              <small>Account Owner</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="workspace-content">
        <Outlet />
      </main>
    </div>
  );
}

export default WorkspaceLayout;
