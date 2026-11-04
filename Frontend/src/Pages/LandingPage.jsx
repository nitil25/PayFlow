
import { Link } from "react-router-dom";
import PayFlowLogo from "../assets/PayFlow.png";
import "../CSS Styling/LandingPage.css";

function ExcelPreview() {
  const rows = [
    ["Aarav Sharma", "₹45,000", "05 Nov", "Scheduled"],
    ["Riya Mehta", "₹38,000", "05 Nov", "Paid"],
    ["Kabir Shah", "₹52,000", "07 Nov", "Pending"],
    ["Anaya Patel", "₹41,000", "10 Nov", "Scheduled"]
  ];

  return (
    <div className="mock-window product-window">
      <div className="mock-topbar">
        <div className="mock-dots"><i></i><i></i><i></i></div>
        <span>PayFlow / Import Payments</span>
        <div className="mock-avatar">A</div>
      </div>

      <div className="product-preview-body">
        <div className="preview-heading">
          <div>
            <small>PAYMENT IMPORT</small>
            <h3>Upload your spreadsheet</h3>
          </div>
          <span className="preview-file-icon">XLS</span>
        </div>

        <div className="excel-upload-box">
          <span className="excel-icon">▦</span>
          <b>employee_payments.xlsx</b>
          <small>Spreadsheet successfully imported</small>
          <span className="excel-progress">
            <i></i>
          </span>
          <small>4 employee records detected</small>
        </div>

        <div className="excel-table">
          <div className="excel-table-row excel-table-head">
            <span>Employee</span>
            <span>Amount</span>
            <span>Date</span>
          </div>
          {rows.slice(0, 3).map((r, i) => (
            <div className="excel-table-row" key={i}>
              <span>{r[0]}</span>
              <span>{r[1]}</span>
              <span>{r[2]}</span>
            </div>
          ))}
        </div>

        <div className="import-success">
          ✓ Records ready for review
        </div>
      </div>
    </div>
  );
}

function SchedulePreview() {
  const employees = [
    ["AS", "Aarav Sharma", "₹45,000", "05 Nov", "paid"],
    ["RM", "Riya Mehta", "₹38,000", "05 Nov", "scheduled"],
    ["KS", "Kabir Shah", "₹52,000", "07 Nov", "pending"],
    ["AP", "Anaya Patel", "₹41,000", "10 Nov", "paid"]
  ];

  return (
    <div className="history-window schedule-window">
      <div className="history-heading">
        <div>
          <small>EMPLOYEE MANAGEMENT</small>
          <h3>Payment schedules</h3>
        </div>
        <span>November 2026⌄</span>
      </div>

      <div className="schedule-summary">
        <div>
          <small>Total employees</small>
          <b>124</b>
        </div>
        <div>
          <small>Scheduled this month</small>
          <b>₹18.5L</b>
        </div>
      </div>

      {employees.map((emp, i) => (
        <div className="history-row" key={i}>
          <div className="employee-avatar">{emp[0]}</div>
          <div className="history-description">
            <b>{emp[1]}</b>
            <small>{emp[3]}</small>
          </div>
          <div className="employee-payment">
            <b>{emp[2]}</b>
            <span className={`payment-status ${emp[4]}`}>
              {emp[4]}
            </span>
          </div>
        </div>
      ))}

      <div className="history-footer">
        Manage employee payment records →
      </div>
    </div>
  );
}

