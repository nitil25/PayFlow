import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import PayFlowLogo from "../assets/PayFlow.png";
import "../CSS Styling/Signin.css";
import API from "../services/api";
import { useDispatch } from "react-redux";
import { setUserData } from "../Redux/UserSlice";

function Signin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);

      const response = await API.post("/auth/sign-in", {
        email,
        password,
      });

      dispatch(setUserData(response.data.user))
      
      navigate("/welcome", {
        state: {
          name: response.data.user.name,
          source: "signin",
        },
      });

      // Redirect after successful authentication
      alert("Authentication successful! Dashboard coming soon.");
    } catch (error) {
      console.error("Login error:", error.response?.data || error);

      alert(
        error.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-decoration auth-decoration-one"></div>
      <div className="auth-decoration auth-decoration-two"></div>

      <Link to="/home" className="auth-logo">
        <img src={PayFlowLogo} alt="PayFlow" />
      </Link>

      <div className="auth-card">
        <div className="auth-icon">↗</div>

        <span className="auth-eyebrow">WELCOME BACK</span>
        <h1>Good to see you.</h1>

        <p className="auth-subtitle">Sign in and get back to your flow.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>

          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="login-password">Password</label>

          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="auth-extra">
            <span>Keep your account secure.</span>
            <a href="mailto:support@payflow.example?subject=Password%20help">
              Need help?
            </a>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
            <span>↗</span>
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <p className="auth-switch">
          New to PayFlow?
          <Link to="/signup"> Create an account</Link>
        </p>
      </div>

      <button
        type="button"
        className="auth-back"
        onClick={() => navigate("/home")}
      >
        ← Back to home
      </button>
    </div>
  );
}

export default Signin;
