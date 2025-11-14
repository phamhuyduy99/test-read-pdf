import { Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Book from "./pages/Book";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start flex-col">
      <div className="p-6">
        <Routes>
          <Route path="/" element={<Book />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
