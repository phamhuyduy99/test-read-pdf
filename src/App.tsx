import { Routes, Route, Link } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Book from "./pages/Book";
import BookV2 from "./pages/Book_v2";
import BookV3 from "./pages/Book_v3";
import BookV4 from "./pages/Book_v4";
import BookV5 from "./pages/Book_v5";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-start flex-col">
      <nav className="flex gap-8 p-4 bg-white shadow">
        <Link className="text-blue-500 hover:underline" to="/">Trang chủ</Link>
        <Link className="text-blue-500 hover:underline" to="/book">Sách</Link>
        <Link className="text-blue-500 hover:underline" to="/book_v2">Sách V2</Link>
        <Link className="text-blue-500 hover:underline" to="/book_v3">Sách V3</Link>
        <Link className="text-blue-500 hover:underline" to="/book_v4">Sách V4</Link>
        <Link className="text-blue-500 hover:underline" to="/book_v5">Sách V5</Link>

      </nav>

      <div className="p-6">
        <Routes>
          <Route path="/" element={<BookV5 />} />
          <Route path="/book" element={<Book />} />
          <Route path="/book_v2" element={<BookV2 />} />
          <Route path="/book_v3" element={<BookV3 />} />
          <Route path="/book_v4" element={<BookV4 />} />
          <Route path="/book_v5" element={<BookV5 />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
