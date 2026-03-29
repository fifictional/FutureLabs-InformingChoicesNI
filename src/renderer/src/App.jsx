import { Route, Routes } from "react-router";
import Home from "./pages/Home";
import GoogleAuthLayout from "./pages/layouts/GoogleAuthLayout";
import AppBarLayout from "./pages/layouts/AppBarLayout";
import Surveys from "./pages/Surveys";
import Analysis from "./pages/Analysis";
import Events from "./pages/Events";
import ViewSurveyData from "./pages/ViewSurveyData";

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
            </Route>
            <Route path="analysis" element={<Analysis />} />
            <Route path="events" element={<Events />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;