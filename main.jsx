import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./storage";
import "./index.css";
import Home from "./Home";
import CommissionTracker from "./CommissionTracker";
import BudgetPlanner from "./BudgetPlanner";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/commission" element={<CommissionTracker />} />
        <Route path="/budget" element={<BudgetPlanner />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
