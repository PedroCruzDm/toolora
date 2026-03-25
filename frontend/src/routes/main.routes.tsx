import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import Cadastro from '../pages/cadastro';
import Login from '../pages/login';
import Submit from '../pages/Submit';

export default function MainRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/submit" element={<Submit />} />
      </Routes>
    </Router>
  );
}
