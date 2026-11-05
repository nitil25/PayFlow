
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import API from "../services/api";
import "../CSS Styling/Dashboard.css";
import { setCompanyData } from "../Redux/CompanySlice";

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

function Dashboard() {

  const dispatch = useDispatch()

  const { userData } = useSelector((state) => state.user);

  const [company, setCompany] = useState(null);
  const [employeeCount, setEmployeeCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [creating, setCreating] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    ...initialCompanyForm,
    email: userData?.email || "",
  });

  const [companyLogo, setCompanyLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const fileInputRef = useRef(null);

  const userName = userData?.name || "there";

  // Fetch company and dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/company/me");
      const companyData = response.data.company;
      dispatch(setCompanyData(companyData))

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
          setEmployeeCount(
            employeeResponse.data.employees?.length ?? 0
          );
        } catch (employeeError) {
          console.error("Employee fetch error:", employeeError);
          setEmployeeCount(0);
        }
      } else {
        setEmployeeCount(null);
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

  // Open create form
  const openCreateForm = () => {
    setIsEditing(false);
    setCompanyForm({
      ...initialCompanyForm,
      email: userData?.email || "",
    });
    setCompanyLogo(null);
    setLogoPreview(null);
    setError("");
    setShowCompanyForm(true);
  };

  // Open edit form
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

    setCompanyLogo(null);
    setLogoPreview(null);
    setError("");
    setShowCompanyForm(true);
  };

  // Update form fields
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

  // Temporary company logo preview
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PNG, JPG or WEBP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo size must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    setError("");
    setCompanyLogo(file);

    const reader = new FileReader();

    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };

    reader.readAsDataURL(file);
  };

  // Create or update company
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
        dispatch(setCompanyData(updatedCompany))
      } else {
        // Fetch the latest company details if the controller
        // does not return the updated company object.
        await fetchDashboardData();
      }

      setShowCompanyForm(false);
      setCompanyLogo(null);
      setLogoPreview(null);

      if (!isEditing) {
        setEmployeeCount(0);
      }
    } catch (err) {
      console.error("Company save error:", err);

      setError(
        err.response?.data?.message ||
        `Unable to ${isEditing ? "update" : "create"} your company. Please try again.`
      );
    } finally {
      setCreating(false);
    }
  };

  const closeCompanyForm = () => {
    if (creating) return;

    setShowCompanyForm(false);
    setError("");
    setCompanyLogo(null);
    setLogoPreview(null);
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
          <Link to="/dashboard" className="nav-item active">
            <span>▦</span>
            Overview
          </Link>

          <button className="nav-item" disabled>
            <span>♙</span>
            Employees
            <small>SOON</small>
          </button>

          <button className="nav-item" disabled>
            <span>⇄</span>
            Payroll
            <small>SOON</small>
          </button>

          <button className="nav-item" disabled>
            <span>▤</span>
            Payroll Batches
            <small>SOON</small>
          </button>

          <button className="nav-item" disabled>
            <span>◷</span>
            Payroll Imports
            <small>SOON</small>
          </button>
        </nav>

        <div className="sidebar-bottom">

          <div className="sidebar-company">
            <div className="company-avatar">
              {company?.name?.charAt(0)?.toUpperCase() || "P"}
            </div>

            <div className="sidebar-company-info">
              <strong>{company?.name || "Your workspace"}</strong>
              <span>
                {company ? "Company account" : "Personal workspace"}
              </span>
            </div>
          </div>

          <button
            className="sidebar-settings"
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

          <div className="dashboard-user">
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{userName}</strong>
              <span>Account Owner</span>
            </div>
          </div>
        </header>

        <section className="dashboard-welcome">
          <div>
            <span className="welcome-tag">PAYFLOW WORKSPACE</span>
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
                    <h2>—</h2>
                    <p>Payroll data will appear here</p>
                  </div>

                  <div className="stat-card">
                    <span>PAYMENTS</span>
                    <h2>—</h2>
                    <p>Payment data will appear here</p>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        <section className="dashboard-lower">
          <div className="dashboard-panel">
            <span className="section-eyebrow">
              WORKSPACE ACTIVITY
            </span>
            <h3>Recent Activity</h3>
            <p>
              Your company and payroll activities will
              appear here as you start using PayFlow.
            </p>
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

              {/* COMPANY LOGO */}
              <div className="logo-upload-section">
                <div className="logo-preview">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Company logo preview" />
                  ) : (
                    <span>
                      {company?.name?.charAt(0)?.toUpperCase() || "＋"}
                    </span>
                  )}
                </div>

                <div className="logo-upload-info">
                  <strong>Company logo</strong>
                  <p>PNG, JPG or WEBP · Maximum 5 MB</p>

                  <button
                    type="button"
                    className="upload-logo-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span>↑</span>
                    Upload image
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    hidden
                  />

                  {logoPreview && (
                    <button
                      type="button"
                      className="remove-logo-button"
                      onClick={() => {
                        setCompanyLogo(null);
                        setLogoPreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>

              <div className="form-divider" />

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

              <div className="form-divider" />

              {/* PAYOUT PREFERENCES - DISPLAY ONLY */}
              <div className="payout-section">
                <div className="payout-heading">
                  <div>
                    <h3>Payout preferences</h3>
                    <p>These settings will be configurable later.</p>
                  </div>
                  <span>COMING SOON</span>
                </div>

                <div className="payout-option">
                  <span>Payroll approval required</span>
                  <strong>Default: Enabled</strong>
                </div>

                <div className="payout-option">
                  <span>Default payment provider</span>
                  <strong>PayPal</strong>
                </div>

                <div className="payout-option">
                  <span>Automatic payouts</span>
                  <strong>Default: Disabled</strong>
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

              <p className="logo-temporary-note">
                Logo preview is temporary and will not be saved
                permanently yet.
              </p>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Dashboard;
