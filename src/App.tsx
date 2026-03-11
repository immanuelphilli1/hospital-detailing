import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { PatientDetailsPage } from './pages/PatientDetailsPage';
import { RegisterPatientPage } from './pages/RegisterPatientPage';
import { ExportPage } from './pages/ExportPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="patient/:id" element={<PatientDetailsPage />} />
          <Route path="register" element={<RegisterPatientPage />} />
          <Route path="export" element={<ExportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
