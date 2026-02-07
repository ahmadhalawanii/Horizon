import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/Overview";
import Console from "./pages/Console";
import Simulator from "./pages/Simulator";
import Actions from "./pages/Actions";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/overview" element={<Overview />} />
        <Route path="/console" element={<Console />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="/actions" element={<Actions />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  );
}
