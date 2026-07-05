const expenses = [];
const savingsGoals = new Map();

export const agent = {
  name: "personal-budget",
  version: "1.0.0",
  parent: "budget",
};

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "track-expense":
      return trackExpense(params);
    case "set-savings-goal":
      return setSavingsGoal(params);
    case "monthly-report":
      return monthlyReport(params);
    case "categorize-spending":
      return categorizeSpending(params, context);
    default:
      return { success: false, error: `Unknown skill: ${skill}` };
  }
}

function trackExpense({ category = "other", amount, description = "", date }) {
  const entry = {
    id: `exp_${expenses.length + 1}`,
    category,
    amount,
    description,
    date: date || new Date().toISOString().split("T")[0],
    timestamp: Date.now(),
  };
  expenses.push(entry);
  return { success: true, expense: entry };
}

function setSavingsGoal({ goalName, targetAmount, deadline, monthlyContribution }) {
  savingsGoals.set(goalName, { goalName, targetAmount, deadline, monthlyContribution, progress: 0, createdAt: Date.now() });
  return {
    success: true,
    goal: { goalName, targetAmount, deadline, monthlyContribution, monthsNeeded: Math.ceil(targetAmount / monthlyContribution) },
  };
}

function monthlyReport({ month, year }) {
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() + 1 === m && d.getFullYear() === y;
  });

  const byCategory = {};
  let total = 0;
  for (const e of monthExpenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    total += e.amount;
  }

  const goals = Array.from(savingsGoals.values());

  return {
    success: true,
    period: `${y}-${String(m).padStart(2, "0")}`,
    totalSpent: total,
    byCategory,
    expenseCount: monthExpenses.length,
    savingsGoals: goals,
  };
}

async function categorizeSpending({ expenseDescription }, context) {
  const { llm } = context;
  const categories = ["food", "transport", "housing", "entertainment", "utilities", "healthcare", "shopping", "other"];

  const prompt = `Categorize this expense into one of: ${categories.join(", ")}. Return ONLY the category name.\n\nExpense: "${expenseDescription}"`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 50,
    messages: [{ role: "user", content: prompt }],
  });

  const category = result.content[0].text.trim().toLowerCase();
  return { success: true, description: expenseDescription, category };
}
