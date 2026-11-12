
import { useEffect, useMemo, useRef, useState } from "react";
import API from "../services/api";
import "../CSS Styling/PayrollImports.css";

function PayrollImports() {
  const fileInputRef = useRef(null);

  const [imports, setImports] = useState([]);
  const [selectedImport, setSelectedImport] = useState(null);
  const [records, setRecords] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [search, setSearch] = useState("");

  const [periodStartDate, setPeriodStartDate] = useState("");
  const [periodEndDate, setPeriodEndDate] = useState("");
  const [batchName, setBatchName] = useState("");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [approving, setApproving] = useState(false);

  const [showConfirmation, setShowConfirmation] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getErrorMessage = (err) =>
    err.response?.data?.message ||
    err.response?.data?.error ||
    "Something went wrong. Please try again.";

  const getImportData = (response) =>
    response?.data?.data ?? response?.data ?? null;

  // =====================================
  // FETCH IMPORTS
  // =====================================

  const fetchImports = async () => {
    try {
      setError("");

      const response = await API.get("/payroll/all");
      const data = getImportData(response);

      setImports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch imports error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, []);

  // =====================================
  // OPEN IMPORT DETAILS
  // =====================================

  const openImport = async (importId) => {
    try {
      setError("");
      setSuccess("");

      const response = await API.get(`/payroll/${importId}`);
      const data = getImportData(response);

      if (!data) {
        setError("Unable to load import details.");
        return;
      }

      setSelectedImport(data);

      setRecords(
        Array.isArray(data.extractedRecords)
          ? data.extractedRecords.map((record) => ({
              ...record,
              department: record.department ?? "",
              jobTitle: record.jobTitle ?? "",
              salary: {
                ...record.salary,
                amount: record.salary?.amount ?? "",
                currency: record.salary?.currency ?? "INR",
                payFrequency: record.salary?.payFrequency ?? "monthly",
              },
            }))
          : []
      );

      setPeriodStartDate("");
      setPeriodEndDate("");
      setBatchName("");
      setShowConfirmation(false);
    } catch (err) {
      console.error("Open import error:", err);
      setError(getErrorMessage(err));
    }
  };

  // =====================================
  // FILE SELECTION
  // =====================================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["csv", "xls", "xlsx"].includes(extension)) {
      setError("Please select a CSV, XLS, or XLSX file.");
      setSelectedFile(null);
      event.target.value = "";
      return;
    }

    setError("");
    setSuccess("");
    setSelectedFile(file);
  };

  // =====================================
  // UPLOAD FILE
  // =====================================

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a payroll file first.");
      return;
    }

    const formData = new FormData();
    formData.append("payrollFile", selectedFile);

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      await API.post("/payroll/upload", formData);

      setSuccess("Payroll file uploaded successfully.");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await fetchImports();
    } catch (err) {
      console.error("Upload error:", err);
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  // =====================================
  // PROCESS UPLOADED FILE
  // =====================================

  const handleProcess = async (importId) => {
    try {
      setProcessing(true);
      setError("");
      setSuccess("");

      const response = await API.post(`/payroll/process/${importId}`);

      const result = response.data?.data ?? response.data ?? {};

      setSuccess(
        `Processing completed. Total: ${
          result.totalRecords ?? result.total ?? 0
        }, Valid: ${
          result.validRecords ?? result.valid ?? 0
        }, Invalid: ${
          result.invalidRecords ?? result.invalid ?? 0
        }, Duplicates: ${
          result.duplicateRecords ?? result.duplicate ?? 0
        }.`
      );

      await fetchImports();
      await openImport(importId);
    } catch (err) {
      console.error("Processing error:", err);
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  // =====================================
  // UPDATE REVIEW RECORD
  // =====================================

  const updateRecord = (recordIndex, field, value) => {
    setRecords((previousRecords) =>
      previousRecords.map((record, index) => {
        if (index !== recordIndex) return record;

        if (field.startsWith("salary.")) {
          const salaryField = field.split(".")[1];

          return {
            ...record,
            salary: {
              ...record.salary,
              [salaryField]: value,
            },
          };
        }

        return {
          ...record,
          [field]: value,
        };
      })
    );
  };

  // =====================================
  // SAVE REVIEW
  // =====================================

  const handleSaveReview = async () => {
    if (!selectedImport?._id) return;

    try {
      setSavingReview(true);
      setError("");
      setSuccess("");

      const reviewedRecords = records.map((record) => ({
        recordId: record._id,
        employeeCode: record.employeeCode,
        name: record.name,
        email: record.email,
        country: record.country,

        // Newly connected fields
        department: record.department || "",
        jobTitle: record.jobTitle || "",

        recipientEmail: record.recipientEmail,

        salary: {
          amount: record.salary?.amount,
          currency: record.salary?.currency,
          payFrequency: record.salary?.payFrequency,
        },

        action: record.action,
      }));

      await API.post(`/payroll/review/${selectedImport._id}`, {
        records: reviewedRecords,
      });

      setSuccess("Review changes saved successfully.");

      await openImport(selectedImport._id);
      await fetchImports();
    } catch (err) {
      console.error("Save review error:", err);
      setError(getErrorMessage(err));
    } finally {
      setSavingReview(false);
    }
  };

  // =====================================
  // OPEN CUSTOM APPROVAL MODAL
  // =====================================

  const handleApprove = () => {
    if (!selectedImport?._id) return;

    if (!periodStartDate || !periodEndDate) {
      setError("Please select both payroll period dates.");
      return;
    }

    if (new Date(periodEndDate) < new Date(periodStartDate)) {
      setError("Payroll end date cannot be before the start date.");
      return;
    }

    setError("");
    setShowConfirmation(true);
  };

  // =====================================
  // CONFIRM PAYROLL APPROVAL
  // =====================================

  const confirmApproval = async () => {
    if (!selectedImport?._id || approving) return;

    try {
      setShowConfirmation(false);
      setApproving(true);
      setError("");
      setSuccess("");

      const response = await API.post(
        `/payroll/approve/${selectedImport._id}`,
        {
          periodStartDate,
          periodEndDate,
          batchName: batchName.trim(),
        }
      );

      setSuccess(
        response.data?.message ||
          "Payroll import approved and payroll batch created successfully."
      );

      setSelectedImport(null);
      setRecords([]);

      setPeriodStartDate("");
      setPeriodEndDate("");
      setBatchName("");

      await fetchImports();
    } catch (err) {
      console.error("Payroll approval error:", err);
      setError(getErrorMessage(err));
    } finally {
      setApproving(false);
    }
  };

  // =====================================
  // CLOSE IMPORT DETAILS
  // =====================================

  const closeDetails = () => {
    setShowConfirmation(false);
    setSelectedImport(null);
    setRecords([]);

    setPeriodStartDate("");
    setPeriodEndDate("");
    setBatchName("");

    setError("");
    setSuccess("");
  };

  // =====================================
  // FILTER IMPORTS
  // =====================================

  const filteredImports = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return imports;

    return imports.filter((item) =>
      item.originalFileName?.toLowerCase().includes(query)
    );
  }, [imports, search]);

  const totalImports = imports.length;

  const pendingImports = imports.filter(
    (item) =>
      item.processingStatus === "uploaded" ||
      item.processingStatus === "needs_review"
  ).length;

  const approvedImports = imports.filter(
    (item) => item.processingStatus === "approved"
  ).length;

  // =====================================
  // FORMAT HELPERS
  // =====================================

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatFileSize = (size) => {
    if (!size) return "—";

    if (size < 1024) return `${size} B`;

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "approved":
        return "approved";
      case "needs_review":
        return "review";
      case "failed":
        return "failed";
      case "processing":
        return "processing";
      case "archived":
        return "archived";
      default:
        return "uploaded";
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return "Unknown";
    return status.replaceAll("_", " ");
  };

  // =====================================
  // UI
  // =====================================

  return (
    <div className="payroll-imports-page">

      {/* PAYROLL APPROVAL CONFIRMATION MODAL */}

      {showConfirmation && selectedImport && (
        <div
          className="payroll-imports-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !approving
            ) {
              setShowConfirmation(false);
            }
          }}
        >
          <div
            className="payroll-imports-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-confirm-title"
          >
            <div className="payroll-imports-modal-icon">✓</div>

            <span className="payroll-imports-modal-eyebrow">
              PAYROLL AUTHORIZATION
            </span>

            <h2 id="import-confirm-title">
              Confirm payroll approval?
            </h2>

            <p className="payroll-imports-modal-description">
              Please review the import details before approving
              and creating your payroll batch.
            </p>

            <div className="payroll-imports-modal-details">
              <div>
                <span>Import file</span>
                <strong>
                  {selectedImport.originalFileName || "Payroll Import"}
                </strong>
              </div>

              <div>
                <span>Employee records</span>
                <strong>{records.length}</strong>
              </div>

              <div>
                <span>Payroll batch</span>
                <strong>{batchName.trim() || "Payroll Batch"}</strong>
              </div>

              <div>
                <span>Payroll period</span>
                <strong>
                  {formatDate(periodStartDate)} –{" "}
                  {formatDate(periodEndDate)}
                </strong>
              </div>
            </div>

            <div className="payroll-imports-modal-warning">
              <strong>Important</strong>
              <p>
                Approving this import will create or update employee
                records and generate a payroll batch in your PayFlow
                workspace.
              </p>
            </div>

            <div className="payroll-imports-modal-actions">
              <button
                type="button"
                className="payroll-imports-secondary-button"
                onClick={() => setShowConfirmation(false)}
                disabled={approving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="payroll-imports-primary-button"
                onClick={confirmApproval}
                disabled={approving}
              >
                {approving
                  ? "Approving..."
                  : "Confirm & Approve →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE HEADER */}

      <div className="payroll-imports-header">
        <div>
          <div className="payroll-imports-breadcrumb">
            Workspace <span>/</span> Payroll Imports
          </div>

          <h1>Payroll Imports</h1>

          <p>
            Upload payroll spreadsheets, review employee records,
            and import approved data into your workspace.
          </p>
        </div>

        <button
          className="payroll-imports-refresh"
          type="button"
          onClick={fetchImports}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="payroll-imports-alert error">
          {error}
          <button type="button" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {success && (
        <div className="payroll-imports-alert success">
          {success}
          <button type="button" onClick={() => setSuccess("")}>
            ×
          </button>
        </div>
      )}

      {/* IMPORT LIST PAGE */}

      {!selectedImport ? (
        <>
          {/* SUMMARY CARDS */}

          <div className="payroll-imports-summary">
            <div className="payroll-imports-stat-card">
              <span className="payroll-imports-stat-icon purple">
                ▤
              </span>
              <div>
                <p>Total Imports</p>
                <h2>{totalImports}</h2>
              </div>
            </div>

            <div className="payroll-imports-stat-card">
              <span className="payroll-imports-stat-icon orange">
                ◷
              </span>
              <div>
                <p>Pending Imports</p>
                <h2>{pendingImports}</h2>
              </div>
            </div>

            <div className="payroll-imports-stat-card">
              <span className="payroll-imports-stat-icon green">
                ✓
              </span>
              <div>
                <p>Approved Imports</p>
                <h2>{approvedImports}</h2>
              </div>
            </div>
          </div>

          {/* UPLOAD SECTION */}

          <section className="payroll-imports-upload-card">
            <div className="payroll-imports-section-heading">
              <div>
                <h2>Upload Payroll File</h2>
                <p>
                  Import employee payroll information from an existing
                  spreadsheet.
                </p>
              </div>

              <span className="payroll-imports-upload-icon">↑</span>
            </div>

            <div className="payroll-imports-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileChange}
                hidden
              />

              <div className="payroll-imports-file-icon">▤</div>

              <h3>
                {selectedFile
                  ? selectedFile.name
                  : "Choose a payroll spreadsheet"}
              </h3>

              <p>
                {selectedFile
                  ? `${formatFileSize(selectedFile.size)} · Ready to upload`
                  : "Supported formats: CSV, XLS, XLSX"}
              </p>

              <div className="payroll-imports-upload-actions">
                <button
                  type="button"
                  className="payroll-imports-secondary-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </button>

                <button
                  type="button"
                  className="payroll-imports-primary-button"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </div>

            <p className="payroll-imports-upload-note">
              <strong>Note:</strong> Uploaded files must contain
              employee information such as employee code, name,
              email, salary amount, and currency. You can review
              extracted records before approval.
            </p>
          </section>

          {/* IMPORT HISTORY */}

          <section className="payroll-imports-history-card">
            <div className="payroll-imports-history-header">
              <div>
                <h2>Import History</h2>
                <p>
                  View and manage your uploaded payroll files.
                </p>
              </div>

              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="payroll-imports-search"
              />
            </div>

            {loading ? (
              <div className="payroll-imports-state">
                Loading payroll imports...
              </div>
            ) : filteredImports.length === 0 ? (
              <div className="payroll-imports-state">
                <div className="payroll-imports-empty-icon">▤</div>

                <h3>
                  {search
                    ? "No matching imports"
                    : "No payroll imports yet"}
                </h3>

                <p>
                  {search
                    ? "Try searching with a different file name."
                    : "Upload your first payroll spreadsheet to get started."}
                </p>
              </div>
            ) : (
              <div className="payroll-imports-table-wrapper">
                <table className="payroll-imports-table">
                  <thead>
                    <tr>
                      <th>FILE NAME</th>
                      <th>FILE TYPE</th>
                      <th>FILE SIZE</th>
                      <th>UPLOAD DATE</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredImports.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <div className="payroll-imports-file-name">
                            <span className="payroll-imports-small-file-icon">
                              ▤
                            </span>

                            <strong>
                              {item.originalFileName || "Unnamed file"}
                            </strong>
                          </div>
                        </td>

                        <td>
                          {item.fileType?.toUpperCase() || "—"}
                        </td>

                        <td>{formatFileSize(item.fileSize)}</td>

                        <td>{formatDate(item.createdAt)}</td>

                        <td>
                          <span
                            className={`payroll-imports-status ${getStatusClass(
                              item.processingStatus
                            )}`}
                          >
                            {getStatusLabel(item.processingStatus)}
                          </span>
                        </td>

                        <td>
                          <div className="payroll-imports-row-actions">
                            {item.processingStatus === "uploaded" && (
                              <button
                                type="button"
                                className="payroll-imports-action-button process"
                                disabled={processing}
                                onClick={() => handleProcess(item._id)}
                              >
                                {processing ? "Processing..." : "Process"}
                              </button>
                            )}

                            {item.processingStatus === "needs_review" && (
                              <button
                                type="button"
                                className="payroll-imports-action-button review"
                                onClick={() => openImport(item._id)}
                              >
                                Review
                              </button>
                            )}

                            {item.processingStatus !== "uploaded" &&
                              item.processingStatus !== "needs_review" && (
                                <button
                                  type="button"
                                  className="payroll-imports-action-button view"
                                  onClick={() => openImport(item._id)}
                                >
                                  View
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
          </section>
        </>
      ) : (
        /* IMPORT REVIEW DETAILS */

        <section className="payroll-imports-details-card">
          <div className="payroll-imports-details-header">
            <div>
              <button
                type="button"
                className="payroll-imports-back-button"
                onClick={closeDetails}
              >
                ← Back to Imports
              </button>

              <h2>{selectedImport.originalFileName}</h2>

              <p>
                Uploaded on {formatDate(selectedImport.createdAt)} ·{" "}
                {selectedImport.fileType?.toUpperCase()}
              </p>
            </div>

            <span
              className={`payroll-imports-status ${getStatusClass(
                selectedImport.processingStatus
              )}`}
            >
              {getStatusLabel(selectedImport.processingStatus)}
            </span>
          </div>

          {/* RECORD SUMMARY */}

          <div className="payroll-imports-record-summary">
            <div>
              <span>Total Records</span>
              <strong>{records.length}</strong>
            </div>

            <div>
              <span>Valid Records</span>
              <strong>
                {
                  records.filter(
                    (record) => record.rowStatus === "valid"
                  ).length
                }
              </strong>
            </div>

            <div>
              <span>Invalid Records</span>
              <strong>
                {
                  records.filter(
                    (record) => record.rowStatus === "invalid"
                  ).length
                }
              </strong>
            </div>

            <div>
              <span>Duplicate Records</span>
              <strong>
                {
                  records.filter(
                    (record) => record.rowStatus === "duplicate"
                  ).length
                }
              </strong>
            </div>
          </div>

          {/* EXTRACTED RECORDS */}

          {records.length === 0 ? (
            <div className="payroll-imports-state">
              <h3>No extracted records available</h3>
              <p>
                This import does not currently contain extracted
                employee records.
              </p>
            </div>
          ) : (
            <>
              <div className="payroll-imports-review-heading">
                <div>
                  <h3>Extracted Employee Records</h3>
                  <p>
                    Verify the information and choose what should
                    happen to each employee record.
                  </p>
                </div>
              </div>

              {/* EMPLOYEE RECORD CARDS */}

              <div className="payroll-imports-records-list">
                {records.map((record, index) => (
                  <div
                    className="payroll-imports-record-card"
                    key={record._id || index}
                  >
                    <div className="payroll-imports-record-top">
                      <div>
                        <strong>
                          Row {record.rowNumber || index + 1}
                        </strong>

                        <span
                          className={`payroll-imports-status ${getStatusClass(
                            record.rowStatus
                          )}`}
                        >
                          {getStatusLabel(record.rowStatus)}
                        </span>
                      </div>

                      <label className="payroll-imports-action-label">
                        Import action

                        <select
                          value={record.action || "create"}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "action",
                              event.target.value
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        >
                          <option value="create">Create employee</option>
                          <option value="update">Update employee</option>
                          <option value="skip">Skip record</option>
                        </select>
                      </label>
                    </div>

                    {/* VALIDATION ERRORS */}

                    {record.validationErrors?.length > 0 && (
                      <div className="payroll-imports-validation-errors">
                        {record.validationErrors.map(
                          (message, errorIndex) => (
                            <p key={errorIndex}>• {message}</p>
                          )
                        )}
                      </div>
                    )}

                    {/* EMPLOYEE FIELDS */}

                    <div className="payroll-imports-record-fields">
                      <label>
                        Employee Code
                        <input
                          value={record.employeeCode || ""}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "employeeCode",
                              event.target.value
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        />
                      </label>

                      <label>
                        Employee Name
                        <input
                          value={record.name || ""}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "name",
                              event.target.value
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        />
                      </label>

                      <label>
                        Email
                        <input
                          type="email"
                          value={record.email || ""}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "email",
                              event.target.value
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        />
                      </label>

                      <label>
                        Country
                        <input
                          value={record.country || ""}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "country",
                              event.target.value
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        />
                      </label>

                      <label>
                        Department
                        <input
                          type="text"
                          placeholder="e.g. Engineering"
                          value={record.department || ""}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "department",
                              event.target.value
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        />
                      </label>

                      <label>
                        Job Title
                        <input
                          type="text"
                          placeholder="e.g. Software Engineer"
                          value={record.jobTitle || ""}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "jobTitle",
                              event.target.value
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        />
                      </label>

                      <label>
                        Salary Amount
                        <input
                          type="number"
                          min="0"
                          value={record.salary?.amount ?? ""}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "salary.amount",
                              event.target.value
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        />
                      </label>

                      <label>
                        Currency
                        <input
                          maxLength={3}
                          value={record.salary?.currency || ""}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "salary.currency",
                              event.target.value.toUpperCase()
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        />
                      </label>

                      <label>
                        Pay Frequency
                        <select
                          value={record.salary?.payFrequency || "monthly"}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "salary.payFrequency",
                              event.target.value
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        >
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Biweekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </label>

                      <label>
                        Recipient Email
                        <input
                          type="email"
                          value={record.recipientEmail || ""}
                          onChange={(event) =>
                            updateRecord(
                              index,
                              "recipientEmail",
                              event.target.value
                            )
                          }
                          disabled={
                            selectedImport.processingStatus !== "needs_review"
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* PAYROLL BATCH DETAILS */}

              {selectedImport.processingStatus === "needs_review" && (
                <>
                  <div className="payroll-imports-review-heading">
                    <div>
                      <h3>Payroll Batch Details</h3>
                      <p>
                        Set the payroll period before creating
                        your payroll batch.
                      </p>
                    </div>
                  </div>

                  <div className="payroll-imports-record-fields">
                    <label>
                      Batch Name (Optional)
                      <input
                        type="text"
                        placeholder="e.g. November 2026 Payroll"
                        value={batchName}
                        onChange={(event) =>
                          setBatchName(event.target.value)
                        }
                      />
                    </label>

                    <label>
                      Payroll Period Start Date
                      <input
                        type="date"
                        value={periodStartDate}
                        onChange={(event) =>
                          setPeriodStartDate(event.target.value)
                        }
                        required
                      />
                    </label>

                    <label>
                      Payroll Period End Date
                      <input
                        type="date"
                        value={periodEndDate}
                        min={periodStartDate || undefined}
                        onChange={(event) =>
                          setPeriodEndDate(event.target.value)
                        }
                        required
                      />
                    </label>
                  </div>

                  {/* REVIEW ACTIONS */}

                  <div className="payroll-imports-review-actions">
                    <button
                      type="button"
                      className="payroll-imports-secondary-button"
                      onClick={handleSaveReview}
                      disabled={savingReview || approving}
                    >
                      {savingReview ? "Saving..." : "Save Review"}
                    </button>

                    <button
                      type="button"
                      className="payroll-imports-primary-button"
                      onClick={handleApprove}
                      disabled={savingReview || approving}
                    >
                      {approving
                        ? "Approving..."
                        : "Approve & Create Batch"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default PayrollImports;
