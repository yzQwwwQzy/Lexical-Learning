import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegisterPage from './pages/RegisterPage';
import InstructionPage from './pages/InstructionPage';
import GeneratingPage from './pages/GeneratingPage';
import WritingPage from './pages/WritingPage';
import EndPage from './pages/EndPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/instruction" element={<InstructionPage />} />
        <Route path="/generating/:round" element={<GeneratingPage />} />
        <Route path="/writing/:round" element={<WritingPage />} />
        <Route path="/end" element={<EndPage />} />
      </Routes>
    </Router>
  );
}

export default App;
