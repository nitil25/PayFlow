
import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";
import "../CSS Styling/PayrollPayments.css";

const getData = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.employees)) return payload.employees;

  return payload?.data ?? payload ?? null;
};

const getAmount = (value) => {
  if (value == null) return 0;

  let raw = value;

  if (typeof value === "object") {
    raw =
      value.$numberDecimal ??
      value.value ??
      value.toString?.() ??
      0;
  }

  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : 0;
};

const money = (amount, currency = "INR") => {
  const value = getAmount(amount);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || "INR"} ${value.toLocaleString("en-IN")}`;
  }
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const getEmployeeId = (item) =>
  item?.employeeId?._id || item?.employeeId || "";

function PayrollPayments() {
  const [batches, setBatches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [search, setSearch] = useState("");

  const [stage, setStage] = useState("select");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // FETCH PAYROLL BATCHES AND EMPLOYEES
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [batchResponse, employeeResponse] = await Promise.all([
        API.get("/payroll-batch/all"),
        API.get("/employee/all"),
      ]);

      const batchData = getData(batchResponse);
      const employeeData = getData(employeeResponse);

      setBatches(Array.isArray(batchData) ? batchData : []);
      setEmployees(Array.isArray(employeeData) ? employeeData : []);
    } catch (err) {
      console.error("Payroll payments fetch error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load payroll data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // EMPLOYEE LOOKUP MAP
  const employeeMap = useMemo(() => {
    const map = new Map();

    employees.forEach((employee) => {
      if (employee?._id) {
        map.set(String(employee._id), employee);
      }

      if (employee?.employeeCode) {
        map.set(`code:${employee.employeeCode}`, employee);
      }
    });

    return map;
  }, [employees]);

  // GET EMPLOYEE DETAILS WITH BATCH FALLBACK
  const getEmployeeDetails = useCallback(
    (item) => {
      const employeeId = String(getEmployeeId(item) || "");

      const employee =
        employeeMap.get(employeeId) ||
        (item?.employeeCode
          ? employeeMap.get(`code:${item.employeeCode}`)
          : null) ||
        employees.find(
          (emp) =>
            emp?.name === item?.employeeName &&
            emp?.country === item?.country
        );

      return {
        employee,
        employeeCode:
          item?.employeeCode || employee?.employeeCode || "—",
        name: item?.employeeName || employee?.name || "Unknown employee",
        email: employee?.email || "Not available",
        recipient:
          employee?.paymentMethods?.recipientEmail || "Not available",
        department: employee?.department || "Not available",
        jobTitle: employee?.jobTitle || "Not available",
        payFrequency:
          employee?.salary?.payFrequency || "Not available",
        baseAmount:
          item?.baseAmount ?? employee?.salary?.amount ?? 0,
        currency:
          item?.currency || employee?.salary?.currency || "INR",
      };
    },
    [employeeMap, employees]
  );

  // AVAILABLE BATCHES
  const availableBatches = useMemo(
    () =>
      batches.filter((batch) =>
        ["approved", "partially_failed"].includes(batch.status)
      ),
    [batches]
  );

  const filteredBatches = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return availableBatches;

    return availableBatches.filter((batch) =>
      [batch.batchName, batch.status, batch._id].some((value) =>
        String(value || "").toLowerCase().includes(term)
      )
    );
  }, [availableBatches, search]);

  const batchItems = selectedBatch?.items || [];

  // CURRENCY TOTALS
  const currencyTotals = useMemo(() => {
    const totals = {};

    batchItems.forEach((item) => {
      const details = getEmployeeDetails(item);
      const currency = details.currency || "INR";

      totals[currency] =
        (totals[currency] || 0) + getAmount(item.finalAmount);
    });

    return totals;
  }, [batchItems, getEmployeeDetails]);

  const completedCount = batchItems.filter(
    (item) => item.paymentStatus === "completed"
  ).length;

  const failedCount = batchItems.filter(
    (item) => item.paymentStatus === "failed"
  ).length;

  const pendingCount = batchItems.filter((item) =>
    ["pending", "processing"].includes(item.paymentStatus)
  ).length;

  // SELECT PAYROLL BATCH
  const selectBatch = async (batchId) => {
    try {
      setError("");
      setLoading(true);

      const response = await API.get(`/payroll-batch/${batchId}`);
      const batch = getData(response);

      if (!batch?._id) {
        throw new Error("Unable to retrieve payroll batch details.");
      }

      setSelectedBatch(batch);
      setResult(null);
      setStage("review");
    } catch (err) {
      console.error("Batch details error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to open this payroll batch."
      );
    } finally {
      setLoading(false);
    }
  };

  // OPEN CONFIRMATION
  const processPayroll = () => {
  if (!selectedBatch?._id || processing) return;

  setShowConfirmation(true);
};

  // PROCESS PAYROLL
  const confirmPayrollProcessing = async () => {
    if (!selectedBatch?._id || processing) return;

    try {
      setShowConfirmation(false);
      setError("");
      setProcessing(true);
      setStage("processing");

      const response = await API.post(
        `/payroll-batch/process/${selectedBatch._id}`,
        { failedItemIds: [] }
      );

      const data = getData(response);

      setResult(data);

      if (data?.items) {
        setSelectedBatch((current) => ({
          ...current,
          status: data.batchStatus,
          items: data.items,
        }));
      }

      setStage("complete");

      await fetchData();
    } catch (err) {
      console.error("Payroll processing error:", err);

      setError(
        err.response?.data?.message ||
          "Payroll processing failed. Please try again."
      );

      setStage("review");
    } finally {
      setProcessing(false);
    }
  };

  // RESET PAGE
  const resetPage = () => {
    setShowConfirmation(false);
    setSelectedBatch(null);
    setResult(null);
    setSearch("");
    setError("");
    setStage("select");
    fetchData();
  };

  // ESCAPE HTML
  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    });

  // CREATE PAYSLIP HTML
  const createPayslipHTML = (item) => {
    const employee = getEmployeeDetails(item);

    const adjustments = (item.adjustments || [])
      .map(
        (adjustment) => `
          <div class="row">
            <span>${escapeHTML(adjustment.type)} - ${escapeHTML(
              adjustment.reason || ""
            )}</span>
            <strong>${money(adjustment.amount, employee.currency)}</strong>
          </div>
        `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>PayFlow Payslip - ${escapeHTML(employee.name)}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #29243c;
            padding: 35px;
            max-width: 760px;
            margin: auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #6735c5;
            padding-bottom: 20px;
          }
          h1 { color: #6735c5; margin: 0; }
          h3 { margin-top: 28px; }
          .muted { color: #777; font-size: 13px; }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            padding: 12px 0;
            border-bottom: 1px solid #eee;
          }
          .total {
            color: #6735c5;
            font-size: 20px;
            font-weight: bold;
          }
          .notice {
            background: #f5f1ff;
            padding: 14px;
            margin-top: 28px;
            border-radius: 8px;
            font-size: 12px;
          }
          @media print {
            body { padding: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>PayFlow</h1>
            <p class="muted">PAYROLL PAYMENT SLIP</p>
          </div>
          <div>
            <strong>${escapeHTML(selectedBatch?.batchName || "Payroll Batch")}</strong>
            <p class="muted">${formatDate(new Date())}</p>
          </div>
        </div>

        <h3>Employee details</h3>
        <div class="row"><span>Name</span><strong>${escapeHTML(employee.name)}</strong></div>
        <div class="row"><span>Employee code</span><strong>${escapeHTML(employee.employeeCode)}</strong></div>
        <div class="row"><span>Email</span><strong>${escapeHTML(employee.email)}</strong></div>
        <div class="row"><span>Department</span><strong>${escapeHTML(employee.department)}</strong></div>
        <div class="row"><span>Job title</span><strong>${escapeHTML(employee.jobTitle)}</strong></div>
        <div class="row"><span>Country</span><strong>${escapeHTML(item.country || employee.employee?.country || "—")}</strong></div>

        <h3>Payroll details</h3>
        <div class="row"><span>Payroll period</span><strong>${formatDate(selectedBatch?.period?.startDate)} - ${formatDate(selectedBatch?.period?.endDate)}</strong></div>
        <div class="row"><span>Pay frequency</span><strong>${escapeHTML(employee.payFrequency)}</strong></div>
        <div class="row"><span>Base salary</span><strong>${money(employee.baseAmount, employee.currency)}</strong></div>
        ${adjustments}
        <div class="row total"><span>Final amount</span><strong>${money(item.finalAmount, employee.currency)}</strong></div>
        <div class="row"><span>Payment status</span><strong>${escapeHTML(item.paymentStatus)}</strong></div>

        <div class="notice">
          PayFlow payment simulation. No actual money transfer has been made.
        </div>
      </body>
      </html>
    `;
  };

  // DOWNLOAD PAYSLIP
  const downloadPayslip = (item) => {
    const html = createPayslipHTML(item);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;

    const employee = getEmployeeDetails(item);

    link.download = `PayFlow-Payslip-${employee.employeeCode || employee.name}.html`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // PRINT PAYSLIP
  const printPayslip = (item) => {
    const slipWindow = window.open("", "_blank", "width=850,height=700");

    if (!slipWindow) {
      setError("Please allow pop-ups to print the payslip.");
      return;
    }

    slipWindow.document.write(createPayslipHTML(item));
    slipWindow.document.close();
    slipWindow.focus();
    slipWindow.onload = () => slipWindow.print();
  };

  const statusClass = (status) =>
    `payment-status status-${String(status || "pending").replace(/_/g, "-")}`;

  return (
    <div className="payroll-page">
      {/* CONFIRMATION MODAL */}
      {showConfirmation && selectedBatch && (
        <div
          className="payroll-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !processing) {
              setShowConfirmation(false);
            }
          }}
        >
          <div
            className="payroll-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payroll-confirm-title"
          >
            <div className="payroll-modal-icon">₹</div>

            <span className="payroll-eyebrow">
              PAYMENT AUTHORIZATION
            </span>

            <h2 id="payroll-confirm-title">
              Confirm payroll processing?
            </h2>

            <p className="payroll-modal-description">
              You are about to process the following payroll batch.
              Please review the details before continuing.
            </p>

            <div className="payroll-modal-details">
              <div>
                <span>Batch name</span>
                <strong>{selectedBatch.batchName || "Payroll Batch"}</strong>
              </div>

              <div>
                <span>Employees</span>
                <strong>
                  {batchItems.filter((item) =>
                    ["pending", "failed"].includes(item.paymentStatus)
                  ).length}
                </strong>
              </div>

              <div>
                <span>Payroll period</span>
                <strong>
                  {formatDate(selectedBatch.period?.startDate)} –{" "}
                  {formatDate(selectedBatch.period?.endDate)}
                </strong>
              </div>

              {Object.entries(currencyTotals).map(([currency, total]) => (
                <div key={currency}>
                  <span>Total ({currency})</span>
                  <strong>{money(total, currency)}</strong>
                </div>
              ))}
            </div>

            <div className="payroll-modal-warning">
              <strong>Simulation mode</strong>
              <p>
                This action will update payment statuses in your PayFlow
                database. No actual money will be transferred.
              </p>
            </div>

            <div className="payroll-modal-actions">
              <button
                className="payroll-secondary-btn"
                onClick={() => setShowConfirmation(false)}
                disabled={processing}
              >
                Cancel
              </button>

              <button
                className="payroll-primary-btn"
                onClick={confirmPayrollProcessing}
                disabled={processing}
              >
                Confirm & Process →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="payroll-heading">
        <div>
          <span className="payroll-eyebrow">PAYFLOW WORKSPACE</span>
          <h1>Payroll payments</h1>
          <p>
            Process approved payroll batches and manage employee payslips.
          </p>
        </div>

        <div className="payroll-demo-tag">
          <span />
          Payment simulation mode
        </div>
      </div>

      <div className="payroll-stepper">
        {["Select batch", "Payment review", "Payslips"].map(
          (label, index) => {
            const activeIndex =
              stage === "select"
                ? 0
                : stage === "review" || stage === "processing"
                  ? 1
                  : 2;

            return (
              <div
                className={`payroll-step ${
                  activeIndex >= index ? "is-active" : ""
                }`}
                key={label}
              >
                <span>{index + 1}</span>
                {label}
              </div>
            );
          }
        )}
      </div>

      {error && (
        <div className="payroll-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {loading && (
        <section className="payroll-flow-card">
          <div className="flow-icon">↻</div>
          <h2>Loading payroll data...</h2>
          <p>Connecting to your PayFlow workspace.</p>
        </section>
      )}

      {!loading && stage === "select" && (
        <>
          <div className="payroll-stats">
            <div className="payroll-stat-card">
              <span>Total payroll batches</span>
              <strong>{batches.length}</strong>
              <small>Stored in your account</small>
            </div>

            <div className="payroll-stat-card">
              <span>Ready for processing</span>
              <strong>{availableBatches.length}</strong>
              <small>Approved or partially failed</small>
            </div>

            <div className="payroll-stat-card">
              <span>Employee records</span>
              <strong>{employees.length}</strong>
              <small>Loaded from your database</small>
            </div>
          </div>

          <section className="payroll-panel">
            <div className="payroll-panel-heading">
              <div>
                <h2>Approved payroll batches</h2>
                <p>
                  Select a batch to review its employee payments.
                </p>
              </div>

              <div className="payroll-search">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search payroll batches"
                />
              </div>
            </div>

            <div className="payroll-table-wrap">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Batch name</th>
                    <th>Payroll period</th>
                    <th>Status</th>
                    <th>Employees</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBatches.map((batch) => (
                    <tr key={batch._id}>
                      <td>
                        <strong>{batch.batchName || "Payroll batch"}</strong>
                        <small>{String(batch._id).slice(-8)}</small>
                      </td>

                      <td>
                        {formatDate(batch.period?.startDate)} –{" "}
                        {formatDate(batch.period?.endDate)}
                      </td>

                      <td>
                        <span className={statusClass(batch.status)}>
                          {batch.status?.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td>{batch.employeeCount ?? batch.items?.length ?? "—"}</td>

                      <td>
                        <button
                          className="payroll-primary-btn"
                          onClick={() => selectBatch(batch._id)}
                        >
                          Review batch →
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!filteredBatches.length && (
                    <tr>
                      <td colSpan="5" className="payroll-empty">
                        No approved payroll batches are available.
                        <br />
                        <small>
                          Create a batch in Payroll Batches and approve it
                          before processing.
                        </small>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!loading && stage === "review" && selectedBatch && (
        <>
          <section className="payroll-panel">
            <button className="text-button" onClick={resetPage}>
              ← Back to batches
            </button>

            <div className="payroll-panel-heading">
              <div>
                <span className="payroll-eyebrow">PAYROLL REVIEW</span>
                <h2>{selectedBatch.batchName}</h2>
                <p>
                  {formatDate(selectedBatch.period?.startDate)} –{" "}
                  {formatDate(selectedBatch.period?.endDate)}
                </p>
              </div>

              <span className={statusClass(selectedBatch.status)}>
                {selectedBatch.status?.replace(/_/g, " ")}
              </span>
            </div>

            <div className="payroll-stats">
              <div className="payroll-stat-card">
                <span>Employees</span>
                <strong>{batchItems.length}</strong>
              </div>

              <div className="payroll-stat-card">
                <span>Completed</span>
                <strong>{completedCount}</strong>
              </div>

              <div className="payroll-stat-card">
                <span>Failed</span>
                <strong>{failedCount}</strong>
              </div>
            </div>

            <div className="payroll-table-wrap">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee code</th>
                    <th>Base salary</th>
                    <th>Adjustments</th>
                    <th>Final amount</th>
                    <th>Payment status</th>
                  </tr>
                </thead>

                <tbody>
                  {batchItems.map((item) => {
                    const employee = getEmployeeDetails(item);

                    return (
                      <tr key={item._id}>
                        <td>
                          <div className="payroll-person">
                            <div className="payroll-avatar">
                              {employee.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")}
                            </div>
                            <div>
                              <strong>{employee.name}</strong>
                              <small>{item.country || "—"}</small>
                            </div>
                          </div>
                        </td>

                        <td>{employee.employeeCode}</td>

                        <td>
                          {money(employee.baseAmount, employee.currency)}
                        </td>

                        <td>{item.adjustments?.length || 0}</td>

                        <td className="salary-cell">
                          {money(item.finalAmount, employee.currency)}
                        </td>

                        <td>
                          <span className={statusClass(item.paymentStatus)}>
                            {item.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {!batchItems.length && (
                    <tr>
                      <td colSpan="6" className="payroll-empty">
                        This batch has no employee records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="payroll-batch-panel">
            <div>
              <span className="payroll-eyebrow">BATCH SUMMARY</span>
              <h2>{batchItems.length} employee payments</h2>

              {Object.entries(currencyTotals).map(([currency, total]) => (
                <p key={currency}>
                  Total amount: <strong>{money(total, currency)}</strong>
                </p>
              ))}
            </div>

            <div className="payroll-batch-actions">
              <button className="payroll-secondary-btn" onClick={resetPage}>
                Cancel
              </button>

              <button
                className="payroll-primary-btn"
                disabled={!batchItems.some((item) =>
                  ["pending", "failed"].includes(item.paymentStatus)
                )}
                onClick={processPayroll}
              >
                Process payroll →
              </button>
            </div>
          </section>

          <p className="simulation-note">
            Simulation only. No actual money will be transferred.
          </p>
        </>
      )}

      {stage === "processing" && (
        <section className="payroll-flow-card transaction-card">
          <div className="flow-icon">↗</div>
          <span className="payroll-eyebrow">PAYFLOW PROCESSING</span>
          <h2>Processing payroll payments</h2>
          <p>
            Saving employee payment results to your PayFlow database.
          </p>

          <div className="transaction-progress">
            <span style={{ width: "70%" }} />
          </div>

          <div className="simulation-banner">
            Please wait. Do not close this page while processing is underway.
          </div>

          <div className="processing-spinner" />
          <small className="simulation-note">
            Simulated transactions · No real funds are transferred
          </small>
        </section>
      )}

      {stage === "complete" && selectedBatch && (
        <section className="payroll-complete-panel">
          <div className="complete-check">✓</div>

          <span className="payroll-eyebrow">PROCESSING RESULTS</span>
          <h2>Payroll processing finished</h2>

          <p>
            Batch <strong>{selectedBatch.batchName}</strong>
          </p>

          <div className="payroll-stats">
            <div className="payroll-stat-card">
              <span>Total employees</span>
              <strong>{result?.totalEmployees ?? batchItems.length}</strong>
            </div>

            <div className="payroll-stat-card">
              <span>Successful</span>
              <strong>{result?.completedCount ?? completedCount}</strong>
            </div>

            <div className="payroll-stat-card">
              <span>Failed</span>
              <strong>{result?.failedCount ?? failedCount}</strong>
            </div>
          </div>

          <div className="payslip-list-heading">
            <div>
              <h3>Employee payslips</h3>
              <p>
                Download an individual payslip or print it as a PDF.
              </p>
            </div>
          </div>

          <div className="payslip-list">
            {batchItems.map((item) => {
              const employee = getEmployeeDetails(item);

              return (
                <div className="payslip-row" key={item._id}>
                  <div className="payroll-person">
                    <div className="payroll-avatar">
                      {employee.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>

                    <div>
                      <strong>{employee.name}</strong>
                      <small>{employee.employeeCode}</small>
                    </div>
                  </div>

                  <div className="payslip-row-right">
                    <strong>
                      {money(item.finalAmount, employee.currency)}
                    </strong>

                    <span className={statusClass(item.paymentStatus)}>
                      {item.paymentStatus}
                    </span>
                  </div>

                  <div className="payslip-actions">
                    <button onClick={() => downloadPayslip(item)}>
                      ↓ Download
                    </button>

                    <button onClick={() => printPayslip(item)}>
                      Print
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="complete-footer">
            <span>Simulation only · No real funds were transferred.</span>

            <button className="payroll-primary-btn" onClick={resetPage}>
              Back to payroll batches →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default PayrollPayments;
