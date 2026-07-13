import React from "react";
import { Link } from "react-router-dom";
import { Dumbbell, Wallet, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div style={{ background: "#0F1712", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }} className="flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div style={{ color: "#8A9389", fontSize: 13, letterSpacing: "0.08em" }} className="text-center mb-8">PT SUITE</div>
        <div className="space-y-3">
          <Link to="/commission" style={{ background: "#1B1F27", border: "1px solid #232833" }} className="flex items-center gap-3 rounded-xl p-5 hover:opacity-90 transition">
            <Dumbbell size={22} color="#F2A93B" />
            <div className="flex-1">
              <div style={{ color: "#F4F1EA", fontWeight: 600, fontSize: 15 }}>Commission Tracker</div>
              <div style={{ color: "#8B93A1", fontSize: 12.5 }}>Clients, sessions, monthly commission</div>
            </div>
            <ArrowRight size={16} color="#8B93A1" />
          </Link>
          <Link to="/budget" style={{ background: "#172019", border: "1px solid #1E2A20" }} className="flex items-center gap-3 rounded-xl p-5 hover:opacity-90 transition">
            <Wallet size={22} color="#D4AF6A" />
            <div className="flex-1">
              <div style={{ color: "#EDEAE0", fontWeight: 600, fontSize: 15 }}>Budget Planner</div>
              <div style={{ color: "#8A9389", fontSize: 12.5 }}>Income, expenses, savings goals</div>
            </div>
            <ArrowRight size={16} color="#8A9389" />
          </Link>
        </div>
      </div>
    </div>
  );
}
