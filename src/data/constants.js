export const STATUSES = [
  { id: "todo",       label: "To Do",           color: "#6B7280" },
  { id: "inprogress", label: "In Progress",      color: "#2563EB" },
  { id: "discussion", label: "Discussion",       color: "#D97706" },
  { id: "review",     label: "In Review",        color: "#7C3AED" },
  { id: "testing",    label: "Testing",          color: "#0891B2" },
  { id: "blocked",    label: "Blocked",          color: "#DC2626" },
  { id: "done",       label: "Done",             color: "#16A34A" },
];

export const PRIORITIES = [
  { id: "urgent", label: "Urgent", color: "#DC2626" },
  { id: "high",   label: "High",   color: "#EA580C" },
  { id: "medium", label: "Medium", color: "#2563EB" },
  { id: "low",    label: "Low",    color: "#6B7280" },
];

export const PRIORITY_ARROWS = { urgent: "↑↑", high: "↑", medium: "→", low: "↓" };

export const MEMBER_COLOR_PALETTE = [
  "#2563EB", "#7C3AED", "#059669", "#D97706",
  "#DC2626", "#0891B2", "#DB2777", "#65A30D",
];

export const getMemberColor = (userId) => {
  if (!userId) return "#6B7280";
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MEMBER_COLOR_PALETTE[Math.abs(hash) % MEMBER_COLOR_PALETTE.length];
};
