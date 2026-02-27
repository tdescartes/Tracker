"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  ShoppingBag,
  PieChart,
  Utensils,
  ChevronRight,
  Zap,
  RefreshCw,
  CheckCircle,
  Bell,
  TrendingUp,
  MessageSquare,
  Home,
  Camera,
} from "lucide-react";
import { HeroAnimation } from "./HeroAnimation";
import { Badge } from "./Badge";

/* ---------- Feature visual data for the master/detail section ---------- */

interface Feature {
  id: string;
  title: string;
  icon: React.FC<{ size?: number; className?: string }>;
  iconColor: string;
  iconBgActive: string;
  iconBgInactive: string;
  heading: string;
  description: string;
  visual: React.ReactNode;
}

const features: Feature[] = [
  {
    id: "scan",
    title: "No manual entry",
    icon: UploadCloud,
    iconColor: "text-blue-600",
    iconBgActive: "bg-blue-100",
    iconBgInactive: "bg-blue-50",
    heading: "Snap a receipt. We do the rest.",
    description:
      "Take a picture of the grocery run. We pull the items, map the costs, and organize your kitchen inventory while you unpack.",
    visual: (
      <div className="flex flex-col gap-3 mt-8 relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#006994] z-10 animate-[scanLine_2s_linear_infinite] shadow-[0_4px_10px_rgba(0,105,148,0.5)]"></div>
        <div className="bg-slate-50 border border-slate-200 p-3 flex justify-between items-center opacity-60">
          <span className="font-mono text-xs text-slate-500 uppercase">
            HEB W-Milk 1Gal ................. $4.50
          </span>
        </div>
        <div className="flex justify-center">
          <ChevronRight className="text-[#006994] rotate-90" size={20} />
        </div>
        <div className="bg-white border border-[#006994]/30 shadow-md p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#006994]/5 animate-pulse"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <h4 className="font-semibold text-slate-900">
                Organic Whole Milk
              </h4>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mt-1 inline-block">
                Dairy &bull; Fridge
              </span>
            </div>
            <span className="font-semibold text-slate-900 bg-[#006994]/10 text-[#006994] px-2 py-1 text-sm">
              $4.50
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "pantry",
    title: "Kitchen Inventory",
    icon: ShoppingBag,
    iconColor: "text-orange-600",
    iconBgActive: "bg-orange-100",
    iconBgInactive: "bg-orange-50",
    heading: "Stop buying duplicates.",
    description:
      "You probably already have three jars of paprika. Check the app before you hit the aisles and stop throwing away money on things you own.",
    visual: (
      <div className="space-y-3 mt-8">
        <div className="border border-red-200 bg-red-50 p-4 flex justify-between items-center animate-[slideRight_0.4s_ease-out_forwards]">
          <span className="font-semibold text-slate-900">Fresh Spinach</span>
          <span className="text-xs font-bold bg-red-100 text-red-800 px-2.5 py-1 border border-red-200 uppercase tracking-wider animate-pulse">
            Expires Today
          </span>
        </div>
        <div className="border border-amber-200 bg-amber-50 p-4 flex justify-between items-center opacity-0 animate-[slideRight_0.4s_ease-out_0.2s_forwards]">
          <span className="font-semibold text-slate-900">Whole Milk</span>
          <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 border border-amber-200 uppercase tracking-wider">
            2 days left
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "budget",
    title: "Live Spending",
    icon: PieChart,
    iconColor: "text-emerald-600",
    iconBgActive: "bg-emerald-100",
    iconBgInactive: "bg-emerald-50",
    heading: "Kill the blind spots.",
    description:
      "Bank apps just show a generic $140 charge from Target. We show you the actual items. See exactly where the cash is bleeding.",
    visual: (
      <div className="border border-slate-200 p-6 bg-white shadow-sm mt-8">
        <div className="flex justify-between items-end mb-4">
          <span className="text-3xl font-bold text-slate-900 tracking-tight">
            $480.00
          </span>
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            of $600.00
          </span>
        </div>
        <div className="h-4 w-full bg-slate-100 overflow-hidden flex">
          <div className="w-[55%] h-full">
            <div
              className="bg-[#006994] h-full border-r border-[#005375] origin-left animate-[fillWidth_1s_ease-out_forwards]"
              title="Confirmed"
            ></div>
          </div>
          <div className="w-[25%] h-full">
            <div
              className="bg-[#006994]/40 h-full origin-left animate-[fillWidth_1s_ease-out_0.3s_both]"
              title="Estimated"
            ></div>
          </div>
        </div>
        <div className="flex gap-6 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#006994]"></div> Confirmed
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#006994]/40"></div> Estimated
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "recipes",
    title: "Smart Meals",
    icon: Utensils,
    iconColor: "text-purple-600",
    iconBgActive: "bg-purple-100",
    iconBgInactive: "bg-purple-50",
    heading: "Dinner from the pantry.",
    description:
      "It\u2019s 5 PM. You don\u2019t want to go to the store. We look at what\u2019s in your fridge right now and tell you exactly what you can cook.",
    visual: (
      <div className="border border-slate-200 bg-white shadow-sm overflow-hidden flex mt-8 h-28">
        <div className="w-24 bg-slate-50 flex items-center justify-center border-r border-slate-200 shrink-0">
          <Utensils className="text-slate-300" size={32} />
        </div>
        <div className="p-4 flex-1 flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-slate-900 text-lg">
              Spinach Omelette
            </h4>
            <span className="text-xs font-bold bg-[#006994]/10 text-[#006994] border border-[#006994]/20 px-2 py-1 uppercase tracking-wider animate-[pulseGlow_2s_ease-in-out_infinite]">
              100% Match
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            You have all 5 ingredients ready.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "alerts",
    title: "Waste Prevention",
    icon: Bell,
    iconColor: "text-rose-600",
    iconBgActive: "bg-rose-100",
    iconBgInactive: "bg-rose-50",
    heading: "End the science experiments.",
    description:
      "Food goes bad because you forget it exists. We ping your phone before the spinach turns into liquid.",
    visual: (
      <div className="border border-slate-200 shadow-md bg-white w-full max-w-sm mx-auto overflow-hidden mt-8">
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center gap-2">
          <div className="w-6 h-6 bg-rose-500 flex items-center justify-center animate-[wiggleAlert_2s_infinite] shadow-sm">
            <Bell size={12} className="text-white" />
          </div>
          <span className="text-xs font-bold text-rose-700 uppercase tracking-widest">
            Tracker Alert
          </span>
          <span className="text-xs font-medium text-rose-400 ml-auto">
            Now
          </span>
        </div>
        <div className="p-5">
          <h4 className="font-bold text-slate-900 text-base mb-1.5">
            Items expiring soon
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            Your Fresh Spinach and Milk expire in the next 48 hours. Use them to
            save $8.50.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "prices",
    title: "Price Trends",
    icon: TrendingUp,
    iconColor: "text-amber-600",
    iconBgActive: "bg-amber-100",
    iconBgInactive: "bg-amber-50",
    heading: "Catch the stealth price hikes.",
    description:
      "Milk was $3.50. Now it\u2019s $4.09. We track historical prices on your specific staples so you can actually measure inflation.",
    visual: (
      <div className="border border-slate-200 p-6 bg-white shadow-sm mt-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Organic Whole Milk
            </p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              $4.09
            </p>
          </div>
          <span className="text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1.5 uppercase tracking-wider">
            &uarr; 17% since Oct
          </span>
        </div>
        <div className="h-16 w-full">
          <svg
            viewBox="0 0 200 50"
            className="w-full h-full overflow-visible"
          >
            <path
              d="M 0 40 L 50 35 L 100 20 L 150 25 L 200 5"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeDasharray="300"
              strokeDashoffset="300"
              className="animate-[drawLine_1.5s_ease-out_forwards]"
            />
            <rect
              x="-4"
              y="36"
              width="8"
              height="8"
              fill="#ef4444"
              className="opacity-0 scale-50 animate-[fadeInPoint_0.2s_ease-out_0.2s_forwards]"
            />
            <rect
              x="46"
              y="31"
              width="8"
              height="8"
              fill="#ef4444"
              className="opacity-0 scale-50 animate-[fadeInPoint_0.2s_ease-out_0.5s_forwards]"
            />
            <rect
              x="96"
              y="16"
              width="8"
              height="8"
              fill="#ef4444"
              className="opacity-0 scale-50 animate-[fadeInPoint_0.2s_ease-out_0.8s_forwards]"
            />
            <rect
              x="146"
              y="21"
              width="8"
              height="8"
              fill="#ef4444"
              className="opacity-0 scale-50 animate-[fadeInPoint_0.2s_ease-out_1.1s_forwards]"
            />
            <rect
              x="195"
              y="0"
              width="10"
              height="10"
              fill="#ef4444"
              className="opacity-0 scale-50 animate-[fadeInPoint_0.2s_ease-out_1.4s_forwards] shadow-lg"
            />
          </svg>
        </div>
      </div>
    ),
  },
];

/* ============================== MAIN COMPONENT ============================== */

export default function MarketingLanding() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <div className="min-h-screen bg-white selection:bg-[#006994]/20 font-sans animate-in fade-in duration-700">
      {/* --- Feature Section Animations --- */}
      <style>{`
        @keyframes scanLine {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(120px); opacity: 0; }
        }
        @keyframes fillWidth {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        @keyframes slideRight {
          0% { transform: translateX(-20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes drawLine {
          0% { stroke-dashoffset: 300; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 105, 148, 0.4); transform: scale(1); }
          50% { box-shadow: 0 0 0 6px rgba(0, 105, 148, 0); transform: scale(1.05); }
        }
        @keyframes wiggleAlert {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(-15deg); }
          30% { transform: rotate(15deg); }
          45% { transform: rotate(-15deg); }
          60% { transform: rotate(0deg); }
        }
        @keyframes fadeInPoint {
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ==================== NAVIGATION ==================== */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#006994] flex items-center justify-center">
            <RefreshCw size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Tracker
          </span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
          <a
            href="#features"
            className="hover:text-[#006994] transition-colors"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="hover:text-[#006994] transition-colors"
          >
            Pricing
          </a>
        </div>
        <Link
          href="/login"
          className="bg-gray-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm border border-gray-900"
        >
          Sign In
        </Link>
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="max-w-7xl mx-auto px-6 pt-12 md:pt-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: Text */}
          <div className="text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 text-sm font-medium mb-8 border border-gray-200 shadow-sm">
              <Zap size={16} className="text-[#006994]" /> The unified
              household tracker
            </div>
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
              Stop managing your money and your meals in different apps.
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-xl leading-relaxed">
              You don&rsquo;t need another spreadsheet. You need a system that
              actually knows what&rsquo;s in your fridge, tracks the spending,
              and kills the daily &ldquo;what&rsquo;s for dinner&rdquo;
              argument.
            </p>
            <div className="flex flex-col sm:flex-row justify-start gap-4">
              <Link
                href="/register"
                className="bg-[#006994] text-white px-8 py-4 text-lg font-semibold hover:bg-[#005375] transition-all shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Get Started <ChevronRight size={20} />
              </Link>
            </div>
          </div>

          {/* Right: Bento Box Hero Animation */}
          <div className="relative w-full z-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#006994]/5 blur-3xl -z-10 transform scale-90"></div>
            <HeroAnimation />
          </div>
        </div>
      </section>

      {/* ==================== FEATURE PILLARS ==================== */}
      <section
        id="features"
        className="bg-slate-50 py-24 border-t border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              One input. Everything updates.
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              You take a photo of a receipt. We route the data exactly where it
              belongs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
            {/* Left: Interactive List */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                const isActive = activeFeature === idx;
                return (
                  <button
                    key={feature.id}
                    onClick={() => setActiveFeature(idx)}
                    onMouseEnter={() => setActiveFeature(idx)}
                    className={`group w-full text-left px-5 py-4 flex items-center gap-4 transition-all duration-200 border-l-4 ${isActive
                        ? "bg-white border-[#006994] shadow-sm text-slate-900"
                        : "border-transparent hover:bg-slate-50 text-slate-600"
                      }`}
                  >
                    <div
                      className={`p-2.5 transition-all duration-300 ${isActive
                          ? `${feature.iconBgActive} ${feature.iconColor} shadow-sm scale-110`
                          : `${feature.iconBgInactive} ${feature.iconColor} opacity-60 group-hover:opacity-100 group-hover:scale-105`
                        }`}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="font-bold text-base md:text-lg tracking-tight">
                      {feature.title}
                    </span>
                    {isActive && (
                      <ChevronRight
                        size={20}
                        className="ml-auto text-[#006994]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: Dynamic Detail */}
            <div className="lg:col-span-7">
              {features.map((feature, idx) => (
                <div
                  key={feature.id}
                  className={`bg-white border border-slate-200 shadow-sm p-8 md:p-12 transition-all duration-500 ${activeFeature === idx
                      ? "block animate-in fade-in slide-in-from-right-4"
                      : "hidden"
                    }`}
                >
                  <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">
                    {feature.heading}
                  </h3>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="bg-slate-50 border border-slate-100 p-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Live Preview
                    </p>
                    {feature.visual}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== REALTIME / HOUSEHOLDS ==================== */}
      <section className="py-24 bg-slate-950 text-white overflow-hidden border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Copy */}
          <div>
            <span className="px-2.5 py-1 text-xs font-semibold bg-[#00a2e0]/10 text-[#00a2e0] border border-[#00a2e0]/20 uppercase tracking-wider">
              Multiplayer by default
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-6 mb-6 leading-tight tracking-tight">
              One household. One single source of truth.
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              If your partner scans a receipt at checkout, your phone updates
              before they start the car. No refreshing. No texting to ask who
              bought the milk.
            </p>

            {/* AI Insight Card */}
            <div className="group bg-slate-900 border border-slate-800 hover:border-[#00a2e0]/50 p-6 transition-all duration-300 cursor-pointer hover:-translate-y-1 relative overflow-hidden shadow-lg">
              <div className="flex gap-4 mb-4 relative z-10">
                <div className="bg-slate-800 border border-slate-700 p-2.5 shrink-0 transition-transform duration-300">
                  <MessageSquare className="text-[#00a2e0]" size={20} />
                </div>
                <p className="text-white font-medium self-center text-lg">
                  Stop staring at pie charts.
                </p>
              </div>
              <p className="text-slate-400 text-sm relative z-10 transition-colors leading-relaxed">
                Just ask why the grocery bill spiked this month, or what you
                should cut to save $200. Get a straight answer based on your
                actual purchases.
              </p>
              <div className="mt-4 overflow-hidden h-0 group-hover:h-5 transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center gap-2 text-[#00a2e0] text-xs font-semibold">
                <span>Try it out in the app</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>

          {/* Right: Live Mockup */}
          <div className="relative h-[440px] bg-slate-900 border border-slate-800 shadow-2xl p-6 flex flex-col group">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Home className="text-slate-400" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-100">
                    Smith Household
                  </h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full bg-[#00a2e0] opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 bg-[#006994]"></span>
                    </span>
                    2 Members Online
                  </p>
                </div>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="space-y-3 flex-1 overflow-hidden pr-2">
              {/* Event 1 */}
              <div className="group/item relative bg-slate-950/50 hover:bg-slate-800 border border-slate-800/50 hover:border-slate-700 p-4 transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Camera size={16} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-slate-200">
                        <span className="text-white">Sarah</span> scanned a
                        receipt
                      </p>
                      <span className="text-xs text-slate-500 font-medium">
                        Just now
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      HEB Grocery &bull; $142.50 &bull; 14 items
                    </p>
                  </div>
                </div>
              </div>

              {/* Event 2 */}
              <div className="group/item relative bg-slate-950/50 hover:bg-slate-800 border border-slate-800/50 hover:border-slate-700 p-4 transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                    <ShoppingBag size={16} className="text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-slate-200">
                        <span className="text-white">System</span> updated
                        Pantry
                      </p>
                      <span className="text-xs text-slate-500 font-medium">
                        1m ago
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Added: Organic Milk, Spinach, +12 more
                    </p>
                  </div>
                </div>
              </div>

              {/* Event 3 */}
              <div className="group/item relative bg-slate-950/50 hover:bg-slate-800 border border-slate-800/50 hover:border-slate-700 p-4 transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Utensils size={16} className="text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-slate-200">
                        <span className="text-white">Assistant</span> found new
                        meals
                      </p>
                      <span className="text-xs text-slate-500 font-medium">
                        2m ago
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Spinach &amp; Feta Omelette is a 100% match
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section
        id="pricing"
        className="py-24 bg-white border-t border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              One subscription. The whole house is in.
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              We don&rsquo;t charge per user. You pay once, and everyone under
              your roof gets the app on their phone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="border border-slate-200 p-8 shadow-sm bg-slate-50/50">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Basic
              </h3>
              <p className="text-slate-500 mt-2 font-medium">
                For people who don&rsquo;t mind typing.
              </p>
              <div className="my-6">
                <span className="text-5xl font-black text-slate-900">$0</span>
                <span className="text-slate-500 font-medium">/forever</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <CheckCircle
                    size={20}
                    className="text-slate-300 shrink-0 mt-0.5"
                  />{" "}
                  Manual receipt entry
                </li>
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <CheckCircle
                    size={20}
                    className="text-slate-300 shrink-0 mt-0.5"
                  />{" "}
                  Shared household pantry
                </li>
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <CheckCircle
                    size={20}
                    className="text-slate-300 shrink-0 mt-0.5"
                  />{" "}
                  Basic budget tracking
                </li>
                <li className="flex items-start gap-3 text-slate-400 font-medium line-through">
                  <CheckCircle
                    size={20}
                    className="text-slate-200 shrink-0 mt-0.5"
                  />{" "}
                  AI receipt scanning
                </li>
                <li className="flex items-start gap-3 text-slate-400 font-medium line-through">
                  <CheckCircle
                    size={20}
                    className="text-slate-200 shrink-0 mt-0.5"
                  />{" "}
                  Live bank syncing
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full py-3 font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm text-center"
              >
                Start Free
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="border-2 border-[#006994] p-8 shadow-md relative bg-white transform md:-translate-y-4">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-[#006994] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                Automated
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                Tracker Pro
              </h3>
              <p className="text-slate-500 mt-2 font-medium">
                Kill the data entry entirely.
              </p>
              <div className="my-6">
                <span className="text-5xl font-black text-slate-900">$8</span>
                <span className="text-slate-500 font-medium">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <CheckCircle
                    size={20}
                    className="text-[#006994] shrink-0 mt-0.5"
                  />{" "}
                  Unlimited AI receipt scans
                </li>
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <CheckCircle
                    size={20}
                    className="text-[#006994] shrink-0 mt-0.5"
                  />{" "}
                  Live bank account sync (Plaid)
                </li>
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <CheckCircle
                    size={20}
                    className="text-[#006994] shrink-0 mt-0.5"
                  />{" "}
                  Smart recipe matching
                </li>
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <CheckCircle
                    size={20}
                    className="text-[#006994] shrink-0 mt-0.5"
                  />{" "}
                  Expiry push notifications
                </li>
                <li className="flex items-start gap-3 text-slate-700 font-medium">
                  <CheckCircle
                    size={20}
                    className="text-[#006994] shrink-0 mt-0.5"
                  />{" "}
                  Ask the AI assistant anything
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full py-3 font-bold text-white bg-[#006994] hover:bg-[#005375] transition-colors shadow-sm text-center"
              >
                Start 14-Day Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA & APP DOWNLOAD ==================== */}
      <section className="bg-slate-50 py-24 border-t border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: CTA */}
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
              Stop guessing. Start tracking.
            </h2>
            <p className="text-xl text-slate-600 mb-8 max-w-xl leading-relaxed">
              Get your grocery list, pantry, and budget on the exact same page.
              Start your household on the web, or grab the mobile app for
              scanning on the go.
            </p>
            <Link
              href="/dashboard"
              className="bg-[#006994] text-white px-8 py-4 text-lg font-semibold hover:bg-[#005375] transition-all shadow-sm inline-flex items-center gap-2"
            >
              Open Web Dashboard <ChevronRight size={20} />
            </Link>
          </div>

          {/* Right: Mobile Download */}
          <div className="bg-white p-8 md:p-10 border border-slate-200 shadow-md flex flex-col sm:flex-row items-center gap-8 relative z-10">
            {/* Mock QR Code */}
            <div className="shrink-0 p-3 bg-white border-2 border-dashed border-slate-300">
              <div className="w-32 h-32 grid grid-cols-4 grid-rows-4 gap-1.5 p-1.5">
                <div className="col-span-2 row-span-2 border-[5px] border-slate-900 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-slate-900"></div>
                </div>
                <div className="col-start-4 row-start-1 bg-slate-900"></div>
                <div className="col-start-4 row-start-2 border-4 border-slate-900"></div>
                <div className="row-start-3 col-span-2 row-span-2 border-[5px] border-slate-900 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-slate-900"></div>
                </div>
                <div className="col-start-3 row-start-3 bg-slate-900"></div>
                <div className="col-start-4 row-start-3 bg-slate-900"></div>
                <div className="col-start-3 row-start-4 border-4 border-[#006994]"></div>
                <div className="col-start-4 row-start-4 bg-slate-900"></div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                Scan to download
              </h3>
              <p className="text-sm text-slate-600 font-medium mb-6">
                Get the companion app for iOS and Android. Receipts scan best on
                your phone.
              </p>
              <div className="flex flex-col gap-3">
                <button className="flex items-center justify-center gap-2 w-full px-6 py-2.5 bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
                  Download for iOS
                </button>
                <button className="flex items-center justify-center gap-2 w-full px-6 py-2.5 bg-slate-100 text-slate-900 text-sm font-bold hover:bg-slate-200 transition-colors border border-slate-200">
                  Download for Android
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-slate-950 text-slate-400 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#006994] flex items-center justify-center">
                <RefreshCw size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Tracker
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Household inventory and personal finance, finally talking to each
              other.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 tracking-tight">
              Product
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-white transition-colors"
                >
                  Smart Scanning
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/pantry"
                  className="hover:text-white transition-colors"
                >
                  Smart Pantry
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/budget"
                  className="hover:text-white transition-colors"
                >
                  Budget Pulse
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/recipes"
                  className="hover:text-white transition-colors"
                >
                  Pantry Recipes
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 tracking-tight">
              Resources
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="#pricing"
                  className="hover:text-white transition-colors"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Security &amp; Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  API Documentation
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  System Architecture
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 tracking-tight">
              Company
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} Tracker Inc. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Twitter
            </a>
            <a href="#" className="hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
