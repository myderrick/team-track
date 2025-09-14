import React from "react";

function initialsFrom(nameOrEmail = "") {
  const s = nameOrEmail.trim();
  if (!s) return "U";
  const base = s.includes("@") ? s.split("@")[0] : s;
  const parts = base.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last  = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last || first || "U").toUpperCase().slice(0, 2);
}

export default function Avatar({ src, name, size = 32, className = "" }) {
  const [error, setError] = React.useState(false);
  const showImg = src && !error;

  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 ${className}`}
      style={{ width: size, height: size }}
      aria-label={name || "User"}
      title={name || "User"}
    >
      {showImg ? (
        <img
          src={src}
          alt={name || "User"}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <div className="w-full h-full grid place-items-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 text-xs font-semibold">
          {initialsFrom(name)}
        </div>
      )}
    </div>
  );
}
