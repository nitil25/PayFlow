
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import API from "../services/api";
import PayFlowLogo from "../assets/PayFlow.png";
import "../CSS Styling/Signup.css";
import { useDispatch } from "react-redux";
import { setUserData } from "../Redux/UserSlice";

function SignUp() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (password.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      // Send signup request to backend
      const response = await API.post("/auth/sign-up", {
        name,
        email,
        password,
      });

      dispatch(setUserData(response.data.user));

      // Navigate to Welcome page
      navigate("/welcome", {
        state: {
          name: response.data.user.name,
          source: "signup",
        },
      });

    } catch (error) {
      console.error(
        "Signup error:",
        error.response?.data || error
      );

      alert(
        error.response?.data?.message ||
        "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">

      <Link to="/home" className="signup-logo">
        <img src={PayFlowLogo} alt="PayFlow" />
      </Link>

      <div className="signup-card">
        <div className="signup-icon">✦</div>

        <span className="signup-eyebrow">
          YOUR JOURNEY STARTS HERE
        </span>

        <h1>Let's get you started.</h1>

        <p>
          Create your PayFlow account and discover a simpler experience.
        </p>

        <form onSubmit={handleSubmit}>

          <label htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label htmlFor="signup-email">Email address</label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="signup-submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account ↗"}
          </button>

        </form>

        <p className="signup-switch">
          Already have an account?
          <Link to="/signin"> Sign in</Link>
        </p>

        <p className="signup-terms">
          By continuing, you agree to the terms and privacy policy
          configured for your PayFlow application.
        </p>

      </div>
    </div>
  );
}

export default SignUp;
