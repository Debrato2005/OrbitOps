import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainApp from './MainApp';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/landing" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;