function StatusPreview() {
  return (
    <div className="analytics-window status-window">
      <div className="analytics-heading">
        <div>
          <small>PAYMENT MONITORING</small>
          <h3>Disbursement overview</h3>
        </div>
        <span>Today⌄</span>
      </div>

      <div className="status-total">
        <small>Total scheduled amount</small>
        <h2>₹8,45,000</h2>
        <span>Illustrative dashboard figures</span>
      </div>

      <div className="status-cards">
        <div>
          <span className="status-dot paid-dot"></span>
          <small>Paid</small>
          <b>82</b>
        </div>
        <div>
          <span className="status-dot scheduled-dot"></span>
          <small>Scheduled</small>
          <b>28</b>
        </div>
        <div>
          <span className="status-dot failed-dot"></span>
          <small>Failed</small>
          <b>3</b>
        </div>
      </div>

      <div className="status-progress">
        <div></div>
      </div>

      <div className="status-legend">
        <span>82 Paid</span>
        <span>28 Scheduled</span>
        <span>3 Failed</span>
      </div>

      <div className="status-alert">
        <span>!</span>
        <div>
          <b>3 payments need attention</b>
          <small>Review failed transactions</small>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  const bars = [35, 55, 43, 78, 58, 90, 67, 48, 82, 60, 95, 72];

  return (
    <div className="analytics-window">
      <div className="analytics-heading">
        <div>
          <small>BUSINESS ANALYTICS</small>
          <h3>Payment insights</h3>
        </div>
        <span>Monthly⌄</span>
      </div>

      <div className="analytics-total">
        <small>Total disbursements</small>
        <h2>₹24,85,000</h2>
        <span>Illustrative monthly data</span>
      </div>

      <div className="chart-area">
        {bars.map((h, i) => (
          <div className="chart-column" key={i}>
            <div style={{ height: `${h}%` }}></div>
          </div>
        ))}
      </div>

      <div className="chart-labels">
        <span>Jan</span>
        <span>Mar</span>
        <span>May</span>
        <span>Jul</span>
        <span>Sep</span>
        <span>Nov</span>
      </div>

      <div className="analytics-legend">
        <span>● Employee payments</span>
        <span>● Other disbursements</span>
      </div>
    </div>
  );
}

function OwnerPreview() {
  return (
    <div className="transfer-window owner-window">
      <div className="transfer-header">
        <span>PAYFLOW / ADMIN</span>
        <span>•••</span>
      </div>

      <div className="transfer-inner">
        <div className="transfer-icon">⚙</div>
        <small>OWNER CONTROL PANEL</small>
        <h3>Manage your workflow</h3>
        <p>Everything your business needs, in one place.</p>

        <div className="owner-options">
          <div><span>✎</span><b>Edit employee details</b><span>→</span></div>
          <div><span>◷</span><b>Modify payment schedule</b><span>→</span></div>
          <div><span>✓</span><b>Update payment status</b><span>→</span></div>
          <div><span>＋</span><b>Add new employees</b><span>→</span></div>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <main className="payflow-landing">

      {/* NAVBAR */}

      <nav className="landing-nav">
        <Link to="/home" className="landing-brand">
          <img src={PayFlowLogo} alt="PayFlow" />
        </Link>

        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#workflow">How it works</a>
          <a href="#analytics">Analytics</a>
        </div>

        <div className="landing-nav-actions">
          <Link to="/signin" className="nav-login">Sign in</Link>
          <Link to="/signup" className="nav-signup">Get started ↗</Link>
        </div>
      </nav>

      {/* HERO */}

      <section className="payflow-hero">
        <div className="hero-decoration decoration-one">₹</div>
        <div className="hero-decoration decoration-two">↗</div>
        <div className="hero-decoration decoration-three">+</div>

        <div className="hero-copy">
          <span className="hero-eyebrow">
            ✦ SMARTER EMPLOYEE PAYMENT MANAGEMENT
          </span>

          <h1>
            Employee payments.
            <br />
            Finally in <span>sync.</span>
          </h1>

          <p>
            Schedule employee payments, manage disbursements
            and monitor every transaction from one intelligent
            workspace. From spreadsheets to scheduled payments,
            PayFlow keeps your business moving.
          </p>

          <div className="hero-actions">
            <Link to="/signup" className="hero-primary">
              Get started <span>↗</span>
            </Link>

            <Link to="/signin" className="hero-secondary">
              Sign in →
            </Link>
          </div>

          <div className="hero-note">
            ✦ One workspace. Every employee. Every payment.
          </div>
        </div>

        <div className="hero-dashboard">
          <SchedulePreview />

          <div className="hero-floating-tag">
            <span>✓</span>
            <div>
              <b>Payment scheduled</b>
              <small>Ready for processing</small>
            </div>
          </div>

          <div className="hero-floating-bottom">
            ✦ Your payments, organized.
          </div>
        </div>
      </section>

      {/* INTRODUCTION */}

      <section className="landing-intro" id="features">
        <span className="section-eyebrow">MEET PAYFLOW</span>

        <h2>
          Payroll management,
          <br />
          <span>without the spreadsheet chaos.</span>
        </h2>

        <p>
          Stop juggling multiple spreadsheets, payment dates
          and employee records. PayFlow brings your employee
          payment schedules, tracking and business analytics
          together in one organized platform.
        </p>
      </section>

      {/* SECTION 1 */}

      <section className="showcase-section" id="workflow">
        <div className="showcase-copy">
          <span className="section-eyebrow">
            01 / SMART SPREADSHEET IMPORT
          </span>

          <h2>
            Already have a spreadsheet?
            <span> You're halfway there.</span>
          </h2>

          <p>
            Upload your existing Excel payment sheets.
            PayFlow reads employee records, payment amounts
            and due dates, helping you organize them into
            a structured payment schedule. Review the
            imported information before confirming it.
          </p>

          <Link to="/signup" className="showcase-link">
            Start managing payments ↗
          </Link>
        </div>

        <div className="showcase-visual">
          <ExcelPreview />
        </div>
      </section>

      {/* SECTION 2 */}

      <section className="showcase-section reverse-showcase">
        <div className="showcase-visual">
          <SchedulePreview />
        </div>

        <div className="showcase-copy">
          <span className="section-eyebrow">
            02 / EMPLOYEE MANAGEMENT
          </span>

          <h2>
            Every employee.
            <span> Every schedule.</span>
          </h2>

          <p>
            Maintain employee payment details, assign
            payment dates, edit records and manage
            individual employee schedules. Keep all
            your workforce payment information accessible
            from one dashboard.
          </p>

          <Link to="/signup" className="showcase-link">
            Explore employee management ↗
          </Link>
        </div>
      </section>

      {/* SECTION 3 */}

      <section className="showcase-section">
        <div className="showcase-copy">
          <span className="section-eyebrow">
            03 / PAYMENT TRACKING
          </span>

          <h2>
            Know exactly
            <span> what's happening.</span>
          </h2>

          <p>
            Monitor which payments are completed,
            scheduled, pending or failed. Update statuses,
            identify payment issues and keep track of
            upcoming disbursements without losing sight
            of important details.
          </p>

          <Link to="/signup" className="showcase-link">
            Take control of payments ↗
          </Link>
        </div>

        <div className="showcase-visual">
          <StatusPreview />
        </div>
      </section>

      {/* SECTION 4 */}

      <section className="showcase-section reverse-showcase" id="analytics">
        <div className="showcase-visual">
          <AnalyticsPreview />
        </div>

        <div className="showcase-copy">
          <span className="section-eyebrow">
            04 / BUSINESS ANALYTICS
          </span>

          <h2>
            Numbers that
            <span> actually make sense.</span>
          </h2>

          <p>
            Understand your company's payment activity
            with visual analytics. Explore total
            disbursements, monthly expenditure, upcoming
            payments, employee-wise summaries and
            historical payment trends.
          </p>

          <Link to="/signup" className="showcase-link">
            Explore business insights ↗
          </Link>
        </div>
      </section>

      {/* OWNER CONTROL */}

      <section className="showcase-section">
        <div className="showcase-copy">
          <span className="section-eyebrow">
            05 / COMPLETE OWNER CONTROL
          </span>

          <h2>
            Your business.
            <span> Your decisions.</span>
          </h2>

          <p>
            Give business owners a centralized space
            to add employees, edit payment information,
            modify schedules and review payment statuses.
            Keep your payment workflow organized and
            under your control.
          </p>

          <Link to="/signup" className="showcase-link">
            Get started with PayFlow ↗
          </Link>
        </div>

        <div className="showcase-visual">
          <OwnerPreview />
        </div>
      </section>

      {/* SECURITY / TRUST */}

      <section className="landing-security" id="security">
        <div className="security-art">
          <div className="security-orbit">
            <div className="security-shield">✓</div>
          </div>
          <div className="security-bubble">
            Your business. Your control.
          </div>
        </div>

        <div className="security-copy">
          <span className="section-eyebrow">
            DESIGNED FOR BUSINESS WORKFLOWS
          </span>

          <h2>
            More clarity.
            <span> Less manual work.</span>
          </h2>

          <p>
            Bring employee records, payment schedules
            and financial reporting into one centralized
            workspace. Make payment management easier
            to review, organize and monitor.
          </p>

          <Link to="/signup" className="showcase-link">
            Join PayFlow ↗
          </Link>
        </div>
      </section>

      {/* FINAL CTA */}

      <section className="landing-cta">
        <div className="cta-orb">P</div>

        <span>SIMPLIFY YOUR PAYMENT WORKFLOW</span>

        <h2>
          Ready to put your payments
          <span> in motion?</span>
        </h2>

        <p>
          Bring your employee payment management
          into one organized workspace.
        </p>

        <Link to="/signup" className="cta-main-button">
          Create your account ↗
        </Link>

        <div className="cta-login">
          Already have an account?
          <Link to="/signin"> Sign in</Link>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="landing-footer">
        <div className="footer-top">
          <div>
            <img src={PayFlowLogo} alt="PayFlow" />
            <p>Employee payments. Finally in sync.</p>
          </div>

          <div className="footer-navigation">
            <a href="#features">Features</a>
            <a href="#workflow">How it works</a>
            <a href="#analytics">Analytics</a>
            <Link to="/signin">Sign in</Link>
            <Link to="/signup">Sign up</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 PayFlow. All rights reserved.</span>
          <span>Built for smarter business payments.</span>
        </div>
      </footer>

    </main>
  );
}

export default LandingPage;
