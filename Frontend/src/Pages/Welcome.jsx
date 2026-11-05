
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PayFlowLogo from "../assets/PayFlow.png";
import "../CSS Styling/Welcome.css";
import { useSelector } from "react-redux";

function Welcome() {
  const location = useLocation();
  const navigate = useNavigate();

  const { userData } = useSelector((state) => state.user);

  const name = location.state?.name || userData?.name || "there";
  const source = location.state?.source || "signin";

  const [progress, setProgress] = useState(0);

  // Welcome progress animation
  useEffect(() => {
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((previous) => {
        if (previous >= 100) {
          clearInterval(interval);
          return 100;
        }

        return Math.min(previous + 2, 100);
      });
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // Navigate to Dashboard when progress reaches 100%
  useEffect(() => {
    if (progress !== 100) return;

    const timeout = setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 1200);

    return () => clearTimeout(timeout);
  }, [progress, navigate]);

  return (
    <div className="welcome-page">

      <div className="welcome-glow welcome-glow-one"></div>
      <div className="welcome-glow welcome-glow-two"></div>

      <div className="welcome-content">

        <img
          src={PayFlowLogo}
          alt="PayFlow Logo"
          className="welcome-logo"
        />

        <span className="welcome-eyebrow">
          {source === "signUp"
            ? "ACCOUNT CREATED SUCCESSFULLY"
            : "LOGIN SUCCESSFUL"}
        </span>

        <h1>
          Welcome to <span>PayFlow</span>
        </h1>

        <h2>{name}!</h2>

        <p className="welcome-description">
          We're glad to have you here.
          <br />
          Your workspace is getting ready.
        </p>

        <div className="welcome-loader">

          <div className="welcome-loader-info">
            <span>
              {progress === 100
                ? "Your workspace is ready!"
                : "Preparing your experience..."}
            </span>

            <span>{progress}%</span>
          </div>

          <div className="welcome-progress-track">
            <div
              className="welcome-progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

        </div>

        {progress === 100 && (
          <p className="welcome-ready">
            You're all set. Your PayFlow journey starts here!
          </p>
        )}

      </div>

      <div className="welcome-footer">
        Making payments simpler, one flow at a time.
      </div>

    </div>
  );
}

export default Welcome;
