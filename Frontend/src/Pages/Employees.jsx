
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import "../CSS Styling/Employees.css";

function Employees() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const [deletingId, setDeletingId] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    // Fetch employees
    const fetchEmployees = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const response = await API.get("/employee/all");

            const employeeList =
                response.data?.employees ||
                response.data?.data ||
                [];

            setEmployees(
                Array.isArray(employeeList) ? employeeList : []
            );

        } catch (err) {
            console.error("Fetch employees error:", err);

            setError(
                err.response?.data?.message ||
                "Unable to load employees. Please try again."
            );

        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    // Open custom delete modal
    const handleDeleteEmployee = (employee) => {
        setSelectedEmployee(employee);
        setDeleteError("");
        setShowDeleteModal(true);
    };

    // Close custom delete modal
    const closeDeleteModal = () => {
        if (deletingId) return;

        setShowDeleteModal(false);
        setSelectedEmployee(null);
        setDeleteError("");
    };

    // Confirm employee deletion
    const confirmDeleteEmployee = async () => {
        if (!selectedEmployee || deletingId) return;

        try {
            setDeletingId(selectedEmployee._id);
            setDeleteError("");

            await API.delete(
                `/employee/remove/${selectedEmployee._id}`
            );

            setEmployees((previousEmployees) =>
                previousEmployees.filter(
                    (employee) =>
                        employee._id !== selectedEmployee._id
                )
            );

            setShowDeleteModal(false);
            setSelectedEmployee(null);

        } catch (err) {
            console.error("Delete employee error:", err);

            setDeleteError(
                err.response?.data?.message ||
                "Unable to delete employee. Please try again."
            );

        } finally {
            setDeletingId(null);
        }
    };

    // Employee initials
    const getInitials = (name = "") => {
        return name
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0].toUpperCase())
            .join("");
    };

    // Safely convert MongoDB Decimal128 / regular values
    const getSalaryAmount = (salary) => {
        const amount = salary?.amount ?? salary;

        if (amount === undefined || amount === null || amount === "") {
            return null;
        }

        const numericAmount = Number(
            typeof amount === "object" && amount.$numberDecimal
                ? amount.$numberDecimal
                : amount
        );

        return Number.isFinite(numericAmount) ? numericAmount : null;
    };

    // Salary formatting
    const formatSalary = (salary) => {
        const amount = getSalaryAmount(salary);

        if (amount === null) return "—";

        const currency = String(salary?.currency || "INR").toUpperCase();

        try {
            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency,
                maximumFractionDigits: 2
            }).format(amount);

        } catch {
            return `${currency} ${amount.toLocaleString("en-IN")}`;
        }
    };

    // Pay frequency formatting
    const formatPayFrequency = (frequency) => {
        const frequencies = {
            weekly: "Weekly",
            biweekly: "Biweekly",
            monthly: "Monthly"
        };

        return frequencies[String(frequency || "").toLowerCase()] || "";
    };

    // Employee status formatting
    const formatStatus = (status = "active") => {
        if (status === "on_leave") return "On leave";

        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    // Summary count
    const activeCount = employees.filter(
        (employee) => employee.status === "active"
    ).length;

    // Search filtering
    const filteredEmployees = useMemo(() => {
        const searchTerm = search.trim().toLowerCase();

        if (!searchTerm) return employees;

        return employees.filter((employee) => {
            const searchableValues = [
                employee.name,
                employee.email,
                employee.employeeCode,
                employee.department,
                employee.jobTitle,
                employee.salary?.currency,
                employee.salary?.payFrequency,
                employee.salary?.amount?.toString()
            ];

            return searchableValues.some((value) =>
                String(value || "")
                    .toLowerCase()
                    .includes(searchTerm)
            );
        });
    }, [employees, search]);

    return (
        <div className="employees-page">

            {/* Page Header */}
            <div className="employees-topbar">
                <div className="employees-heading">

                    <div className="employees-breadcrumb">
                        <span>Workspace</span>
                        <span className="breadcrumb-divider">/</span>
                        <span className="breadcrumb-current">
                            Employees
                        </span>
                    </div>

                    <h1>Employees</h1>

                    <p className="employees-subtitle">
                        Manage your team, employee details and payroll information.
                    </p>
                </div>

                <Link
                    to="/employees/create"
                    className="add-employee-btn"
                >
                    <span className="add-btn-icon">+</span>
                    Add employee
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="employees-summary">

                <div className="employees-summary-card">
                    <div className="summary-card-content">
                        <span className="summary-label">
                            Total employees
                        </span>

                        <h2>{employees.length}</h2>

                        <p>Employees in your workspace</p>
                    </div>

                    <div className="summary-icon people-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                </div>

                <div className="employees-summary-card">
                    <div className="summary-card-content">
                        <span className="summary-label">
                            Active employees
                        </span>

                        <h2>{activeCount}</h2>

                        <p>Currently active in your team</p>
                    </div>

                    <div className="summary-icon active-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M20 7 10 17l-5-5" />
                            <path d="M21 12a9 9 0 1 1-5.3-8.23" />
                        </svg>
                    </div>
                </div>

            </div>

            {/* Employee Directory */}
            <section className="employees-table-section">

                <div className="employees-table-heading">

                    <div>
                        <span className="directory-eyebrow">
                            YOUR TEAM
                        </span>

                        <h2>Employee directory</h2>

                        <p>
                            View and manage all employees in your company.
                        </p>
                    </div>

                    <div className="employee-table-actions">

                        <div className="employee-search">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-4-4" />
                            </svg>

                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />

                            {search && (
                                <button
                                    type="button"
                                    className="clear-search-input"
                                    onClick={() => setSearch("")}
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            className={`refresh-employees-btn ${refreshing ? "is-refreshing" : ""}`}
                            onClick={() => fetchEmployees(true)}
                            disabled={refreshing || loading}
                            title="Refresh employees"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 7v5h-5" />
                                <path d="M4 17v-5h5" />
                                <path d="M5.64 9A7 7 0 0 1 18.36 7L20 12" />
                                <path d="M18.36 15A7 7 0 0 1 5.64 17L4 12" />
                            </svg>
                        </button>

                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="employees-state">
                        <div className="employees-loader"></div>
                        <p>Loading employees...</p>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="employees-state employees-error">
                        <div className="empty-employee-icon">!</div>

                        <h3>Something went wrong</h3>
                        <p>{error}</p>

                        <button
                            type="button"
                            className="clear-search-btn"
                            onClick={() => fetchEmployees()}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Empty Employees State */}
                {!loading && !error && employees.length === 0 && (
                    <div className="employees-state employees-empty">

                        <div className="empty-employee-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                <circle cx="9" cy="8" r="3.5" />
                                <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                                <path d="M19 8v6M16 11h6" />
                            </svg>
                        </div>

                        <h3>No employees yet</h3>

                        <p>
                            Add your first employee to start building your team directory.
                        </p>

                        <Link to="/employees/create" className="add-employee-btn">
                            + Add your first employee
                        </Link>

                    </div>
                )}

                {/* No Search Results */}
                {!loading && !error && employees.length > 0 && filteredEmployees.length === 0 && (
                    <div className="employees-state employees-empty">

                        <div className="empty-employee-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-4-4" />
                            </svg>
                        </div>

                        <h3>No matching employees</h3>

                        <p>
                            We couldn't find any employees matching "{search}".
                        </p>

                        <button
                            type="button"
                            className="clear-search-btn"
                            onClick={() => setSearch("")}
                        >
                            Clear search
                        </button>

                    </div>
                )}

                {/* Employee Table */}
                {!loading && !error && filteredEmployees.length > 0 && (
                    <>
                        <div className="employees-table-wrapper">

                            <table className="employees-table">

                                <thead>
                                    <tr>
                                        <th>EMPLOYEE</th>
                                        <th>EMPLOYEE ID</th>
                                        <th>DEPARTMENT</th>
                                        <th>JOB TITLE</th>
                                        <th>SALARY</th>
                                        <th>STATUS</th>
                                        <th>ACTION</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredEmployees.map((employee) => (
                                        <tr key={employee._id}>

                                            <td>
                                                <div className="employee-name-cell">

                                                    <div className="employee-avatar">
                                                        {getInitials(employee.name)}
                                                    </div>

                                                    <div className="employee-identity">
                                                        <span className="employee-name">
                                                            {employee.name}
                                                        </span>

                                                        <span className="employee-email">
                                                            {employee.email}
                                                        </span>
                                                    </div>

                                                </div>
                                            </td>

                                            <td>
                                                <span className="employee-code">
                                                    {employee.employeeCode || "—"}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="employee-table-text">
                                                    {employee.department || "—"}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="employee-table-text">
                                                    {employee.jobTitle || "—"}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="employee-salary-cell">
                                                    <span className="employee-salary">
                                                        {formatSalary(employee.salary.amount.$numberDecimal)}
                                                    </span>

                                                    {formatPayFrequency(employee.salary?.payFrequency) && (
                                                        <span className="employee-pay-frequency">
                                                            {formatPayFrequency(employee.salary?.payFrequency)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td>
                                                <span className={`employee-status status-${employee.status || "active"}`}>
                                                    <span className="status-dot"></span>
                                                    {formatStatus(employee.status)}
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="delete-employee-btn"
                                                    onClick={() => handleDeleteEmployee(employee)}
                                                    disabled={!!deletingId}
                                                    title={`Delete ${employee.name}`}
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                                        <path d="M3 6h18" />
                                                        <path d="M8 6V4h8v2" />
                                                        <path d="m19 6-1 14H6L5 6" />
                                                        <path d="M10 11v5M14 11v5" />
                                                    </svg>

                                                    Delete
                                                </button>
                                            </td>

                                        </tr>
                                    ))}
                                </tbody>

                            </table>
                        </div>

                        <div className="employees-table-footer">
                            <span>
                                Showing <strong>{filteredEmployees.length}</strong>{" "}
                                of <strong>{employees.length}</strong> employees
                            </span>
                        </div>
                    </>
                )}

            </section>

            {/* Page Footer */}
            <footer className="employees-footer">
                <span>PAYFLOW WORKSPACE</span>
                <span>Employee directory</span>
            </footer>

            {/* Custom Delete Confirmation Modal */}
            {showDeleteModal && selectedEmployee && (
                <div
                    className="delete-modal-overlay"
                    onClick={closeDeleteModal}
                >
                    <div
                        className="delete-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <button
                            type="button"
                            className="delete-modal-close"
                            onClick={closeDeleteModal}
                            disabled={!!deletingId}
                            aria-label="Close"
                        >
                            ×
                        </button>

                        <div className="delete-modal-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="m19 6-1 14H6L5 6" />
                                <path d="M10 11v5M14 11v5" />
                            </svg>
                        </div>

                        <span className="delete-modal-eyebrow">
                            CONFIRM DELETION
                        </span>

                        <h2 id="delete-modal-title">
                            Delete employee?
                        </h2>

                        <p className="delete-modal-description">
                            Are you sure you want to delete{" "}
                            <strong>{selectedEmployee.name}</strong>?
                            This action cannot be undone.
                        </p>

                        {deleteError && (
                            <div className="delete-modal-error">
                                {deleteError}
                            </div>
                        )}

                        <div className="delete-modal-actions">

                            <button
                                type="button"
                                className="delete-cancel-btn"
                                onClick={closeDeleteModal}
                                disabled={!!deletingId}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="delete-confirm-btn"
                                onClick={confirmDeleteEmployee}
                                disabled={!!deletingId}
                            >
                                {deletingId ? (
                                    <>
                                        <span className="modal-delete-spinner"></span>
                                        Deleting...
                                    </>
                                ) : (
                                    "Yes, delete"
                                )}
                            </button>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Employees;
