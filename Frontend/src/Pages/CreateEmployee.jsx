
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import "../CSS Styling/CreateEmployee.css";

function CreateEmployee() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    employeeCode: "",
    name: "",
    email: "",
    phone: "",
    country: "",
    jobTitle: "",
    department: "",
    salaryAmount: "",
    currency: "INR",
    provider: "paypal",
    recipientEmail: "",
    recipientRefrence: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const payload = {
      employeeCode: formData.employeeCode.trim(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      country: formData.country.trim(),
      jobTitle: formData.jobTitle.trim(),
      department: formData.department.trim(),
      salary: {
        amount: formData.salaryAmount,
        currency: formData.currency,
      },
      paymentMethods: {
        provider: formData.provider,
        recipientEmail: formData.recipientEmail.trim(),
        recipientRefrence: formData.recipientRefrence.trim(),
      },
    };

    try {
      setLoading(true);

      await API.post("/employee/add", payload);

      navigate("/employees", {
        state: { message: "Employee added successfully." },
      });
    } catch (err) {
      console.error("Error adding employee:", err);

      setError(
        err.response?.data?.message ||
        "Unable to add employee. Please check the details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-employee-page">
      <div className="create-employee-header">
        <div>
          <Link to="/employees" className="back-to-employees">
            ← Back to employees
          </Link>

          <h1>Add employee</h1>
          <p>Add a new employee to your company directory.</p>
        </div>
      </div>

      <form className="employee-form" onSubmit={handleSubmit}>
        <section className="employee-form-section">
          <div className="form-section-heading">
            <h2>Personal information</h2>
            <p>Basic details about the employee.</p>
          </div>

          <div className="employee-form-grid">
            <div className="employee-form-field">
              <label htmlFor="employeeCode">Employee ID *</label>
              <input
                id="employeeCode"
                name="employeeCode"
                value={formData.employeeCode}
                onChange={handleChange}
                placeholder="e.g. EMP001"
                required
              />
            </div>

            <div className="employee-form-field">
              <label htmlFor="name">Full name *</label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="employee-form-field">
              <label htmlFor="email">Email address *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="employee-form-field">
              <label htmlFor="phone">Phone number *</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                required
              />
            </div>

            <div className="employee-form-field">
              <label htmlFor="country">Country *</label>
              <input
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="e.g. India"
                required
              />
            </div>
          </div>
        </section>

        <section className="employee-form-section">
          <div className="form-section-heading">
            <h2>Employment details</h2>
            <p>Role and department information.</p>
          </div>

          <div className="employee-form-grid">
            <div className="employee-form-field">
              <label htmlFor="jobTitle">Job title *</label>
              <input
                id="jobTitle"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                placeholder="e.g. Software Engineer"
                required
              />
            </div>

            <div className="employee-form-field">
              <label htmlFor="department">Department *</label>
              <input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Engineering"
                required
              />
            </div>
          </div>
        </section>

        <section className="employee-form-section">
          <div className="form-section-heading">
            <h2>Salary information</h2>
            <p>Set the employee's salary and currency.</p>
          </div>

          <div className="employee-form-grid">
            <div className="employee-form-field">
              <label htmlFor="salaryAmount">Salary amount *</label>
              <input
                id="salaryAmount"
                name="salaryAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.salaryAmount}
                onChange={handleChange}
                placeholder="e.g. 50000"
                required
              />
            </div>

            <div className="employee-form-field">
              <label htmlFor="currency">Currency *</label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
          </div>
        </section>

        <section className="employee-form-section">
          <div className="form-section-heading">
            <h2>Payment details</h2>
            <p>Payment recipient information for this employee.</p>
          </div>

          <div className="employee-form-grid">
            <div className="employee-form-field">
              <label htmlFor="provider">Payment provider *</label>
              <select
                id="provider"
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                required
              >
                <option value="paypal">PayPal</option>
              </select>
            </div>

            <div className="employee-form-field">
              <label htmlFor="recipientEmail">Recipient email *</label>
              <input
                id="recipientEmail"
                name="recipientEmail"
                type="email"
                value={formData.recipientEmail}
                onChange={handleChange}
                placeholder="PayPal account email"
                required
              />
            </div>

            <div className="employee-form-field employee-form-full">
              <label htmlFor="recipientRefrence">
                Recipient reference *
              </label>
              <input
                id="recipientRefrence"
                name="recipientRefrence"
                value={formData.recipientRefrence}
                onChange={handleChange}
                placeholder="Enter PayPal recipient reference"
                required
              />
            </div>
          </div>
        </section>

        {error && <div className="employee-form-error">{error}</div>}

        <div className="employee-form-actions">
          <Link to="/employees" className="cancel-employee-btn">
            Cancel
          </Link>

          <button
            type="submit"
            className="save-employee-btn"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save employee"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateEmployee;
