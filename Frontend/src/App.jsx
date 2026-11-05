
import { Routes, Route } from "react-router-dom";

import Splash from "./Pages/index.jsx";
import LandingPage from "./Pages/LandingPage.jsx";
import Signin from "./Pages/Signin.jsx";
import SignUp from "./Pages/SignUp.jsx";
import Welcome from "./Pages/Welcome.jsx";
import Dashboard from "./Pages/Dashboard.jsx";

import useGetUser from "./hooks/useGetUser.js";

function App() {
  useGetUser();

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/home" element={<LandingPage />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
