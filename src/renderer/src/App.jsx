import { Route, Routes } from "react-router";
import Home from "./pages/Home";
import GoogleAuthLayout from "./pages/layouts/GoogleAuthLayout";
import AppBarLayout from "./pages/layouts/AppBarLayout";
import Surveys from "./pages/Surveys";
import Analysis from "./pages/Analysis";
import ConfigureChart from "./pages/ConfigureChart";
import Events from "./pages/Events";
import ViewSurveyData from "./pages/ViewSurveyData";
import ExcelImportPage from "./pages/ExcelImportPage";
import GoogleFormsImportPage from "./pages/GoogleFormsImportPage";

function App() {

  return (
    <>
      <Routes>
        <Route element={<GoogleAuthLayout />}>
          <Route element={<AppBarLayout />}>
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
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;