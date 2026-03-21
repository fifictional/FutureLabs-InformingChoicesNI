import { HashRouter, Route, Routes } from "react-router";
import Home from "./pages/Home";
import GoogleAuthLayout from "./pages/layouts/GoogleAuthLayout";
import AppBarLayout from "./pages/layouts/AppBarLayout";
import Surveys from "./pages/Surveys";
import Analyse from "./pages/Analyse";

function App() {

  return (
    <>
      <Routes>
        <Route element={<GoogleAuthLayout />}>
          <Route element={<AppBarLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="surveys" element={<Surveys />} />
            <Route path="analyse" element={<Analyse />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App