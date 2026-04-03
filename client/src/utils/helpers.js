export const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

export const timeAgo = (date) => {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const getInitials = (name = "") =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export const getAvatarColor = (name = "") => {
  const colors = ["#064e3b", "#003527", "#0f6e56", "#1d9e75", "#4d661c"];
  return colors[name.charCodeAt(0) % colors.length];
};