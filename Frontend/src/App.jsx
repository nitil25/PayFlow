import { Routes, Route } from "react-router-dom";
import Splash from "./Pages/index.jsx";
import LandingPage from "./Pages/LandingPage.jsx";
import Signin from "./Pages/Signin.jsx";
import SignUp from "./Pages/SignUp.jsx";
import Welcome from "./Pages/Welcome.jsx";
import useGetUser from "./hooks/useGetUser.js";
import { useSelector } from "react-redux";

function App() {

  useGetUser()
  const {userData} = useSelector((state) => state.user);

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/home" element={<LandingPage />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/welcome" element={ <Welcome /> } />
    </Routes>
  );
}

export default App;
