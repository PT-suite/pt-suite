import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Download, X, Check, Wallet } from "lucide-react";

const BASE_SALARY = 200;

function pad(n) { return String(n).padStart(2, "0"); }
function monthKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function monthLabel(d) { return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }); }

const defaultCategories = () => ([
  { id: "cat-groceries", name: "Groceries", budgeted: 0 },
  { id: "cat-supplements", name: "Supplements", budgeted: 0 },
  { id: "cat-unexpected", name: "Unexpected / Equipment", budgeted: 0 },
]);

const inputStyle = { background: "#0F1712", border: "1px solid #2A362C", color: "#EDEAE0" };

async function loadJSON(key, fallback, shared = false) {
  try {
    const res = await window.storage.get(key, shared);
    return res && res.value ? JSON.parse(res.value) : fallback;
  } catch (e) {
    return fallback;
  }
}
async function saveJSON(key, value, shared = false) {
  try {
    await window.storage.set(key, JSON.stringify(value), shared);
  } catch (e) {
    console.error("storage error", e);
  }
}

export default function BudgetPlanner() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [monthData, setMonthData] = useState({ extraIncome: [], expenses: {}, goalContributions: {} });
  const [showCatModal, setShowCatModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(null); // null | 'new' | goalId
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", budgeted: "" });
  const [goalForm, setGoalForm] = useState({ name: "", target: "", targetDate: "", monthlyTarget: "" });
  const [incomeForm, setIncomeForm] = useState({ label: "", amount: "" });

  useEffect(() => {
    (async () => {
      const cats = await loadJSON("budget-categories", defaultCategories());
      const gls = await loadJSON("savings-goals", []);
      setCategories(cats);
      setGoals(gls);
      setLoading(false);
    })();
  }, []);

  const mKey = monthKey(monthDate);

  useEffect(() => {
    (async () => {
      const data = await loadJSON(`budget-month:${mKey}`, { extraIncome: [], expenses: {}, goalContributions: {} });
      if (Array.isArray(data.goalContributions)) {
        const map = {};
        data.goalContributions.forEach((c) => { map[c.goalId] = (map[c.goalId] || 0) + Number(c.amount || 0); });
        data.goalContributions = map;
      }
      setMonthData(data);
    })();
  }, [mKey]);

  const persistMonth = useCallback((next) => {
    setMonthData(next);
    saveJSON(`budget-month:${mKey}`, next);
  }, [mKey]);

  const persistCategories = useCallback((next) => {
    setCategories(next);
    saveJSON("budget-categories", next);
  }, []);

  const persistGoals = useCallback((next) => {
    setGoals(next);
    saveJSON("savings-goals", next);
  }, []);

  const totalExtraIncome = useMemo(() => monthData.extraIncome.reduce((s, i) => s + Number(i.amount || 0), 0), [monthData]);
  const totalIncome = BASE_SALARY + totalExtraIncome;
  const totalBudgeted = useMemo(() => categories.reduce((s, c) => s + Number(c.budgeted || 0), 0), [categories]);
  const totalSpent = useMemo(() => categories.reduce((s, c) => s + Number((monthData.expenses[c.id] || {}).spent || 0), 0), [categories, monthData]);
  const totalContribThisMonth = useMemo(
    () => Object.values(monthData.goalContributions || {}).reduce((s, v) => s + Number(v || 0), 0),
    [monthData]
  );
  const leftover = +(totalIncome - totalSpent - totalContribThisMonth).toFixed(3);

  function setSpent(catId, val) {
    const next = { ...monthData, expenses: { ...monthData.expenses, [catId]: { ...(monthData.expenses[catId] || {}), spent: val } } };
    persistMonth(next);
  }

  function addCategory() {
    if (!catForm.name.trim()) return;
    persistCategories([...categories, { id: `${Date.now()}`, name: catForm.name, budgeted: Number(catForm.budgeted || 0) }]);
    setCatForm({ name: "", budgeted: "" });
    setShowCatModal(false);
  }
  function removeCategory(id) {
    persistCategories(categories.filter((c) => c.id !== id));
  }
  function updateCategoryBudget(id, val) {
    persistCategories(categories.map((c) => (c.id === id ? { ...c, budgeted: val } : c)));
  }

  function addIncome() {
    if (!incomeForm.label.trim() || !incomeForm.amount) return;
    persistMonth({ ...monthData, extraIncome: [...monthData.extraIncome, { id: `${Date.now()}`, label: incomeForm.label, amount: Number(incomeForm.amount) }] });
    setIncomeForm({ label: "", amount: "" });
    setShowIncomeModal(false);
  }
  function removeIncome(id) {
    persistMonth({ ...monthData, extraIncome: monthData.extraIncome.filter((i) => i.id !== id) });
  }

  function openNewGoal() {
    setGoalForm({ name: "", target: "", targetDate: "", monthlyTarget: "" });
    setShowGoalModal("new");
  }
  function openEditGoal(g) {
    setGoalForm({ name: g.name, target: g.target, targetDate: g.targetDate || "", monthlyTarget: g.monthlyTarget || "" });
    setShowGoalModal(g.id);
  }
  function saveGoal() {
    if (!goalForm.name.trim() || !goalForm.target) return;
    if (showGoalModal === "new") {
      persistGoals([
        ...goals,
        {
          id: `${Date.now()}`,
          name: goalForm.name,
          target: Number(goalForm.target),
          targetDate: goalForm.targetDate,
          monthlyTarget: Number(goalForm.monthlyTarget || 0),
          saved: 0,
        },
      ]);
    } else {
      persistGoals(goals.map((g) => (g.id === showGoalModal ? {
        ...g,
        name: goalForm.name,
        target: Number(goalForm.target),
        targetDate: goalForm.targetDate,
        monthlyTarget: Number(goalForm.monthlyTarget || 0),
      } : g)));
    }
    setShowGoalModal(null);
  }
  function deleteGoal(id) {
    persistGoals(goals.filter((g) => g.id !== id));
    const nextContrib = { ...monthData.goalContributions };
    delete nextContrib[id];
    persistMonth({ ...monthData, goalContributions: nextContrib });
  }

  // Editing this month's contribution works exactly like editing an expense's
  // "spent" field: typing a number here both records it for the month and
  // adjusts the goal's cumulative saved total by the difference, so it
  // immediately affects the leftover balance the same way an expense does.
  function setContribution(goalId, newValue) {
    const oldValue = Number((monthData.goalContributions || {})[goalId] || 0);
    const delta = Number(newValue || 0) - oldValue;
    persistMonth({ ...monthData, goalContributions: { ...monthData.goalContributions, [goalId]: Number(newValue || 0) } });
    persistGoals(goals.map((g) => (g.id === goalId ? { ...g, saved: +(g.saved + delta).toFixed(3) } : g)));
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const incomeRows = [["Income", "Amount (KWD)"], ["Base Salary", BASE_SALARY], ...monthData.extraIncome.map((i) => [i.label, i.amount]), [], ["Total Income", totalIncome]];
    const expenseRows = [["Category", "Budgeted", "Spent"], ...categories.map((c) => [c.name, c.budgeted, (monthData.expenses[c.id] || {}).spent || 0]), [], ["Total", totalBudgeted, totalSpent]];
    const goalRows = [["Goal", "Target", "Saved (Total)", "Target Date", "Monthly Target", "Contributed This Month"], ...goals.map((g) => {
      const contrib = Number((monthData.goalContributions || {})[g.id] || 0);
      return [g.name, g.target, g.saved, g.targetDate || "-", g.monthlyTarget || 0, contrib];
    })];
    const ws1 = XLSX.utils.aoa_to_sheet(incomeRows);
    const ws2 = XLSX.utils.aoa_to_sheet(expenseRows);
    const ws3 = XLSX.utils.aoa_to_sheet(goalRows);
    XLSX.utils.book_append_sheet(wb, ws1, "Income");
    XLSX.utils.book_append_sheet(wb, ws2, "Expenses");
    XLSX.utils.book_append_sheet(wb, ws3, "Savings Goals");
    XLSX.writeFile(wb, `budget_${mKey}.xlsx`);
  }

  if (loading) {
    return <div style={{ background: "#0F1712", minHeight: "100vh" }} className="flex items-center justify-center"><div style={{ color: "#8A9389" }}>Loading…</div></div>;
  }

  return (
    <div style={{ background: "#0F1712", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
        .serif { font-family: 'Fraunces', serif; }
      `}</style>

      <div className="max-w-3xl mx-auto px-5 pt-8 pb-6" style={{ borderBottom: "1px solid #1E2A20" }}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={18} color="#D4AF6A" />
          <span style={{ color: "#8A9389", fontSize: 13, letterSpacing: "0.08em" }}>MONTHLY BUDGET</span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="serif" style={{ color: leftover >= 0 ? "#EDEAE0" : "#E08B6E", fontSize: 44, lineHeight: 1, fontWeight: 600 }}>
              {leftover.toFixed(3)} <span style={{ fontSize: 18, color: "#8A9389" }}>KWD left</span>
            </div>
            <div style={{ color: "#8A9389", fontSize: 12.5, marginTop: 4 }}>
              {totalIncome.toFixed(2)} income · {totalSpent.toFixed(2)} spent · {totalContribThisMonth.toFixed(2)} saved to goals
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} style={{ color: "#8A9389" }} className="p-2 hover:text-white"><ChevronLeft size={18} /></button>
            <div style={{ color: "#EDEAE0", fontSize: 13, fontWeight: 600, minWidth: 110 }} className="text-center">{monthLabel(monthDate)}</div>
            <button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} style={{ color: "#8A9389" }} className="p-2 hover:text-white"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">
        {/* Income */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="serif" style={{ color: "#EDEAE0", fontSize: 17 }}>Income</h2>
            <button onClick={() => setShowIncomeModal(true)} style={{ color: "#D4AF6A" }} className="flex items-center gap-1 text-xs"><Plus size={13} /> Add</button>
          </div>
          <div style={{ background: "#172019", border: "1px solid #1E2A20" }} className="rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center" style={{ fontSize: 13.5 }}>
              <span style={{ color: "#EDEAE0" }}>Base Salary</span>
              <span style={{ color: "#D4AF6A" }}>{BASE_SALARY.toFixed(2)} KWD</span>
            </div>
            {monthData.extraIncome.map((i) => (
              <div key={i.id} className="flex justify-between items-center" style={{ fontSize: 13.5 }}>
                <span style={{ color: "#EDEAE0" }}>{i.label}</span>
                <div className="flex items-center gap-2">
                  <span style={{ color: "#D4AF6A" }}>{Number(i.amount).toFixed(2)} KWD</span>
                  <button onClick={() => removeIncome(i.id)} style={{ color: "#8A9389" }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Expenses */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="serif" style={{ color: "#EDEAE0", fontSize: 17 }}>Expenses</h2>
            <button onClick={() => setShowCatModal(true)} style={{ color: "#D4AF6A" }} className="flex items-center gap-1 text-xs"><Plus size={13} /> Category</button>
          </div>
          <div className="space-y-2">
            {categories.map((c) => {
              const spent = Number((monthData.expenses[c.id] || {}).spent || 0);
              const budgeted = Number(c.budgeted || 0);
              const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
              const over = budgeted > 0 && spent > budgeted;
              return (
                <div key={c.id} style={{ background: "#172019", border: "1px solid #1E2A20" }} className="rounded-xl p-3.5">
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ color: "#EDEAE0", fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                    <button onClick={() => removeCategory(c.id)} style={{ color: "#8A9389" }}><Trash2 size={12} /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div style={{ background: "#0F1712", height: 6, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, background: over ? "#E08B6E" : "#7EA687", height: "100%" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#8A9389", whiteSpace: "nowrap" }}>
                      <input
                        type="number"
                        value={spent || ""}
                        onChange={(e) => setSpent(c.id, Number(e.target.value))}
                        placeholder="0"
                        style={{ ...inputStyle, width: 55 }}
                        className="rounded px-1.5 py-1 text-right mr-1"
                      />
                      / <input
                        type="number"
                        value={budgeted || ""}
                        onChange={(e) => updateCategoryBudget(c.id, Number(e.target.value))}
                        placeholder="0"
                        style={{ ...inputStyle, width: 55 }}
                        className="rounded px-1.5 py-1 text-right ml-1"
                      /> KD
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Savings goals — same layout/behavior as Expenses above: an inline
            "this month" amount against a target, subtracted from leftover
            the same way spending is. */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="serif" style={{ color: "#EDEAE0", fontSize: 17 }}>Savings Goals</h2>
            <button onClick={openNewGoal} style={{ color: "#D4AF6A" }} className="flex items-center gap-1 text-xs"><Plus size={13} /> Goal</button>
          </div>
          {goals.length === 0 && (
            <div style={{ color: "#8A9389", fontSize: 13, borderColor: "#1E2A20", borderStyle: "dashed" }} className="text-center py-8 border rounded-xl">
              No goals yet — add one for your car, gear, or anything else you're saving toward.
            </div>
          )}
          <div className="space-y-2">
            {goals.map((g) => {
              const thisMonth = Number((monthData.goalContributions || {})[g.id] || 0);
              const monthlyTarget = Number(g.monthlyTarget || 0);
              const pct = monthlyTarget > 0 ? Math.min((thisMonth / monthlyTarget) * 100, 100) : 0;
              const overallPct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
              const remaining = +(g.target - g.saved).toFixed(3);
              return (
                <div key={g.id} style={{ background: "#172019", border: "1px solid #1E2A20" }} className="rounded-xl p-3.5">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span style={{ color: "#EDEAE0", fontSize: 14, fontWeight: 500 }}>{g.name}</span>
                      <span style={{ color: "#8A9389", fontSize: 11, marginLeft: 8 }}>
                        {g.saved.toFixed(2)} / {Number(g.target).toFixed(2)} KWD overall
                        {g.targetDate ? ` · by ${new Date(g.targetDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditGoal(g)} style={{ color: "#8A9389" }}><Pencil size={12} /></button>
                      <button onClick={() => deleteGoal(g.id)} style={{ color: "#8A9389" }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div style={{ background: "#0F1712", height: 6, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${monthlyTarget > 0 ? pct : overallPct}%`, background: "#D4AF6A", height: "100%" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#8A9389", whiteSpace: "nowrap" }}>
                      <input
                        type="number"
                        value={thisMonth || ""}
                        onChange={(e) => setContribution(g.id, e.target.value)}
                        placeholder="0"
                        style={{ ...inputStyle, width: 55 }}
                        className="rounded px-1.5 py-1 text-right mr-1"
                      />
                      / <input
                        type="number"
                        value={monthlyTarget || ""}
                        onChange={(e) => persistGoals(goals.map((x) => (x.id === g.id ? { ...x, monthlyTarget: Number(e.target.value) } : x)))}
                        placeholder="0"
                        style={{ ...inputStyle, width: 55 }}
                        className="rounded px-1.5 py-1 text-right ml-1"
                      /> KD/mo
                    </div>
                  </div>
                  {remaining <= 0 && <div style={{ color: "#7EA687", fontSize: 11.5, marginTop: 6 }}>goal reached 🎉</div>}
                </div>
              );
            })}
          </div>
        </section>

        <button onClick={exportExcel} style={{ color: "#8A9389", border: "1px solid #1E2A20" }} className="w-full rounded-lg py-2.5 flex items-center justify-center gap-1.5 text-xs">
          <Download size={13} /> Export this month to Excel
        </button>
      </div>

      {/* Add category modal */}
      {showCatModal && (
        <Modal onClose={() => setShowCatModal(false)} title="Add Category">
          <FieldLabel>Name</FieldLabel>
          <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} style={inputStyle} className="w-full rounded-lg px-3 py-2 mt-1 mb-3 text-sm outline-none" />
          <FieldLabel>Monthly Budget (KWD)</FieldLabel>
          <input type="number" value={catForm.budgeted} onChange={(e) => setCatForm({ ...catForm, budgeted: e.target.value })} style={inputStyle} className="w-full rounded-lg px-3 py-2 mt-1 text-sm outline-none" />
          <SaveButton onClick={addCategory} />
        </Modal>
      )}

      {/* Add income modal */}
      {showIncomeModal && (
        <Modal onClose={() => setShowIncomeModal(false)} title="Add Income">
          <FieldLabel>Label</FieldLabel>
          <input value={incomeForm.label} onChange={(e) => setIncomeForm({ ...incomeForm, label: e.target.value })} placeholder="e.g. Bonus" style={inputStyle} className="w-full rounded-lg px-3 py-2 mt-1 mb-3 text-sm outline-none" />
          <FieldLabel>Amount (KWD)</FieldLabel>
          <input type="number" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} style={inputStyle} className="w-full rounded-lg px-3 py-2 mt-1 text-sm outline-none" />
          <SaveButton onClick={addIncome} />
        </Modal>
      )}

      {/* Goal modal */}
      {showGoalModal && (
        <Modal onClose={() => setShowGoalModal(null)} title={showGoalModal === "new" ? "New Goal" : "Edit Goal"}>
          <FieldLabel>Name</FieldLabel>
          <input value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} placeholder="e.g. Car" style={inputStyle} className="w-full rounded-lg px-3 py-2 mt-1 mb-3 text-sm outline-none" />
          <FieldLabel>Target Amount (KWD)</FieldLabel>
          <input type="number" value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })} style={inputStyle} className="w-full rounded-lg px-3 py-2 mt-1 mb-3 text-sm outline-none" />
          <FieldLabel>Target Date (optional)</FieldLabel>
          <input type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })} style={inputStyle} className="w-full rounded-lg px-3 py-2 mt-1 mb-3 text-sm outline-none" />
          <FieldLabel>Monthly Target (KWD) — optional, how much you plan to save each month</FieldLabel>
          <input type="number" value={goalForm.monthlyTarget} onChange={(e) => setGoalForm({ ...goalForm, monthlyTarget: e.target.value })} style={inputStyle} className="w-full rounded-lg px-3 py-2 mt-1 text-sm outline-none" />
          <SaveButton onClick={saveGoal} />
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", zIndex: 50 }}>
      <div style={{ background: "#172019", border: "1px solid #2A362C" }} className="rounded-xl p-5 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="serif" style={{ color: "#EDEAE0", fontWeight: 600, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ color: "#8A9389" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function FieldLabel({ children }) { return <label style={{ color: "#8A9389", fontSize: 12 }}>{children}</label>; }
function SaveButton({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: "#D4AF6A", color: "#0F1712" }} className="w-full rounded-lg py-2.5 mt-5 font-semibold flex items-center justify-center gap-1 text-sm">
      <Check size={16} /> Save
    </button>
  );
}
