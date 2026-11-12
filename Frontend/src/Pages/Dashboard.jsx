
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import API from "../services/api";
import "../CSS Styling/Dashboard.css";
import { setCompanyData } from "../Redux/CompanySlice";
import { clearUserData } from "../Redux/UserSlice";

const initialCompanyForm = {
  name: "",
  email: "",
  country: "",
  baseCurrency: "USD",
  address: {
    street: "",
    city: "",
    state: "",
    postalCode: "",
  },
};

const initialPayrollData = {
  totalBatches: 0,
  completedBatches: 0,
  remainingBatches: 0,
  totalPayments: 0,
  completedPayments: 0,
  failedPayments: 0,
  pendingPayments: 0,
  recentBatches: [],
};

const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? null;

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatStatus = (status = "unknown") =>
  status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector((state) => state.user?.userData);
  const profileMenuRef = useRef(null);

  const [company, setCompany] = useState(null);
  const [employeeCount, setEmployeeCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [payrollData, setPayrollData] = useState(initialPayrollData);
  const [payrollLoading, setPayrollLoading] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    ...initialCompanyForm,
    email: userData?.email || "",
  });

  const userName = userData?.name || "there";

  // FETCH PAYROLL DASHBOARD DATA
  const fetchPayrollDashboardData = async () => {
    try {
      setPayrollLoading(true);

      const response = await API.get("/payroll-batch/all");

      const batchesData = getResponseData(response);
      const batches = Array.isArray(batchesData) ? batchesData : [];

      // Fetch individual batch details because /all excludes items.
      const detailedBatches = await Promise.all(
        batches.map(async (batch) => {
          try {
            const detailResponse = await API.get(
              `/payroll-batch/${batch._id}`
            );

            return getResponseData(detailResponse) || batch;
          } catch (batchError) {
            console.error(
              `Unable to fetch batch ${batch._id}:`,
              batchError
            );

            return batch;
          }
        })
      );

      const allItems = detailedBatches.flatMap((batch) =>
        Array.isArray(batch.items) ? batch.items : []
      );

      const completedPayments = allItems.filter(
        (item) => item.paymentStatus === "completed"
      ).length;

      const failedPayments = allItems.filter(
        (item) => item.paymentStatus === "failed"
      ).length;

      const pendingPayments = allItems.filter((item) =>
        ["pending", "processing"].includes(item.paymentStatus)
      ).length;

      const completedBatches = batches.filter(
        (batch) => batch.status === "completed"
      ).length;

      const unsuccessfulBatches = batches.filter((batch) =>
        ["failed", "cancelled"].includes(batch.status)
      ).length;

      const remainingBatches =
        batches.length - completedBatches - unsuccessfulBatches;

      const recentBatches = [...detailedBatches]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
        )
        .slice(0, 3);

      setPayrollData({
        totalBatches: batches.length,
        completedBatches,
        remainingBatches,
        totalPayments: allItems.length,
        completedPayments,
        failedPayments,
        pendingPayments,
        recentBatches,
      });
    } catch (payrollError) {
      console.error("Payroll dashboard fetch error:", payrollError);
      setPayrollData(initialPayrollData);
    } finally {
      setPayrollLoading(false);
    }
  };

  // FETCH COMPANY AND DASHBOARD DATA
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/company/me");
      const companyData = response.data.company;

      dispatch(setCompanyData(companyData));
      setCompany(companyData || null);

      if (companyData) {
        setCompanyForm({
          name: companyData.name || "",
          email: companyData.email || "",
          country: companyData.country || "",
          baseCurrency: companyData.baseCurrency || "USD",
          address: {
            street: companyData.address?.street || "",
            city: companyData.address?.city || "",
            state: companyData.address?.state || "",
            postalCode: companyData.address?.postalCode || "",
          },
        });

        try {
          const employeeResponse = await API.get("/employee/all");

          const employees =
            employeeResponse.data.employees ||
            employeeResponse.data.data ||
            [];

          setEmployeeCount(employees.length);
        } catch (employeeError) {
          console.error("Employee fetch error:", employeeError);
          setEmployeeCount(0);
        }

        await fetchPayrollDashboardData();
      } else {
        setEmployeeCount(null);
        setPayrollData(initialPayrollData);
      }
    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load your dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // REFRESH PAYROLL DATA WHEN USER RETURNS TO DASHBOARD
  useEffect(() => {
    const handleFocus = () => {
      if (company) {
        fetchPayrollDashboardData();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [company]);

  // PROFILE DROPDOWN
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // LOGOUT
  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await API.get("/auth/sign-out");
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      dispatch(clearUserData());
      setShowProfileMenu(false);
      navigate("/signin", { replace: true });
    }
  };

  // OPEN CREATE COMPANY FORM
  const openCreateForm = () => {
    setIsEditing(false);

    setCompanyForm({
      ...initialCompanyForm,
      email: userData?.email || "",
    });

    setError("");
    setShowCompanyForm(true);
  };

  // OPEN EDIT COMPANY FORM
  const openEditForm = () => {
    if (!company) return;

    setIsEditing(true);

    setCompanyForm({
      name: company.name || "",
      email: company.email || "",
      country: company.country || "",
      baseCurrency: company.baseCurrency || "USD",
      address: {
        street: company.address?.street || "",
        city: company.address?.city || "",
        state: company.address?.state || "",
        postalCode: company.address?.postalCode || "",
      },
    });

    setError("");
    setShowCompanyForm(true);
  };

  // HANDLE FORM INPUTS
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];

      setCompanyForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setCompanyForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // CREATE OR UPDATE COMPANY
  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setCreating(true);

      const payload = {
        name: companyForm.name.trim(),
        email: companyForm.email.trim(),
        country: companyForm.country.trim(),
        baseCurrency: companyForm.baseCurrency,
        address: companyForm.address,
      };

      let response;

      if (isEditing) {
        response = await API.post("/company/me", payload);
      } else {
        response = await API.post("/company/create", payload);
      }

      const updatedCompany = response.data.company;

      if (updatedCompany) {
        setCompany(updatedCompany);
        dispatch(setCompanyData(updatedCompany));

        if (!isEditing) {
          setEmployeeCount(0);
          await fetchPayrollDashboardData();
        }
      } else {
        await fetchDashboardData();
      }

      setShowCompanyForm(false);
    } catch (err) {
      console.error("Company save error:", err);

      setError(
        err.response?.data?.message ||
          `Unable to ${
            isEditing ? "update" : "create"
          } your company. Please try again.`
      );
    } finally {
      setCreating(false);
    }
  };

  // CLOSE COMPANY FORM
  const closeCompanyForm = () => {
    if (creating) return;

    setShowCompanyForm(false);
    setError("");
  };

  return (
    <div className="dashboard-layout">

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">

        <Link to="/dashboard" className="dashboard-brand">
          <div className="dashboard-brand-icon">PF</div>
          <span>PayFlow</span>
        </Link>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="dashboard-nav">

          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>▦</span>
            Overview
          </NavLink>

          <NavLink
            to="/employees"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>♙</span>
            Employees
          </NavLink>

          <NavLink
            to="/payroll-payments"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>⇄</span>
            Payroll Payments
          </NavLink>

          <NavLink
            to="/payroll-batches"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>▤</span>
            Payroll Batches
          </NavLink>

          <NavLink
            to="/payroll-imports"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span>◷</span>
            Payroll Imports
          </NavLink>

        </nav>

        <div className="sidebar-bottom">

          <div className="sidebar-company">
            <div className="company-avatar">
              {company?.name?.charAt(0)?.toUpperCase() || "P"}
            </div>

            <div className="sidebar-company-info">
              <strong>
                {company?.name || "Your workspace"}
              </strong>

              <span>
                {company ? "Company account" : "Personal workspace"}
              </span>
            </div>
          </div>

          <button
            className="sidebar-settings"
            type="button"
            onClick={company ? openEditForm : openCreateForm}
          >
            ⚙ Company Settings
          </button>

        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">

        <header className="dashboard-topbar">

          <div>
            <span className="topbar-label">YOUR WORKSPACE</span>
            <h2>Overview</h2>
          </div>

          <div className="profile-menu-container" ref={profileMenuRef}>

            <button
              type="button"
              className="dashboard-user profile-trigger"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              aria-expanded={showProfileMenu}
              aria-haspopup="true"
            >
              <div className="user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>

              <div className="dashboard-user-info">
                <strong>{userName}</strong>
                <span>Account Owner</span>
              </div>

              <span
                className={`profile-chevron ${
                  showProfileMenu ? "open" : ""
                }`}
              >
                ⌄
              </span>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown">

                <div className="profile-dropdown-header">
                  <div className="profile-dropdown-avatar">
                    {userName.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <strong>{userName}</strong>
                    <span>
                      {userData?.email || "PayFlow account"}
                    </span>
                  </div>
                </div>

                <div className="profile-dropdown-divider" />

                <button
                  type="button"
                  className="profile-dropdown-item"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <span>👤</span>
                  My Profile
                  <small>Coming soon</small>
                </button>

                <div className="profile-dropdown-divider" />

                <button
                  type="button"
                  className="profile-logout-button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <span>↪</span>
                  {loggingOut ? "Logging out..." : "Log out"}
                </button>

              </div>
            )}

          </div>
        </header>

        {/* WELCOME SECTION */}
        <section className="dashboard-welcome">
          <div>
            <span className="welcome-tag">
              PAYFLOW WORKSPACE
            </span>

            <h1>Welcome back, {userName}!</h1>

            <p>
              Manage your company, employees and payroll
              from one place.
            </p>
          </div>

          <div className="welcome-decoration">PF</div>
        </section>

        {error && !showCompanyForm && (
          <div className="dashboard-error">{error}</div>
        )}

        {loading ? (
          <div className="dashboard-loading">
            Loading your workspace...
          </div>
        ) : (
          <>
            {!company ? (
              <section className="create-company-card">

                <div className="create-company-icon">＋</div>

                <div className="create-company-content">
                  <span className="section-eyebrow">
                    GET STARTED
                  </span>

                  <h2>Set up your company workspace</h2>

                  <p>
                    You can explore your dashboard now.
                    Whenever you're ready, add your company
                    details to start managing employees and payroll.
                  </p>

                  <button
                    className="primary-dashboard-button"
                    type="button"
                    onClick={openCreateForm}
                  >
                    Create Your Company ↗
                  </button>
                </div>

                <div className="optional-label">
                  OPTIONAL SETUP
                </div>

              </section>
            ) : (
              <>
                <section className="company-overview-card">

                  <div className="company-overview-info">
                    <span className="section-eyebrow">
                      YOUR COMPANY
                    </span>

                    <div className="company-title-row">
                      <h2>{company.name}</h2>

                      <button
                        type="button"
                        className="company-edit-icon"
                        onClick={openEditForm}
                        title="Edit company details"
                        aria-label="Edit company details"
                      >
                        ✎
                      </button>
                    </div>

                    <p>{company.email}</p>

                    <span className="company-status">
                      {company.status || "Active"}
                    </span>
                  </div>

                  <div className="company-initial">
                    {company.name?.charAt(0)?.toUpperCase() || "P"}
                  </div>

                </section>

                {/* DASHBOARD STATS */}
                <section className="dashboard-stats">

                  <div className="stat-card">
                    <span>EMPLOYEES</span>

                    <h2>
                      {employeeCount === null ? "—" : employeeCount}
                    </h2>

                    <p>Registered employees</p>
                  </div>

                  <div className="stat-card">
                    <span>PAYROLL</span>

                    <h2>
                      {payrollLoading
                        ? "..."
                        : payrollData.totalBatches}
                    </h2>

                    <p>
                      {payrollLoading
                        ? "Loading payroll data..."
                        : `${payrollData.completedBatches} completed · ${payrollData.remainingBatches} remaining`}
                    </p>
                  </div>

                  <div className="stat-card">
                    <span>PAYMENTS</span>

                    <h2>
                      {payrollLoading
                        ? "..."
                        : payrollData.totalPayments}
                    </h2>

                    <p>
                      {payrollLoading
                        ? "Loading payment data..."
                        : `${payrollData.completedPayments} completed · ${payrollData.failedPayments} failed`}
                    </p>

                  </div>

                </section>
              </>
            )}
          </>
        )}

        {/* LOWER DASHBOARD PANELS */}
        <section className="dashboard-lower">

          <div className="dashboard-panel">
            <span className="section-eyebrow">
              WORKSPACE ACTIVITY
            </span>

            <h3>Recent Activity</h3>

            {payrollLoading ? (
              <p>Loading recent activity...</p>
            ) : payrollData.recentBatches.length > 0 ? (
              <div>
                {payrollData.recentBatches.map((batch) => (
                  <div
                    key={batch._id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 0",
                      borderBottom: "1px solid #eeeeF4",
                    }}
                  >
                    <div>
                      <strong style={{ display: "block" }}>
                        {batch.batchName || "Payroll Batch"}
                      </strong>

                      <span
                        style={{
                          fontSize: "12px",
                          color: "#77738a",
                        }}
                      >
                        {formatDate(batch.createdAt)}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {formatStatus(batch.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>
                No payroll activity yet. Your latest payroll
                batches will appear here.
              </p>
            )}
          </div>

          <div className="dashboard-panel">
            <span className="section-eyebrow">
              QUICK OVERVIEW
            </span>

            <h3>Getting started</h3>

            <p>
              Set up your company, add employees and
              prepare your first payroll batch.
            </p>
          </div>

        </section>

      </main>

      {/* COMPANY FORM MODAL */}
      {showCompanyForm && (

        <div
          className="company-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeCompanyForm();
            }
          }}
        >

          <div className="company-modal">

            <button
              className="modal-close"
              onClick={closeCompanyForm}
              type="button"
              disabled={creating}
            >
              ×
            </button>

            <span className="section-eyebrow">
              {isEditing ? "COMPANY SETTINGS" : "COMPANY SETUP"}
            </span>

            <h2>
              {isEditing ? "Edit your company" : "Create your company"}
            </h2>

            <p>
              {isEditing
                ? "Update your company information below."
                : "Add your company information to get started."}
            </p>

            <form onSubmit={handleCompanySubmit}>

              {/* COMPANY DETAILS */}
              <div className="company-form-grid">

                <div className="form-field full-width">
                  <label>Company name *</label>

                  <input
                    type="text"
                    name="name"
                    placeholder="Enter company name"
                    value={companyForm.name}
                    onChange={handleInputChange}
                    minLength={2}
                    required
                  />
                </div>

                <div className="form-field full-width">
                  <label>Company email *</label>

                  <input
                    type="email"
                    name="email"
                    placeholder="company@example.com"
                    value={companyForm.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Country *</label>

                  <input
                    type="text"
                    name="country"
                    placeholder="Enter country"
                    value={companyForm.country}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Base currency *</label>

                  <select
                    name="baseCurrency"
                    value={companyForm.baseCurrency}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

              </div>

              <div className="form-divider" />

              {/* COMPANY ADDRESS */}
              <h3 className="form-section-title">
                Company address
              </h3>

              <div className="company-form-grid">

                <div className="form-field full-width">
                  <label>Street address</label>

                  <input
                    type="text"
                    name="address.street"
                    placeholder="Street / Building"
                    value={companyForm.address.street}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field">
                  <label>City</label>

                  <input
                    type="text"
                    name="address.city"
                    placeholder="City"
                    value={companyForm.address.city}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field">
                  <label>State</label>

                  <input
                    type="text"
                    name="address.state"
                    placeholder="State"
                    value={companyForm.address.state}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-field full-width">
                  <label>Postal code</label>

                  <input
                    type="text"
                    name="address.postalCode"
                    placeholder="Postal code"
                    value={companyForm.address.postalCode}
                    onChange={handleInputChange}
                  />
                </div>

              </div>

              {error && (
                <div className="dashboard-error modal-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="primary-dashboard-button modal-submit"
                disabled={creating}
              >
                {creating
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes ↗"
                    : "Create Company ↗"}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
