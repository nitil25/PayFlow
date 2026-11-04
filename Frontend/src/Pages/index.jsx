import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PayFlowLogo from "../assets/PayFlow.png";
import "../CSS Styling/Splash.css";

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/home", { replace: true });
    }, 4500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="splash-screen">

      <div className="splash-glow splash-glow-one"></div>
      <div className="splash-glow splash-glow-two"></div>

      <div className="splash-content">

        <div className="splash-logo-box">
          <img
            src={PayFlowLogo}
            alt="PayFlow"
            className="splash-logo"
          />
        </div>

        <h1 className="splash-heading">
          Money moves. Life flows.
        </h1>

        <p className="splash-description">
          Your money, moving smarter.
        </p>

        <div className="splash-progress">
          <div className="splash-progress-fill"></div>
        </div>

        <p className="splash-loading">
          Preparing your PayFlow experience...
        </p>

      </div>

      <div className="splash-footer">
        A smarter way to stay in control.
      </div>

    </main>
  );
}

export default Splash;
