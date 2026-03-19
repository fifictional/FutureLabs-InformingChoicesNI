import { HashRouter, Route, Routes } from "react-router";
import Home from "./pages/Home";
import GoogleAuthLayout from "./pages/layouts/GoogleAuthLayout";

function App() {

  return (
    <>
      <Routes>
        <Route element={<GoogleAuthLayout />}>
          <Route path="/" element={<Home />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
