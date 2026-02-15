import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/Overview";
import Twin from "./pages/Twin";
import Simulator from "./pages/Simulator";
import Actions from "./pages/Actions";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/overview" element={<Overview />} />
        <Route path="/twin" element={<Twin />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="/actions" element={<Actions />} />
        {/* Legacy redirects */}
        <Route path="/console" element={<Navigate to="/twin" replace />} />
        <Route path="/scan" element={<Navigate to="/twin" replace />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  );
}
