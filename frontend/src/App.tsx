import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Submit from "@/pages/Submit";
import { Toaster } from "sonner";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/submit" element={<Submit />} />
          </Routes>
        </main>

        <Toaster richColors position="top-center" />
      </div>
    </Router>
  );
}

export default App;