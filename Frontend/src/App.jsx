
import {Navigate, Routes, Route } from "react-router-dom";

import Splash from "./Pages/index.jsx";
import LandingPage from "./Pages/LandingPage.jsx";
import Signin from "./Pages/Signin.jsx";
import SignUp from "./Pages/SignUp.jsx";
import Welcome from "./Pages/Welcome.jsx";
import Dashboard from "./Pages/Dashboard.jsx";

import useGetUser from "./hooks/useGetUser.js";
import { useSelector } from "react-redux";
import useGetCompany from "./hooks/useGetCompany.js";

function App() {
  useGetUser();
  useGetCompany()

  const {userData} = useSelector((state) => state.user);



  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/home" element={ userData ? <Navigate to={"/dashboard"}  replace/> : <LandingPage />} />
      <Route path="/signin" element={ userData ? <Navigate to={"/dashboard"}  replace/> : <Signin />} />
      <Route path="/signup" element={ userData ? <Navigate to={"/dashboard"}  replace/> : <SignUp />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/dashboard" element={userData ?  <Dashboard />  : <Navigate to={"/home"} replace /> } />
    </Routes>
  );
}

export default App;
