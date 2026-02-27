"use client";

import React, { useState, useEffect } from "react";
import {
  Camera,
  ShoppingBag,
  PieChart,
  Zap,
  CheckCircle,
  User,
  Play,
  AlertCircle,
  RefreshCw,
  FileText,
} from "lucide-react";

export const HeroAnimation: React.FC = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 8);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const isScen1 = tick < 4;
  const step = tick % 4;

  return (
    <div className="w-full h-[450px] lg:h-[500px] bg-slate-900 border border-slate-800 p-3 shadow-2xl relative flex flex-col font-sans">
      <style>{`
        @keyframes scanLine {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fillWidth {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        @keyframes strike {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        @keyframes scrollUp {
          0% { transform: translateY(0); }
          80% { transform: translateY(-35%); }
          100% { transform: translateY(-35%); }
        }
        @keyframes highlightDown {
          0%, 100% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          40% { transform: translateY(0); }
          50% { transform: translateY(22px); }
          80% { transform: translateY(22px); }
          90% { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Top Header */}
      <div className="w-full flex justify-center items-center py-2 z-30 mb-2">
        <div className="relative h-8 w-full max-w-xs overflow-hidden flex items-center justify-center">
          <h3
            className={`absolute text-lg md:text-xl font-bold text-white tracking-tight transition-all duration-500 ${isScen1
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-4"
              }`}
          >
            The Grocery Run
          </h3>
          <h3
            className={`absolute text-lg md:text-xl font-bold text-white tracking-tight transition-all duration-500 ${!isScen1
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
              }`}
          >
            The Monthly Audit
          </h3>
        </div>
      </div>

      {/* Grid Wrapper */}
      <div className="relative flex-1 w-full">
        {/* Center Hub Logo */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#006994] border-4 border-slate-900 z-20 flex items-center justify-center shadow-2xl">
          <Zap
            className={`text-white transition-transform duration-700 ${step > 0 ? "scale-110" : "scale-90"
              }`}
            size={20}
          />
        </div>

        {/* 2x2 Bento Grid */}
        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full w-full bg-slate-800">
          {/* --- PANEL 1: Top Left --- */}
          <div
            className={`bg-slate-950 p-4 relative transition-colors duration-500 flex flex-col ${step === 0
                ? "border border-[#00a2e0] shadow-[inset_0_0_20px_rgba(0,162,224,0.15)]"
                : "border border-transparent"
              }`}
          >
            <div className="flex justify-between items-center mb-2 z-20">
              <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                {isScen1 ? "Receipt Scan" : "Statement Import"}
              </span>
              {isScen1 ? (
                <Camera
                  size={14}
                  className={
                    step === 0 ? "text-[#00a2e0]" : "text-slate-700"
                  }
                />
              ) : (
                <FileText
                  size={14}
                  className={
                    step === 0 ? "text-[#00a2e0]" : "text-slate-700"
                  }
                />
              )}
            </div>
            <div className="relative flex-1 w-full">
              {/* Scenario 1: Receipt */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${isScen1
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                  }`}
              >
                <div
                  className={`w-[90%] max-w-[140px] bg-white border border-slate-200 p-3 shadow-lg transition-opacity duration-300 ${step === 0 ? "opacity-100" : "opacity-40"
                    }`}
                >
                  <div className="border-b border-slate-200 pb-2 mb-2 flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-xs truncate">
                      HEB Grocery
                    </span>
                  </div>
                  <div className="space-y-2 relative text-[10px] text-slate-600 font-medium h-16">
                    {step === 0 && (
                      <div className="absolute left-0 right-0 h-0.5 bg-[#00a2e0] shadow-[0_0_8px_2px_rgba(0,162,224,0.6)] z-20 animate-[scanLine_2.5s_ease-in-out_infinite]"></div>
                    )}
                    <div className="flex justify-between">
                      <span>Organic Milk</span>
                      <span>$4.50</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fresh Spinach</span>
                      <span>$3.99</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jasmine Rice</span>
                      <span>$8.99</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Scenario 2: Bank Statement */}
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${!isScen1
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                  }`}
              >
                <div
                  className={`w-[90%] max-w-[150px] bg-white p-3 border border-slate-200 transition-opacity duration-300 ${step === 0 ? "opacity-100" : "opacity-40"
                    }`}
                >
                  <div className="border-b border-slate-200 pb-1 mb-2 flex items-center gap-2">
                    <FileText
                      size={10}
                      className="text-indigo-600 shrink-0"
                    />
                    <span className="font-bold text-slate-800 text-[10px] uppercase truncate">
                      chase_stmt.pdf
                    </span>
                  </div>
                  <div className="space-y-2 relative h-16 overflow-hidden pt-1">
                    {step === 0 && (
                      <div className="absolute top-0 left-0 w-full h-4 bg-indigo-500/20 border border-indigo-500/50 z-10 animate-[highlightDown_2.5s_ease-in-out_infinite]"></div>
                    )}
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span>TARGET T-0922</span>
                      <span>$45.00</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span>NETFLIX.COM</span>
                      <span>$15.99</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-500">
                      <span>SHELL OIL 12</span>
                      <span>$32.50</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- PANEL 2: Top Right --- */}
          <div
            className={`bg-slate-950 p-4 relative transition-colors duration-500 flex flex-col ${step === 1
                ? isScen1
                  ? "border border-orange-500 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]"
                  : "border border-rose-500 shadow-[inset_0_0_20px_rgba(243,64,111,0.1)]"
                : "border border-transparent"
              }`}
          >
            <div className="flex justify-between items-center mb-2 z-20">
              <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                {isScen1 ? "Smart Pantry" : "Subscriptions"}
              </span>
              {isScen1 ? (
                <ShoppingBag
                  size={14}
                  className={
                    step === 1 ? "text-orange-500" : "text-slate-700"
                  }
                />
              ) : (
                <Zap
                  size={14}
                  className={
                    step === 1 ? "text-rose-500" : "text-slate-700"
                  }
                />
              )}
            </div>
            <div className="relative flex-1 w-full">
              {/* Scenario 1: Pantry Scroll */}
              <div
                className={`absolute inset-0 flex flex-col justify-center overflow-hidden transition-opacity duration-500 ${isScen1
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                  }`}
              >
                <div className="relative w-full h-[84px] border border-slate-800 bg-slate-900 overflow-hidden">
                  <div
                    className={`space-y-2 absolute left-2 right-2 top-2 transition-transform duration-1000 ease-in-out ${step >= 1
                        ? "animate-[scrollUp_3s_linear_forwards]"
                        : ""
                      }`}
                  >
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                      <span className="text-xs font-bold text-white truncate mr-2">
                        Organic Milk
                      </span>
                      <span className="text-[9px] font-bold bg-[#00a2e0]/20 text-[#00a2e0] border border-[#00a2e0]/30 px-1 uppercase tracking-wider shrink-0">
                        Fridge
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                      <span className="text-xs font-bold text-white truncate mr-2">
                        Fresh Spinach
                      </span>
                      <span className="text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1 uppercase tracking-wider shrink-0">
                        4 Days
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                      <span className="text-xs font-bold text-white truncate mr-2">
                        Jasmine Rice
                      </span>
                      <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 uppercase tracking-wider shrink-0">
                        Pantry
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                      <span className="text-xs font-bold text-white truncate mr-2">
                        Coffee Beans
                      </span>
                      <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 uppercase tracking-wider shrink-0">
                        Pantry
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Scenario 2: Found Subscriptions */}
              <div
                className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${!isScen1
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                  }`}
              >
                <div className="space-y-3 w-full">
                  <div
                    className={`bg-slate-900 border border-slate-800 p-3 flex justify-between items-center transition-all ${step >= 1 ? "opacity-100" : "opacity-0"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                        <Play size={10} />
                      </div>
                      <span className="text-sm font-bold text-white">
                        Netflix
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      $15.99
                    </span>
                  </div>
                  {step >= 1 && (
                    <div className="flex justify-start animate-[slideIn_0.3s_ease-out]">
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-1 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle size={10} /> Recurring
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* --- PANEL 3: Bottom Left --- */}
          <div
            className={`bg-slate-950 p-4 relative transition-colors duration-500 flex flex-col ${step === 2
                ? isScen1
                  ? "border border-emerald-500 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]"
                  : "border border-purple-500 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]"
                : "border border-transparent"
              }`}
          >
            <div className="flex justify-between items-center mb-2 z-20">
              <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                {isScen1 ? "Shopping List" : "Spending Habits"}
              </span>
              {isScen1 ? (
                <CheckCircle
                  size={14}
                  className={
                    step === 2 ? "text-emerald-500" : "text-slate-700"
                  }
                />
              ) : (
                <PieChart
                  size={14}
                  className={
                    step === 2 ? "text-purple-500" : "text-slate-700"
                  }
                />
              )}
            </div>
            <div className="relative flex-1 w-full">
              {/* Scenario 1: Shopping List Cross-off */}
              <div
                className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${isScen1
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                  }`}
              >
                <div className="space-y-4 w-full bg-slate-900 border border-slate-800 p-4">
                  <div className="flex items-center gap-3 relative">
                    <div className="w-4 h-4 border border-emerald-500 bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle size={10} className="text-emerald-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-500 truncate">
                      Organic Milk
                    </span>
                    <div
                      className={`absolute left-8 right-2 h-0.5 bg-slate-500 top-1/2 origin-left ${step >= 2 && isScen1
                          ? "animate-[strike_0.4s_ease-out_forwards]"
                          : "scale-x-0"
                        }`}
                    ></div>
                  </div>
                  <div className="flex items-center gap-3 relative">
                    <div className="w-4 h-4 border border-emerald-500 bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle size={10} className="text-emerald-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-500 truncate">
                      Fresh Spinach
                    </span>
                    <div
                      className={`absolute left-8 right-2 h-0.5 bg-slate-500 top-1/2 origin-left ${step >= 2 && isScen1
                          ? "animate-[strike_0.4s_ease-out_0.2s_forwards]"
                          : "scale-x-0"
                        }`}
                    ></div>
                  </div>
                  <div className="flex items-center gap-3 relative">
                    <div className="w-4 h-4 border border-slate-600 shrink-0"></div>
                    <span className="text-sm font-bold text-white truncate">
                      Paper Towels
                    </span>
                  </div>
                </div>
              </div>
              {/* Scenario 2: Category Breakdown */}
              <div
                className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${!isScen1
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                  }`}
              >
                <div className="w-full space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                      <span>Groceries</span>
                      <span className="text-white">$480</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800">
                      <div
                        className={`h-full bg-emerald-500 origin-left ${step >= 2 && !isScen1
                            ? "animate-[fillWidth_1s_ease-out_forwards]"
                            : "scale-x-0"
                          }`}
                        style={{ width: "70%" }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                      <span>Leisure</span>
                      <span className="text-white">$120</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800">
                      <div
                        className={`h-full bg-purple-500 origin-left ${step >= 2 && !isScen1
                            ? "animate-[fillWidth_1s_ease-out_0.2s_forwards]"
                            : "scale-x-0"
                          }`}
                        style={{ width: "30%" }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                      <span>Transport</span>
                      <span className="text-white">$80</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800">
                      <div
                        className={`h-full bg-blue-500 origin-left ${step >= 2 && !isScen1
                            ? "animate-[fillWidth_1s_ease-out_0.4s_forwards]"
                            : "scale-x-0"
                          }`}
                        style={{ width: "20%" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- PANEL 4: Bottom Right --- */}
          <div
            className={`bg-slate-950 p-4 relative transition-colors duration-500 flex flex-col ${step === 3
                ? isScen1
                  ? "border border-[#006994] shadow-[inset_0_0_20px_rgba(0,105,148,0.2)]"
                  : "border border-[#00a2e0] shadow-[inset_0_0_20px_rgba(0,162,224,0.2)]"
                : "border border-transparent"
              }`}
          >
            <div className="flex justify-between items-center mb-2 z-20">
              <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                {isScen1 ? "Budget Impact" : "Family Spending"}
              </span>
              {isScen1 ? (
                <PieChart
                  size={14}
                  className={
                    step === 3 ? "text-[#006994]" : "text-slate-700"
                  }
                />
              ) : (
                <User
                  size={14}
                  className={
                    step === 3 ? "text-[#00a2e0]" : "text-slate-700"
                  }
                />
              )}
            </div>
            <div className="relative flex-1 w-full">
              {/* Scenario 1: Budget Pulse */}
              <div
                className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${isScen1
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                  }`}
              >
                <div className="flex justify-between items-end mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Groceries
                  </span>
                  <span
                    className={`text-xl md:text-2xl font-black transition-colors ${step >= 3 ? "text-white" : "text-slate-600"
                      }`}
                  >
                    {step >= 3 ? "$480" : "$337"}{" "}
                    <span className="text-[10px] md:text-xs text-slate-500 font-medium">
                      spent
                    </span>
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-800 mb-4">
                  <div
                    className={`h-full bg-[#006994] origin-left ${step >= 3 && isScen1
                        ? "animate-[fillWidth_1s_ease-out_forwards]"
                        : "scale-x-0"
                      }`}
                    style={{ width: "80%" }}
                  ></div>
                </div>
                {step >= 3 && (
                  <div className="bg-[#006994]/20 border border-[#006994]/40 p-2 md:p-3 text-[10px] md:text-xs text-[#00a2e0] font-bold animate-[slideIn_0.4s_ease-out]">
                    💡 Remaining balance: $120
                  </div>
                )}
              </div>
              {/* Scenario 2: Household Sync */}
              <div
                className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${!isScen1
                    ? "opacity-100 z-10"
                    : "opacity-0 z-0 pointer-events-none"
                  }`}
              >
                <div className="w-full flex justify-between items-center relative">
                  {/* Sync Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700 -z-10"></div>
                  {step >= 3 && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-slate-950 border border-slate-600 flex items-center justify-center animate-spin z-0">
                      <RefreshCw size={10} className="text-[#00a2e0]" />
                    </div>
                  )}

                  <div
                    className={`bg-slate-900 border border-slate-700 p-2 md:p-3 w-[45%] text-center transition-all ${step >= 3
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2"
                      }`}
                  >
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-emerald-500/20 mx-auto mb-2 flex items-center justify-center">
                      <User size={14} className="text-emerald-500" />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1">
                      Sarah
                    </span>
                    <span className="text-xs md:text-sm text-white font-bold">
                      $640
                    </span>
                  </div>

                  <div
                    className={`bg-slate-900 border border-slate-700 p-2 md:p-3 w-[45%] text-center transition-all delay-200 ${step >= 3
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2"
                      }`}
                  >
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500/20 mx-auto mb-2 flex items-center justify-center">
                      <User size={14} className="text-blue-500" />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1">
                      Mike
                    </span>
                    <span className="text-xs md:text-sm text-white font-bold">
                      $320
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
