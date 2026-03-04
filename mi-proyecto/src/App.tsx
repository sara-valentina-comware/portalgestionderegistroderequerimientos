import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Inicio from "./pages/Inicio";
import MisRequerimientos from "./pages/MisRequerimientos";
import Nuevo from "./pages/Nuevo";
import Perfil from "./pages/Perfil";
import Resultado from "./pages/Resultado";
import Validacion from "./pages/Validacion";
import ValidacionRequerimiento from "./pages/ValidacionRequerimiento";
import Editar from "./pages/Editar";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/mis-requerimientos" element={<MisRequerimientos />} />
        <Route path="/nuevo" element={<Nuevo />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/resultado" element={<Resultado />} />
        <Route path="/validacion" element={<Validacion />} />
        <Route path="/validacionRequerimiento" element={<ValidacionRequerimiento />} />
        <Route path="/editar" element={<Editar />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;