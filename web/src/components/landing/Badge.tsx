"use client";

import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  color?: "red" | "orange" | "green" | "blue" | "gray";
}

const colorMap: Record<string, string> = {
  red: "bg-red-100 text-red-800 border-red-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  green: "bg-[#006994]/10 text-[#006994] border-[#006994]/20",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  gray: "bg-gray-100 text-gray-800 border-gray-200",
};

export const Badge: React.FC<BadgeProps> = ({ children, color = "gray" }) => {
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium border ${colorMap[color]}`}>
      {children}
    </span>
  );
};
