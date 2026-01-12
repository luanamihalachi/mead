import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import CountryDetails from "./pages/CountryDetails.jsx";
import DiseaseDetails from "./pages/DiseaseDetails.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/country/:iso2" element={<CountryDetails />} />
      <Route path="/disease/:key" element={<DiseaseDetails />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
