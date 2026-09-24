type GoalProperties = Record<string, string>;

declare global {
  interface Window {
    datafast?: (goal: string, properties?: GoalProperties) => void;
  }
}

export function trackDataFastGoal(goal: string, properties?: GoalProperties) {
  if (typeof window === "undefined" || ["localhost", "127.0.0.1"].includes(window.location.hostname)) return;
  window.datafast?.(goal, properties);
}
