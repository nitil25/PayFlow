
import { Routes, Route } from "react-router-dom";

import Splash from "./Pages/index.jsx";
import LandingPage from "./Pages/LandingPage.jsx";
import Signin from "./Pages/Signin.jsx";
import SignUp from "./Pages/SignUp.jsx";
import Welcome from "./Pages/Welcome.jsx";


export const ServerUrl = "http://localhost:8000";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/home" element={<LandingPage />} />
      <Route path="/login" element={<Signin />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/welcome" element={<Welcome />} />
    </Routes>
  );
}

export default App;
