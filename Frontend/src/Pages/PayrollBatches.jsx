
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import "../CSS Styling/PayrollBatches.css";

const getData = (response) =>
  response?.data?.data ?? response?.data ?? null;

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (amount, currency = "") => {
  if (amount === null || amount === undefined) return "—";

  let value = amount;

  if (typeof value === "object") {
    if (value.$numberDecimal !== undefined) {
      value = value.$numberDecimal;
    } else if (typeof value.toString === "function") {
      value = value.toString();
    }
  }

  const numericAmount = Number(value);

  if (!Number.isFinite(numericAmount)) return "—";

  return `${currency ? `${currency} ` : ""}${numericAmount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const getStatusClass = (status) => {
  const normalized = String(status || "draft").toLowerCase();

  if (normalized === "approved" || normalized === "completed") {
    return "batch-status-success";
  }

  if (
    normalized === "pending_approval" ||
    normalized === "processing" ||
    normalized === "scheduled"
  ) {
    return "batch-status-warning";
  }

  if (
    normalized === "failed" ||
    normalized === "partially_failed" ||
    normalized === "cancelled"
  ) {
    return "batch-status-danger";
  }

  return "batch-status-draft";
};

function PayrollBatches() {
  const [batches, setBatches] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Custom action confirmation modal
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [pendingBatchAction, setPendingBatchAction] = useState(null);

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);

  const [batchName, setBatchName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [includeAllEmployees, setIncludeAllEmployees] = useState(true);

  const [actionLoading, setActionLoading] = useState("");

  const activeEmployees = useMemo(() => {
    return employees.filter(
      (employee) =>
        String(employee.status || "").toLowerCase() === "active"
    );
  }, [employees]);

  const draftCount = batches.filter(
    (batch) => batch.status === "draft"
  ).length;

  const pendingCount = batches.filter(
    (batch) => batch.status === "pending_approval"
  ).length;

  const approvedCount = batches.filter(
    (batch) => batch.status === "approved"
  ).length;

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.get("/payroll-batch/all");
      const result = getData(response);

      setBatches(
        Array.isArray(result) ? result : result?.data || []
      );
    } catch (err) {
      console.error("Fetch payroll batches error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load payroll batches. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);

      const response = await API.get("/employee/all");
      const result = getData(response);

      const employeeList = Array.isArray(result)
        ? result
        : result?.employees || result?.data || [];

      setEmployees(employeeList);
    } catch (err) {
      console.error("Fetch employees error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load employees for batch creation."
      );
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const openCreateModal = async () => {
    setError("");
    setSuccess("");

    setBatchName("");
    setStartDate("");
    setEndDate("");
    setSelectedEmployeeIds([]);
    setIncludeAllEmployees(true);

    setShowCreateModal(true);

    await fetchEmployees();
  };

  const toggleEmployee = (employeeId) => {
    setSelectedEmployeeIds((previous) =>
      previous.includes(employeeId)
        ? previous.filter((id) => id !== employeeId)
        : [...previous, employeeId]
    );
  };

  const handleCreateBatch = async (event) => {
    event.preventDefault();

    if (!batchName.trim()) {
      setError("Please enter a batch name.");
      return;
    }

    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    if (!includeAllEmployees && selectedEmployeeIds.length === 0) {
      setError("Please select at least one employee.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        batchName: batchName.trim(),
        startDate,
        endDate,
      };

      if (!includeAllEmployees) {
        payload.employeeIds = selectedEmployeeIds;
      }

      const response = await API.post(
        "/payroll-batch/create",
        payload
      );

      setShowCreateModal(false);

      setSuccess(
        response.data?.message ||
          "Payroll batch created successfully."
      );

      await fetchBatches();
    } catch (err) {
      console.error("Create payroll batch error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to create payroll batch."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openBatchDetails = async (batch) => {
    try {
      setActionLoading(batch._id);
      setError("");
      setSuccess("");

      const response = await API.get(
        `/payroll-batch/${batch._id}`
      );

      const result = getData(response);

      const details =
        result?.batch || result?.data || result;

      setSelectedBatch(batch);
      setSelectedBatchDetails(details);
      setShowDetailsModal(true);
    } catch (err) {
      console.error("Fetch batch details error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load payroll batch details."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleCalculate = async (batch) => {
    try {
      setActionLoading(batch._id);
      setError("");
      setSuccess("");

      const response = await API.post(
        `/payroll-batch/calculate/${batch._id}`
      );

      const result = getData(response);

      setSelectedBatch(batch);
      setSelectedBatchDetails(
        result?.batch || result?.data || result
      );
      setShowDetailsModal(true);

      setSuccess("Payroll totals calculated successfully.");

      await fetchBatches();
    } catch (err) {
      console.error("Calculate batch error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to calculate this batch."
      );
    } finally {
      setActionLoading("");
    }
  };

  // Open custom confirmation modal instead of browser alert.
  const handleBatchAction = (batch, action) => {
    if (actionLoading) return;

    setError("");
    setSuccess("");

    setPendingBatchAction({ batch, action });
    setShowActionConfirm(true);
  };

  // Execute the action only after custom modal confirmation.
  const confirmBatchAction = async () => {
    if (!pendingBatchAction || actionLoading) return;

    const { batch, action } = pendingBatchAction;

    const endpoints = {
      submit: `/payroll-batch/submit/${batch._id}`,
      approve: `/payroll-batch/approve/${batch._id}`,
      cancel: `/payroll-batch/cancel/${batch._id}`,
    };

    try {
      setShowActionConfirm(false);
      setActionLoading(batch._id);
      setError("");
      setSuccess("");

      const response = await API.post(endpoints[action]);

      setSuccess(
        response.data?.message ||
          `Payroll batch ${action} action completed successfully.`
      );

      await fetchBatches();

      if (selectedBatch?._id === batch._id) {
        const updatedStatus = {
          submit: "pending_approval",
          approve: "approved",
          cancel: "cancelled",
        };

        setSelectedBatch((previous) =>
          previous
            ? { ...previous, status: updatedStatus[action] }
            : previous
        );

        setSelectedBatchDetails((previous) =>
          previous
            ? { ...previous, status: updatedStatus[action] }
            : previous
        );
      }
    } catch (err) {
      console.error(`Batch ${action} error:`, err);

      setError(
        err.response?.data?.message ||
          `Unable to ${action} this payroll batch.`
      );
    } finally {
      setActionLoading("");
      setPendingBatchAction(null);
    }
  };

  const closeActionConfirm = () => {
    if (actionLoading) return;

    setShowActionConfirm(false);
    setPendingBatchAction(null);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedBatchDetails(null);
    setSelectedBatch(null);
  };

  const getEmployeeName = (employee) => {
    return (
      employee.name ||
      employee.fullName ||
      [employee.firstName, employee.lastName]
        .filter(Boolean)
        .join(" ") ||
      "Unnamed employee"
    );
  };

  const actionDetails = {
    submit: {
      title: "Submit payroll batch?",
      description:
        "This batch will be submitted for approval. You can review its details before approving it.",
      button: "Yes, Submit Batch",
      icon: "↑",
    },
    approve: {
      title: "Approve payroll batch?",
      description:
        "This will approve the selected payroll batch and make it available for payment processing.",
      button: "Yes, Approve Batch",
      icon: "✓",
    },
    cancel: {
      title: "Cancel payroll batch?",
      description:
        "This action will cancel the selected payroll batch. Please make sure you want to continue.",
      button: "Yes, Cancel Batch",
      icon: "×",
    },
  };

  const currentAction = pendingBatchAction
    ? actionDetails[pendingBatchAction.action]
    : null;

  return (
    <div className="payroll-batches-page">

      {/* CUSTOM ACTION CONFIRMATION MODAL */}
      {showActionConfirm && pendingBatchAction && currentAction && (
        <div
          className="batch-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeActionConfirm();
            }
          }}
        >
          <div
            className="batch-modal batch-action-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="batch-modal-header">
              <div>
                <span className="payroll-batches-eyebrow">
                  PAYFLOW CONFIRMATION
                </span>

                <h2 id="batch-confirm-title">
                  {currentAction.title}
                </h2>

                <p>{currentAction.description}</p>
              </div>

              <button
                type="button"
                className="batch-modal-close"
                onClick={closeActionConfirm}
                disabled={Boolean(actionLoading)}
              >
                ×
              </button>
            </div>

            <div className="batch-confirm-details">
              <div>
                <span>Batch name</span>
                <strong>
                  {pendingBatchAction.batch.batchName ||
                    "Untitled Batch"}
                </strong>
              </div>

              <div>
                <span>Payroll period</span>
                <strong>
                  {formatDate(
                    pendingBatchAction.batch.period?.startDate
                  )}{" "}
                  –{" "}
                  {formatDate(
                    pendingBatchAction.batch.period?.endDate
                  )}
                </strong>
              </div>

              <div>
                <span>Current status</span>
                <strong>
                  {String(
                    pendingBatchAction.batch.status || "draft"
                  ).replaceAll("_", " ")}
                </strong>
              </div>
            </div>

            <div className="batch-confirm-warning">
              <strong>Please confirm this action.</strong>
              <p>
                This action will update the payroll batch in your
                PayFlow database.
              </p>
            </div>

            <div className="batch-modal-footer">
              <button
                type="button"
                className="batch-secondary-btn"
                onClick={closeActionConfirm}
                disabled={Boolean(actionLoading)}
              >
                Go Back
              </button>

              <button
                type="button"
                className="batch-primary-btn"
                onClick={confirmBatchAction}
                disabled={Boolean(actionLoading)}
              >
                {currentAction.button} →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="payroll-batches-header">
        <div>
          <span className="payroll-batches-eyebrow">
            PAYROLL MANAGEMENT
          </span>

          <h1>Payroll Batches</h1>

          <p>
            Create, calculate and manage your company's payroll batches.
          </p>
        </div>

        <button
          className="batch-primary-btn"
          onClick={openCreateModal}
        >
          + Create Payroll Batch
        </button>
      </div>

      {error && (
        <div className="batch-alert batch-alert-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="batch-alert batch-alert-success">
          {success}
          <button onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      <div className="batch-summary-grid">
        <div className="batch-summary-card">
          <div className="batch-summary-icon purple">▤</div>
          <div>
            <span>Total Batches</span>
            <h2>{batches.length}</h2>
          </div>
        </div>

        <div className="batch-summary-card">
          <div className="batch-summary-icon blue">◷</div>
          <div>
            <span>Draft Batches</span>
            <h2>{draftCount}</h2>
          </div>
        </div>

        <div className="batch-summary-card">
          <div className="batch-summary-icon orange">◉</div>
          <div>
            <span>Pending Approval</span>
            <h2>{pendingCount}</h2>
          </div>
        </div>

        <div className="batch-summary-card">
          <div className="batch-summary-icon green">✓</div>
          <div>
            <span>Approved Batches</span>
            <h2>{approvedCount}</h2>
          </div>
        </div>
      </div>

      <div className="batch-table-container">
        <div className="batch-table-header">
          <div>
            <h2>All Payroll Batches</h2>
            <p>Manage and track your payroll processing.</p>
          </div>

          <button
            className="batch-refresh-btn"
            onClick={fetchBatches}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="batch-state">
            <div className="batch-loader"></div>
            <p>Loading payroll batches...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="batch-state">
            <div className="batch-empty-icon">▤</div>
            <h3>No payroll batches yet</h3>
            <p>
              Create your first payroll batch to get started.
            </p>

            <button
              className="batch-primary-btn"
              onClick={openCreateModal}
            >
              Create Your First Batch
            </button>
          </div>
        ) : (
          <div className="batch-table-scroll">
            <table className="batch-table">
              <thead>
                <tr>
                  <th>Batch Name</th>
                  <th>Payroll Period</th>
                  <th>Employees</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {batches.map((batch) => (
                  <tr key={batch._id}>
                    <td>
                      <strong>
                        {batch.batchName || "Untitled Batch"}
                      </strong>
                      <span className="batch-id">
                        ID: {batch._id?.slice(-8) || "—"}
                      </span>
                    </td>

                    <td>
                      {formatDate(batch.period?.startDate)}
                      <span className="batch-date-separator">
                        to
                      </span>
                      {formatDate(batch.period?.endDate)}
                    </td>

                    <td>
                      {batch.items?.length ??
                        batch.employeeCount ??
                        "—"}
                    </td>

                    <td>
                      {batch.totalAmount !== null &&
                      batch.totalAmount !== undefined
                        ? formatMoney(
                            batch.totalAmount,
                            batch.currency
                          )
                        : batch.currencyBreakdown?.length
                        ? batch.currencyBreakdown
                            .map((item) =>
                              formatMoney(
                                item.total,
                                item.currency
                              )
                            )
                            .join(" / ")
                        : "Calculate totals"}
                    </td>

                    <td>
                      <span
                        className={`batch-status ${getStatusClass(
                          batch.status
                        )}`}
                      >
                        {String(batch.status || "draft").replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    </td>

                    <td>{formatDate(batch.createdAt)}</td>

                    <td>
                      <div className="batch-actions">
                        <button
                          className="batch-action-btn calculate"
                          onClick={() => openBatchDetails(batch)}
                          disabled={actionLoading === batch._id}
                        >
                          View
                        </button>

                        {batch.status === "draft" && (
                          <>
                            <button
                              className="batch-action-btn calculate"
                              onClick={() => handleCalculate(batch)}
                              disabled={actionLoading === batch._id}
                            >
                              Calculate
                            </button>

                            <button
                              className="batch-action-btn submit"
                              onClick={() =>
                                handleBatchAction(batch, "submit")
                              }
                              disabled={actionLoading === batch._id}
                            >
                              Submit
                            </button>
                          </>
                        )}

                        {batch.status === "pending_approval" && (
                          <button
                            className="batch-action-btn approve"
                            onClick={() =>
                              handleBatchAction(batch, "approve")
                            }
                            disabled={actionLoading === batch._id}
                          >
                            Approve
                          </button>
                        )}

                        {[
                          "draft",
                          "pending_approval",
                          "approved",
                          "scheduled",
                        ].includes(batch.status) && (
                          <button
                            className="batch-action-btn cancel"
                            onClick={() =>
                              handleBatchAction(batch, "cancel")
                            }
                            disabled={actionLoading === batch._id}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div
          className="batch-modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="batch-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="batch-modal-header">
              <div>
                <span className="payroll-batches-eyebrow">
                  NEW PAYROLL
                </span>
                <h2>Create Payroll Batch</h2>
                <p>Set up a payroll period and choose employees.</p>
              </div>

              <button
                className="batch-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBatch}>
              <div className="batch-form-group">
                <label>Batch Name</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(event) =>
                    setBatchName(event.target.value)
                  }
                  placeholder="e.g. November 2026 Payroll"
                  required
                />
              </div>

              <div className="batch-form-grid">
                <div className="batch-form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(event.target.value)
                    }
                    required
                  />
                </div>

                <div className="batch-form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) =>
                      setEndDate(event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="batch-form-group">
                <label>Employees</label>

                <div className="batch-employee-choice">
                  <label className="batch-radio-option">
                    <input
                      type="radio"
                      checked={includeAllEmployees}
                      onChange={() => {
                        setIncludeAllEmployees(true);
                        setSelectedEmployeeIds([]);
                      }}
                    />
                    <span>
                      All active employees ({activeEmployees.length})
                    </span>
                  </label>

                  <label className="batch-radio-option">
                    <input
                      type="radio"
                      checked={!includeAllEmployees}
                      onChange={() =>
                        setIncludeAllEmployees(false)
                      }
                    />
                    <span>Select employees individually</span>
                  </label>
                </div>

                {!includeAllEmployees && (
                  <div className="batch-employee-list">
                    {employeesLoading ? (
                      <p>Loading employees...</p>
                    ) : activeEmployees.length === 0 ? (
                      <p>No active employees found.</p>
                    ) : (
                      activeEmployees.map((employee) => (
                        <label
                          className="batch-employee-option"
                          key={employee._id}
                        >
                          <input
                            type="checkbox"
                            checked={selectedEmployeeIds.includes(
                              employee._id
                            )}
                            onChange={() =>
                              toggleEmployee(employee._id)
                            }
                          />

                          <span>
                            <strong>
                              {getEmployeeName(employee)}
                            </strong>
                            <small>
                              {employee.employeeCode ||
                                "No employee code"}
                            </small>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="batch-modal-footer">
                <button
                  type="button"
                  className="batch-secondary-btn"
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="batch-primary-btn"
                  disabled={submitting || employeesLoading}
                >
                  {submitting ? "Creating..." : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedBatchDetails && (
        <div
          className="batch-modal-overlay"
          onClick={closeDetailsModal}
        >
          <div
            className="batch-modal batch-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="batch-modal-header">
              <div>
                <span className="payroll-batches-eyebrow">
                  PAYROLL DETAILS
                </span>
                <h2>
                  {selectedBatchDetails.batchName ||
                    selectedBatch?.batchName ||
                    "Batch Details"}
                </h2>
                <p>Employee salary breakdown.</p>
              </div>

              <button
                className="batch-modal-close"
                onClick={closeDetailsModal}
              >
                ×
              </button>
            </div>

            <div className="batch-calculation-summary">
              {selectedBatchDetails.currencyBreakdown?.length > 0 ? (
                selectedBatchDetails.currencyBreakdown.map(
                  (item, index) => (
                    <div
                      className="batch-total-card"
                      key={index}
                    >
                      <span>{item.currency} Total</span>
                      <strong>
                        {formatMoney(item.total, item.currency)}
                      </strong>
                    </div>
                  )
                )
              ) : (
                <div className="batch-total-card">
                  <span>Total Payroll Amount</span>
                  <strong>
                    {formatMoney(
                      selectedBatchDetails.totalAmount
                    )}
                  </strong>
                </div>
              )}
            </div>

            <div className="batch-details-table-wrapper">
              <table className="batch-table batch-details-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee Code</th>
                    <th>Base Salary</th>
                    <th>Final Amount</th>
                    <th>Currency</th>
                    <th>Payment Status</th>
                  </tr>
                </thead>

                <tbody>
                  {(selectedBatchDetails.items || []).map(
                    (item, index) => (
                      <tr key={item.employeeId || index}>
                        <td>{item.employeeName || "—"}</td>
                        <td>{item.employeeCode || "—"}</td>
                        <td>
                          {formatMoney(
                            item.baseAmount,
                            item.currency
                          )}
                        </td>
                        <td>
                          <strong>
                            {formatMoney(
                              item.finalAmount,
                              item.currency
                            )}
                          </strong>
                        </td>
                        <td>{item.currency || "—"}</td>
                        <td>
                          {String(
                            item.paymentStatus || "pending"
                          ).replaceAll("_", " ")}
                        </td>
                      </tr>
                    )
                  )}

                  {(selectedBatchDetails.items || []).length ===
                    0 && (
                    <tr>
                      <td colSpan="6" className="batch-no-items">
                        No employee items available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="batch-modal-footer">
              <button
                className="batch-primary-btn"
                onClick={closeDetailsModal}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PayrollBatches;
