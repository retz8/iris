import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SnippetPage from './pages/SnippetPage';
import ConfirmationPage from './pages/ConfirmationPage';
import UnsubscribePage from './pages/UnsubscribePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/snippet" replace />} />
        <Route path="/snippet" element={<SnippetPage />} />
        <Route path="/snippet/confirm" element={<ConfirmationPage />} />
        <Route path="/snippet/unsubscribe" element={<UnsubscribePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
