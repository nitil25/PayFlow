
import { Routes, Route } from "react-router-dom";

import Splash from "./Pages/index.jsx";
import LandingPage from "./Pages/LandingPage.jsx";
import Signin from "./Pages/Signin.jsx";
import SignUp from "./Pages/SignUp.jsx";
import Welcome from "./Pages/Welcome.jsx";

import Dashboard from "./Pages/Dashboard.jsx";
import Employees from "./Pages/Employees.jsx";
import CreateEmployee from "./Pages/CreateEmployee.jsx";
import PayrollImports from "./Pages/PayrollImports.jsx";
import PayrollBatches from "./Pages/PayrollBatches.jsx";
import PayrollPayments from "./Pages/PayrollPayments.jsx";
import WorkspaceLayout from "./Components/WorkspaceLayout.jsx";

import useGetUser from "./hooks/useGetUser.js";

function App() {
  useGetUser();

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Splash />} />
      <Route path="/home" element={<LandingPage />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/welcome" element={<Welcome />} />

      {/* Workspace Pages */}
      <Route element={<WorkspaceLayout />}>
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/create" element={<CreateEmployee />} />
        <Route path="/payroll-imports" element={<PayrollImports />} />
        <Route path="/payroll-batches" element={<PayrollBatches />} />
        <Route path="/payroll-payments" element={<PayrollPayments />} />
      </Route>

      {/* Dashboard has its own existing sidebar */}
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
