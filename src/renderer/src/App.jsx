import { Route, Routes } from "react-router";
import Home from "./pages/Home";
import AppBarLayout from "./pages/layouts/AppBarLayout";
import StartupGuardLayout from "./pages/layouts/StartupGuardLayout";
import Surveys from "./pages/Surveys";
import Analysis from "./pages/Analysis";
import ConfigureChart from "./pages/ConfigureChart";
import Events from "./pages/Events";
import Clients from "./pages/Clients";
import ViewSurveyData from "./pages/ViewSurveyData";
import ExcelImportPage from "./pages/ExcelImportPage";
import GoogleFormsImportPage from "./pages/GoogleFormsImportPage";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import { AuthProvider, useAuth } from "./common/AuthContext";

function AppRoutes() {
  const { authVersion } = useAuth();
  return (
    <Routes>
      <Route element={<AppBarLayout />}>
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
          <Route element={<StartupGuardLayout key={authVersion} />}>
          <Route path="/" element={<Home />} />
          <Route path="surveys">
            <Route index element={<Surveys />} />
            <Route path="data/:id" element={<ViewSurveyData />} />
            <Route path="import/excel" element={<ExcelImportPage />} />
            <Route path="import/google-forms" element={<GoogleFormsImportPage />} />
          </Route>
          <Route path="analysis">
            <Route index element={<Analysis />} />
            <Route path="configure-chart" element={<ConfigureChart />} />
            <Route path="configure-chart/:chartId" element={<ConfigureChart />} />
          </Route>
          <Route path="events" element={<Events />} />
          <Route path="clients" element={<Clients />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;