export const agent = { name: "finance", version: "1.0.0", parent: true };

const payments = new Map();
const subscriptions = [
  { service: "google-mail", provider: "Google", billingCycle: "monthly", amount: 6.00, currency: "USD" },
  { service: "godaddy", provider: "GoDaddy", billingCycle: "annual", amount: 119.88, currency: "USD" },
  { service: "canva", provider: "Canva", billingCycle: "annual", amount: 119.99, currency: "USD" },
];

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "list-subscriptions":
      return listSubscriptions();
    case "record-payment":
      return recordPayment(params);
    case "subscription-status":
      return subscriptionStatus(params);
    case "hello":
      return runHello(params);
    case "verify":
      return runVerify(params);
    default:
      return { success: false, error: `Unknown skill: ${skill}. Try sub-agents: subscription-checker` };
  }
}

function runHello({ name = "world" }) {
  return {
    success: true,
    message: `Hello, ${name}! Finance agent is running.`,
    timestamp: new Date().toISOString(),
  };
}

function runVerify({ expression }) {
  if (!expression) {
    return { success: true, passed: true, result: true, message: "finance agent is alive and verified" };
  }
  try {
    const passed = !!eval?.(expression);
    return { success: true, passed, result: passed, expression, message: passed ? "rules check passed" : "rules check failed" };
  } catch (e) {
    return { success: true, passed: false, error: e.message, expression, message: "rules check failed — could not evaluate" };
  }
}

function listSubscriptions() {
  const result = subscriptions.map(s => {
    const payment = payments.get(s.service);
    return {
      ...s,
      lastPayment: payment || null,
      status: payment ? payment.status : "unknown",
    };
  });
  return { success: true, subscriptions: result, count: result.length };
}

function recordPayment({ service, amount, currency = "USD", status = "paid" }) {
  const sub = subscriptions.find(s => s.service === service);
  if (!sub) {
    return { success: false, error: `Unknown service: ${service}. Valid: google-mail, godaddy, canva` };
  }
  const payment = {
    service,
    provider: sub.provider,
    amount,
    currency,
    status,
    recordedAt: new Date().toISOString(),
  };
  payments.set(service, payment);
  return { success: true, payment };
}

function subscriptionStatus({ service = "all" }) {
  if (service === "all") {
    const all = subscriptions.map(s => {
      const payment = payments.get(s.service);
      return {
        service: s.service,
        provider: s.provider,
        billingCycle: s.billingCycle,
        expectedAmount: s.amount,
        lastPayment: payment || null,
        paid: payment?.status === "paid",
        status: payment ? payment.status : "unpaid",
      };
    });
    const paid = all.filter(s => s.paid).length;
    return { success: true, checkedAt: new Date().toISOString(), services: all, summary: { total: all.length, paid, unpaid: all.length - paid } };
  }
  const sub = subscriptions.find(s => s.service === service);
  if (!sub) {
    return { success: false, error: `Unknown service: ${service}. Valid: google-mail, godaddy, canva, all` };
  }
  const payment = payments.get(service);
  return {
    success: true,
    service: sub.service,
    provider: sub.provider,
    billingCycle: sub.billingCycle,
    expectedAmount: sub.amount,
    lastPayment: payment || null,
    paid: payment?.status === "paid",
    status: payment ? payment.status : "unpaid",
    checkedAt: new Date().toISOString(),
  };
}
