import React, { useState, useEffect } from 'react';
import { 
  Camera, ShoppingBag, PieChart, Target, Utensils, Home, 
  MessageSquare, UploadCloud, ChevronRight, Zap, RefreshCw, 
  AlertCircle, Info, CheckCircle, Bell, User, Search, Play,
  TrendingUp, LineChart, Landmark, Link2, FileText
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_INSIGHTS = [
  { id: 1, type: 'warning', title: 'Budget running hot', body: '$480 of $600 spent (80%). At this pace you\'ll hit $720 by month-end.' },
  { id: 2, type: 'tip', title: '$340 surplus this month', body: 'You have $340 left over. Consider allocating it toward your Camry goal.' },
  { id: 3, type: 'warning', title: '2 items expiring soon', body: 'Worth $8.50 — use your Milk and Spinach before they go to waste.' }
];

const MOCK_PANTRY = [
  { id: 1, name: 'Organic Whole Milk', location: 'FRIDGE', daysLeft: 2, price: 4.50, category: 'Dairy' },
  { id: 2, name: 'Fresh Spinach', location: 'FRIDGE', daysLeft: 1, price: 3.99, category: 'Produce' },
  { id: 3, name: 'Chicken Breast', location: 'FREEZER', daysLeft: 45, price: 12.00, category: 'Meat' },
  { id: 4, name: 'Jasmine Rice', location: 'PANTRY', daysLeft: 180, price: 8.99, category: 'Pantry' },
];

const MOCK_RECIPES = [
  { id: 1, name: 'Egg Fried Rice', match: 85, time: 15, missing: ['Carrots', 'Peas'] },
  { id: 2, name: 'Spinach & Feta Omelette', match: 100, time: 10, missing: [] },
  { id: 3, name: 'Chicken Stir Fry', match: 60, time: 25, missing: ['Bell Pepper', 'Soy Sauce', 'Broccoli'] },
];

const MOCK_GOALS = [
  { id: 1, name: 'Toyota Camry Downpayment', target: 5000, saved: 1200, monthly: 400, cashMonths: 10, insight: 'If you reduce dining out by $60/mo, you reach this 2 months sooner.' }
];

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'warning', title: 'Milk expires tomorrow!', time: '10m ago', read: false },
  { id: 2, type: 'info', title: 'Sarah scanned a receipt', time: '1h ago', read: false },
  { id: 3, type: 'alert', title: 'Budget running hot', time: '2h ago', read: true },
];

const MOCK_TRANSACTIONS = [
  { id: 1, date: 'Feb 24', desc: 'Netflix', amount: 15.99, isIncome: false, type: 'subscription', category: 'Entertainment' },
  { id: 2, date: 'Feb 22', desc: 'HEB Grocery', amount: 142.50, isIncome: false, type: 'matched', category: 'Groceries' },
  { id: 3, date: 'Feb 20', desc: 'Shell Station', amount: 45.00, isIncome: false, type: 'unmatched', category: 'Transport' },
  { id: 4, date: 'Feb 15', desc: 'Acme Corp Payroll', amount: 3200.00, isIncome: true, type: 'income', category: 'Income' },
];

// --- COMPONENTS ---

const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    red: 'bg-red-100 text-red-800 border-red-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    green: 'bg-[#006994]/10 text-[#006994] border-[#006994]/20',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
};

// --- CUSTOM HERO ANIMATION COMPONENT (BENTO BOX DATA PIPELINE) ---
const HeroAnimation = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 8);
    }, 2500); // 2.5 seconds per step, 8 steps total
    return () => clearInterval(timer);
  }, []);

  const isScen1 = tick < 4;
  const step = tick % 4; // 0, 1, 2, 3

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
                <h3 className={`absolute text-lg md:text-xl font-bold text-white tracking-tight transition-all duration-500 ${isScen1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    The Grocery Run
                </h3>
                <h3 className={`absolute text-lg md:text-xl font-bold text-white tracking-tight transition-all duration-500 ${!isScen1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    The Monthly Audit
                </h3>
            </div>
        </div>

        {/* Grid Wrapper (Ensures perfect center alignment) */}
        <div className="relative flex-1 w-full">
            {/* Center Hub Logo */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#006994] border-4 border-slate-900 z-20 flex items-center justify-center shadow-2xl">
                <Zap className={`text-white transition-transform duration-700 ${step > 0 ? 'scale-110' : 'scale-90'}`} size={20} />
            </div>

            {/* 2x2 Bento Grid */}
            <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full w-full bg-slate-800">
                
                {/* --- PANEL 1: Top Left --- */}
                <div className={`bg-slate-950 p-4 relative transition-colors duration-500 flex flex-col ${step === 0 ? 'border border-[#00a2e0] shadow-[inset_0_0_20px_rgba(0,162,224,0.15)]' : 'border border-transparent'}`}>
                    <div className="flex justify-between items-center mb-2 z-20">
                        <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                            {isScen1 ? 'Receipt Scan' : 'Statement Import'}
                        </span>
                        {isScen1 ? <Camera size={14} className={step === 0 ? 'text-[#00a2e0]' : 'text-slate-700'} /> : <FileText size={14} className={step === 0 ? 'text-[#00a2e0]' : 'text-slate-700'} />}
                    </div>
                    <div className="relative flex-1 w-full">
                        {/* Scenario 1: Receipt */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${isScen1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className={`w-[90%] max-w-[140px] bg-white border border-slate-200 p-3 shadow-lg transition-opacity duration-300 ${step === 0 ? 'opacity-100' : 'opacity-40'}`}>
                                <div className="border-b border-slate-200 pb-2 mb-2 flex justify-between items-center">
                                   <span className="font-bold text-slate-800 text-xs truncate">HEB Grocery</span>
                                </div>
                                <div className="space-y-2 relative text-[10px] text-slate-600 font-medium h-16">
                                    {step === 0 && <div className="absolute left-0 right-0 h-0.5 bg-[#00a2e0] shadow-[0_0_8px_2px_rgba(0,162,224,0.6)] z-20 animate-[scanLine_2.5s_ease-in-out_infinite]"></div>}
                                    <div className="flex justify-between"><span>Organic Milk</span><span>$4.50</span></div>
                                    <div className="flex justify-between"><span>Fresh Spinach</span><span>$3.99</span></div>
                                    <div className="flex justify-between"><span>Jasmine Rice</span><span>$8.99</span></div>
                                </div>
                            </div>
                        </div>
                        {/* Scenario 2: Bank Statement */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${!isScen1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className={`w-[90%] max-w-[150px] bg-white p-3 border border-slate-200 transition-opacity duration-300 ${step === 0 ? 'opacity-100' : 'opacity-40'}`}>
                               <div className="border-b border-slate-200 pb-1 mb-2 flex items-center gap-2">
                                 <FileText size={10} className="text-indigo-600 shrink-0" />
                                 <span className="font-bold text-slate-800 text-[10px] uppercase truncate">chase_stmt.pdf</span>
                               </div>
                               <div className="space-y-2 relative h-16 overflow-hidden pt-1">
                                  {step === 0 && <div className="absolute top-0 left-0 w-full h-4 bg-indigo-500/20 border border-indigo-500/50 z-10 animate-[highlightDown_2.5s_ease-in-out_infinite]"></div>}
                                  <div className="flex justify-between text-[9px] font-bold text-slate-500"><span>TARGET T-0922</span><span>$45.00</span></div>
                                  <div className="flex justify-between text-[9px] font-bold text-slate-500"><span>NETFLIX.COM</span><span>$15.99</span></div>
                                  <div className="flex justify-between text-[9px] font-bold text-slate-500"><span>SHELL OIL 12</span><span>$32.50</span></div>
                               </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- PANEL 2: Top Right --- */}
                <div className={`bg-slate-950 p-4 relative transition-colors duration-500 flex flex-col ${step === 1 ? (isScen1 ? 'border border-orange-500 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]' : 'border border-rose-500 shadow-[inset_0_0_20px_rgba(243,64,111,0.1)]') : 'border border-transparent'}`}>
                    <div className="flex justify-between items-center mb-2 z-20">
                        <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                            {isScen1 ? 'Smart Pantry' : 'Subscriptions'}
                        </span>
                        {isScen1 ? <ShoppingBag size={14} className={step === 1 ? 'text-orange-500' : 'text-slate-700'} /> : <Zap size={14} className={step === 1 ? 'text-rose-500' : 'text-slate-700'} />}
                    </div>
                    <div className="relative flex-1 w-full">
                        {/* Scenario 1: Pantry Scroll */}
                        <div className={`absolute inset-0 flex flex-col justify-center overflow-hidden transition-opacity duration-500 ${isScen1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className="relative w-full h-[84px] border border-slate-800 bg-slate-900 overflow-hidden">
                              <div className={`space-y-2 absolute left-2 right-2 top-2 transition-transform duration-1000 ease-in-out ${step >= 1 ? 'animate-[scrollUp_3s_linear_forwards]' : ''}`}>
                                 <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                    <span className="text-xs font-bold text-white truncate mr-2">Organic Milk</span>
                                    <span className="text-[9px] font-bold bg-[#00a2e0]/20 text-[#00a2e0] border border-[#00a2e0]/30 px-1 uppercase tracking-wider shrink-0">Fridge</span>
                                 </div>
                                 <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                    <span className="text-xs font-bold text-white truncate mr-2">Fresh Spinach</span>
                                    <span className="text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1 uppercase tracking-wider shrink-0">4 Days</span>
                                 </div>
                                 <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                    <span className="text-xs font-bold text-white truncate mr-2">Jasmine Rice</span>
                                    <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 uppercase tracking-wider shrink-0">Pantry</span>
                                 </div>
                                 <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                    <span className="text-xs font-bold text-white truncate mr-2">Coffee Beans</span>
                                    <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 uppercase tracking-wider shrink-0">Pantry</span>
                                 </div>
                              </div>
                            </div>
                        </div>
                        {/* Scenario 2: Found Subscriptions */}
                        <div className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${!isScen1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className="space-y-3 w-full">
                               <div className={`bg-slate-900 border border-slate-800 p-3 flex justify-between items-center transition-all ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                                  <div className="flex items-center gap-3">
                                     <div className="w-6 h-6 bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0"><Play size={10}/></div>
                                     <span className="text-sm font-bold text-white">Netflix</span>
                                  </div>
                                  <span className="text-xs font-bold text-slate-400">$15.99</span>
                               </div>
                               {step >= 1 && (
                                 <div className="flex justify-start animate-[slideIn_0.3s_ease-out]">
                                    <span className="text-[10px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-1 uppercase tracking-wider flex items-center gap-1.5"><AlertCircle size={10}/> Recurring</span>
                                 </div>
                               )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- PANEL 3: Bottom Left --- */}
                <div className={`bg-slate-950 p-4 relative transition-colors duration-500 flex flex-col ${step === 2 ? (isScen1 ? 'border border-emerald-500 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]' : 'border border-purple-500 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]') : 'border border-transparent'}`}>
                    <div className="flex justify-between items-center mb-2 z-20">
                        <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                            {isScen1 ? 'Shopping List' : 'Spending Habits'}
                        </span>
                        {isScen1 ? <CheckCircle size={14} className={step === 2 ? 'text-emerald-500' : 'text-slate-700'} /> : <PieChart size={14} className={step === 2 ? 'text-purple-500' : 'text-slate-700'} />}
                    </div>
                    <div className="relative flex-1 w-full">
                        {/* Scenario 1: Shopping List Cross-off */}
                        <div className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${isScen1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className="space-y-4 w-full bg-slate-900 border border-slate-800 p-4">
                              <div className="flex items-center gap-3 relative">
                                <div className="w-4 h-4 border border-emerald-500 bg-emerald-500/20 flex items-center justify-center shrink-0"><CheckCircle size={10} className="text-emerald-500" /></div>
                                <span className="text-sm font-bold text-slate-500 truncate">Organic Milk</span>
                                <div className={`absolute left-8 right-2 h-0.5 bg-slate-500 top-1/2 origin-left ${step >= 2 && isScen1 ? 'animate-[strike_0.4s_ease-out_forwards]' : 'scale-x-0'}`}></div>
                              </div>
                              <div className="flex items-center gap-3 relative">
                                <div className="w-4 h-4 border border-emerald-500 bg-emerald-500/20 flex items-center justify-center shrink-0"><CheckCircle size={10} className="text-emerald-500" /></div>
                                <span className="text-sm font-bold text-slate-500 truncate">Fresh Spinach</span>
                                <div className={`absolute left-8 right-2 h-0.5 bg-slate-500 top-1/2 origin-left ${step >= 2 && isScen1 ? 'animate-[strike_0.4s_ease-out_0.2s_forwards]' : 'scale-x-0'}`}></div>
                              </div>
                              <div className="flex items-center gap-3 relative">
                                <div className="w-4 h-4 border border-slate-600 shrink-0"></div>
                                <span className="text-sm font-bold text-white truncate">Paper Towels</span>
                              </div>
                            </div>
                        </div>
                        {/* Scenario 2: Category Breakdown */}
                        <div className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${!isScen1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className="w-full space-y-4">
                               <div>
                                 <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5"><span>Groceries</span><span className="text-white">$480</span></div>
                                 <div className="w-full h-2 bg-slate-800"><div className={`h-full bg-emerald-500 origin-left ${step >= 2 && !isScen1 ? 'animate-[fillWidth_1s_ease-out_forwards]' : 'scale-x-0'}`} style={{width: '70%'}}></div></div>
                               </div>
                               <div>
                                 <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5"><span>Leisure</span><span className="text-white">$120</span></div>
                                 <div className="w-full h-2 bg-slate-800"><div className={`h-full bg-purple-500 origin-left ${step >= 2 && !isScen1 ? 'animate-[fillWidth_1s_ease-out_0.2s_forwards]' : 'scale-x-0'}`} style={{width: '30%'}}></div></div>
                               </div>
                               <div>
                                 <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5"><span>Transport</span><span className="text-white">$80</span></div>
                                 <div className="w-full h-2 bg-slate-800"><div className={`h-full bg-blue-500 origin-left ${step >= 2 && !isScen1 ? 'animate-[fillWidth_1s_ease-out_0.4s_forwards]' : 'scale-x-0'}`} style={{width: '20%'}}></div></div>
                               </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- PANEL 4: Bottom Right --- */}
                <div className={`bg-slate-950 p-4 relative transition-colors duration-500 flex flex-col ${step === 3 ? (isScen1 ? 'border border-[#006994] shadow-[inset_0_0_20px_rgba(0,105,148,0.2)]' : 'border border-[#00a2e0] shadow-[inset_0_0_20px_rgba(0,162,224,0.2)]') : 'border border-transparent'}`}>
                    <div className="flex justify-between items-center mb-2 z-20">
                        <span className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest">
                            {isScen1 ? 'Budget Impact' : 'Family Spending'}
                        </span>
                        {isScen1 ? <PieChart size={14} className={step === 3 ? 'text-[#006994]' : 'text-slate-700'} /> : <User size={14} className={step === 3 ? 'text-[#00a2e0]' : 'text-slate-700'} />}
                    </div>
                    <div className="relative flex-1 w-full">
                        {/* Scenario 1: Budget Pulse */}
                        <div className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${isScen1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Groceries</span>
                                <span className={`text-xl md:text-2xl font-black transition-colors ${step >= 3 ? 'text-white' : 'text-slate-600'}`}>
                                    {step >= 3 ? '$480' : '$337'} <span className="text-[10px] md:text-xs text-slate-500 font-medium">spent</span>
                                </span>
                            </div>
                            <div className="h-3 w-full bg-slate-800 mb-4">
                                <div className={`h-full bg-[#006994] origin-left ${step >= 3 && isScen1 ? 'animate-[fillWidth_1s_ease-out_forwards]' : 'scale-x-0'}`} style={{width: '80%'}}></div>
                            </div>
                            {step >= 3 && (
                                <div className="bg-[#006994]/20 border border-[#006994]/40 p-2 md:p-3 text-[10px] md:text-xs text-[#00a2e0] font-bold animate-[slideIn_0.4s_ease-out]">
                                    💡 Remaining balance: $120
                                </div>
                            )}
                        </div>
                        {/* Scenario 2: Household Sync */}
                        <div className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-500 ${!isScen1 ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className="w-full flex justify-between items-center relative">
                               {/* Sync Line */}
                               <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700 -z-10"></div>
                               {step >= 3 && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-slate-950 border border-slate-600 flex items-center justify-center animate-spin z-0"><RefreshCw size={10} className="text-[#00a2e0]" /></div>}

                               <div className={`bg-slate-900 border border-slate-700 p-2 md:p-3 w-[45%] text-center transition-all ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                                  <div className="w-6 h-6 md:w-8 md:h-8 bg-emerald-500/20 mx-auto mb-2 flex items-center justify-center"><User size={14} className="text-emerald-500" /></div>
                                  <span className="text-[9px] md:text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1">Sarah</span>
                                  <span className="text-xs md:text-sm text-white font-bold">$640</span>
                               </div>

                               <div className={`bg-slate-900 border border-slate-700 p-2 md:p-3 w-[45%] text-center transition-all delay-200 ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                                  <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500/20 mx-auto mb-2 flex items-center justify-center"><User size={14} className="text-blue-500" /></div>
                                  <span className="text-[9px] md:text-[10px] font-bold text-slate-400 block uppercase tracking-widest mb-1">Mike</span>
                                  <span className="text-xs md:text-sm text-white font-bold">$320</span>
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

// --- APP PAGES ---
const DashboardPage = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <h1 className="text-2xl font-bold text-gray-900">Household Overview</h1>
    
    {/* Insights Row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {MOCK_INSIGHTS.map(insight => (
        <div key={insight.id} className={`p-4 border ${insight.type === 'warning' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            {insight.type === 'warning' ? <AlertCircle size={18} className="text-red-600" /> : <Zap size={18} className="text-blue-600" />}
            <h3 className={`font-semibold ${insight.type === 'warning' ? 'text-red-900' : 'text-blue-900'}`}>{insight.title}</h3>
          </div>
          <p className={`text-sm ${insight.type === 'warning' ? 'text-red-800' : 'text-blue-800'}`}>{insight.body}</p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Budget Summary Mini */}
      <div className="bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Budget Pulse</h2>
          <span className="text-sm font-medium text-gray-500">12 Days Left</span>
        </div>
        <div className="mb-2 flex justify-between items-end">
          <div>
            <span className="text-3xl font-bold text-gray-900">$480</span>
            <span className="text-gray-500"> / $600</span>
          </div>
          <Badge color="orange">Running Hot</Badge>
        </div>
        {/* Dual Source Progress Bar */}
        <div className="h-4 w-full bg-gray-100 overflow-hidden flex mt-4">
          <div className="bg-[#006994] h-full" style={{ width: '55%' }} title="Confirmed (Receipts)"></div>
          <div className="bg-[#006994]/40 h-full" style={{ width: '25%' }} title="Estimated (Bank)"></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#006994]"></div> Confirmed ($330)</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#006994]/40"></div> Estimated ($150)</div>
        </div>
      </div>

      {/* Eat Me First Mini */}
      <div className="bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Eat Me First</h2>
          <button className="text-[#006994] text-sm font-medium hover:underline">View Pantry</button>
        </div>
        <div className="space-y-3">
          {MOCK_PANTRY.filter(p => p.daysLeft <= 3).map(item => (
            <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 border-l-4 border-orange-400">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.location}</p>
              </div>
              <Badge color={item.daysLeft <= 1 ? 'red' : 'orange'}>
                {item.daysLeft} {item.daysLeft === 1 ? 'day' : 'days'} left
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ScannerPage = () => (
  <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Smart Document Scanner</h1>
      <p className="text-gray-500">Upload a receipt or bank statement. We'll extract the details and update everything automatically.</p>
    </div>
    
    <div className="border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center hover:bg-gray-100 hover:border-[#006994]/50 transition-colors cursor-pointer">
      <div className="w-16 h-16 bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
        <UploadCloud className="text-[#006994]" size={32} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Click to upload or drag & drop</h3>
      <p className="text-sm text-gray-500 mb-6">Upload a photo, PDF, or spreadsheet</p>
      <div className="flex justify-center gap-4">
        <button className="bg-[#006994] text-white px-6 py-2.5 font-medium hover:bg-[#005375] transition-colors flex items-center gap-2">
          <Camera size={18} /> Use Camera
        </button>
      </div>
    </div>

    <div className="mt-8 bg-blue-50 border border-blue-100 p-4 flex gap-3">
      <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
      <div className="text-sm text-blue-900">
        <strong>How it works:</strong> Our smart scanner reads your document in seconds. You'll always have a chance to review and edit extracted items before they are added to your budget and pantry.
      </div>
    </div>
  </div>
);

const PantryPage = () => {
  const [filter, setFilter] = useState('ALL');
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Pantry</h1>
          <p className="text-gray-500">Know what you have, waste less.</p>
        </div>
        <button className="bg-[#006994] text-white px-4 py-2 font-medium hover:bg-[#005375] flex items-center gap-2">
          + Add Item
        </button>
      </div>

      <div className="flex gap-2">
        {['ALL', 'FRIDGE', 'FREEZER', 'PANTRY'].map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {f === 'ALL' ? 'All Items' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_PANTRY.filter(i => filter === 'ALL' || i.location === filter).map(item => (
          <div key={item.id} className="bg-white border border-gray-200 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <span className="text-xs text-gray-500">{item.category} • {item.location}</span>
              </div>
              <Badge color={item.daysLeft <= 2 ? 'red' : item.daysLeft <= 7 ? 'orange' : 'green'}>
                {item.daysLeft}d left
              </Badge>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-900">${item.price.toFixed(2)}</span>
              <div className="flex gap-2">
                <button className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 hover:bg-red-100 transition">Trash</button>
                <button className="text-xs font-medium text-[#006994] bg-[#006994]/10 px-2 py-1 hover:bg-[#006994]/20 transition">Consume</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BudgetPage = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Budget Pulse</h1>
      <p className="text-gray-500">Combined tracking: Receipts + Bank Statements</p>
    </div>

    <div className="bg-white p-8 shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Spent</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-gray-900">$480.00</span>
            <span className="text-xl text-gray-400 font-medium">/ $600.00</span>
          </div>
        </div>
        <div className="text-right">
          <Badge color="orange">Over daily pace</Badge>
          <p className="text-sm text-gray-500 mt-2">Expected pace: $400 by today</p>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-gray-700">Monthly Limit</span>
          <span className="text-gray-900">80% Used</span>
        </div>
        <div className="h-6 w-full bg-gray-100 overflow-hidden flex">
          <div className="bg-[#006994] h-full flex items-center px-3 text-white text-xs font-bold" style={{ width: '55%' }}>Confirmed</div>
          <div className="bg-[#006994]/60 h-full flex items-center px-3 text-white text-xs font-bold" style={{ width: '25%' }}>Est.</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-[#006994]"></div>
            <h4 className="font-semibold text-gray-900">Receipt Confirmed</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900">$330.00</p>
          <p className="text-sm text-gray-500">Exact items from receipts</p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-[#006994]/60"></div>
            <h4 className="font-semibold text-gray-900">Bank Estimated</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900">$150.00</p>
          <p className="text-sm text-gray-500">From your bank statements</p>
        </div>
      </div>
    </div>

    {/* Price & Inflation Tracker */}
    <div className="bg-white p-8 shadow-sm border border-gray-200 mt-6 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-[#006994]" size={24} /> 
            Price Tracker
          </h2>
          <p className="text-sm text-gray-500 mt-1">Watch how prices change over time automatically.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input type="text" defaultValue="Organic Whole Milk" className="w-full pl-10 pr-4 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#006994]" />
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-100 p-6 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Price</p>
              <p className="text-4xl font-black text-gray-900">$4.09</p>
            </div>
            <div className="text-right">
              <Badge color="red">↑ 17.2% since Oct</Badge>
              <p className="text-xs text-gray-500 mt-2">Last bought: 2 days ago</p>
            </div>
          </div>
          
          {/* Simple Mock Sparkline */}
          <div className="relative mt-6">
            <div className="h-24 w-full px-2">
              <svg viewBox="0 0 400 100" className="w-full h-full preserve-3d overflow-visible">
                <path d="M 0 80 L 100 70 L 200 40 L 300 50 L 400 10" fill="none" stroke="#006994" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" />
                <rect x="-6" y="74" width="12" height="12" fill="#006994" className="hover:scale-125 transition-transform cursor-pointer origin-center" />
                <rect x="94" y="64" width="12" height="12" fill="#006994" className="hover:scale-125 transition-transform cursor-pointer origin-center" />
                <rect x="194" y="34" width="12" height="12" fill="#006994" className="hover:scale-125 transition-transform cursor-pointer origin-center" />
                <rect x="294" y="44" width="12" height="12" fill="#006994" className="hover:scale-125 transition-transform cursor-pointer origin-center" />
                <rect x="392" y="2" width="16" height="16" fill="#006994" className="animate-pulse cursor-pointer shadow-lg origin-center" />
              </svg>
            </div>
            <div className="flex justify-between items-center text-xs font-medium text-gray-400 mt-4 px-2">
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
              <span>Jan</span>
              <span>Feb</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BankPage = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bank & Transactions</h1>
        <p className="text-gray-500">Auto-categorized and reconciled with your receipts.</p>
      </div>
      <button className="bg-[#006994] text-white px-4 py-2 font-medium hover:bg-[#005375] flex items-center gap-2">
        <UploadCloud size={18} /> Upload Statement
      </button>
    </div>

    {/* Stats Row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-5 border border-gray-200 shadow-sm">
        <p className="text-sm font-semibold text-gray-500 mb-1">Income (Feb)</p>
        <p className="text-2xl font-bold text-gray-900">+$3,200.00</p>
      </div>
      <div className="bg-white p-5 border border-gray-200 shadow-sm">
        <p className="text-sm font-semibold text-gray-500 mb-1">Expenses</p>
        <p className="text-2xl font-bold text-gray-900">-$203.49</p>
      </div>
      <div className="bg-white p-5 border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
        <p className="text-sm font-semibold text-gray-500 mb-1">Active Subscriptions</p>
        <div className="flex items-center gap-2">
           <p className="text-2xl font-bold text-gray-900">1</p>
           <span className="text-sm text-gray-500 font-medium">($15.99/mo)</span>
        </div>
      </div>
    </div>

    {/* Transactions List */}
    <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
        <div className="flex gap-2">
          <Badge color="green">Matched to Receipt</Badge>
          <Badge color="blue">Subscription</Badge>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {MOCK_TRANSACTIONS.map(tx => (
          <div key={tx.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${
                tx.isIncome ? 'bg-[#006994]/10 text-[#006994]' : 'bg-gray-100 text-gray-600'
              }`}>
                {tx.isIncome ? <TrendingUp size={18} /> : <FileText size={18} />}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{tx.desc}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-gray-500">{tx.date} • {tx.category}</span>
                  {tx.type === 'matched' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#006994]/10 text-[#006994] px-1.5 py-0.5">
                      <Link2 size={10} /> Receipt Matched
                    </span>
                  )}
                  {tx.type === 'subscription' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-1.5 py-0.5">
                      <RefreshCw size={10} /> Recurring
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className={`text-right font-bold ${tx.isIncome ? 'text-[#006994]' : 'text-gray-900'}`}>
              {tx.isIncome ? '+' : '-'}${tx.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const GoalsPage = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Goals</h1>
        <p className="text-gray-500">Plan every purchase before it happens.</p>
      </div>
      <button className="bg-[#006994] text-white px-4 py-2 font-medium hover:bg-[#005375]">+ Add Goal</button>
    </div>

    {MOCK_GOALS.map(goal => (
      <div key={goal.id} className="bg-white border border-gray-200 p-6 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{goal.name}</h2>
            <p className="text-gray-500 font-medium">${goal.saved.toLocaleString()} saved of ${goal.target.toLocaleString()}</p>
          </div>
          <div className="bg-gray-100 text-gray-800 px-3 py-1 text-sm font-semibold">
            ${goal.monthly}/mo contribution
          </div>
        </div>

        <div className="h-3 w-full bg-gray-100 overflow-hidden mb-6">
          <div className="bg-blue-600 h-full" style={{ width: `${(goal.saved / goal.target) * 100}%` }}></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-100 p-4">
            <h4 className="text-blue-900 font-semibold mb-2 flex items-center gap-2"><div className="w-2 h-2 bg-blue-600"></div> Cash Strategy</h4>
            <p className="text-3xl font-bold text-blue-900 mb-1">{goal.cashMonths} <span className="text-lg font-medium text-blue-700">months away</span></p>
            <p className="text-sm text-blue-800">Target completion: Dec 2026</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-4">
            <h4 className="text-gray-900 font-semibold mb-2 flex items-center gap-2"><div className="w-2 h-2 bg-gray-600"></div> Finance Strategy (5% Interest)</h4>
            <p className="text-3xl font-bold text-gray-900 mb-1">$432 <span className="text-lg font-medium text-gray-500">/mo payment</span></p>
            <p className="text-sm text-gray-500">Total interest cost: $840</p>
          </div>
        </div>

        <div className="mt-4 flex gap-3 items-start bg-[#006994]/10 p-4 border border-[#006994]/20">
          <Zap className="text-[#006994] shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-[#003d57] leading-relaxed"><strong>Smart Tip:</strong> {goal.insight}</p>
        </div>
      </div>
    ))}
  </div>
);

const RecipesPage = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pantry-Aware Recipes</h1>
        <p className="text-gray-500">Meals prioritized by what's expiring in your fridge.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input type="text" placeholder="Search recipes..." className="pl-10 pr-4 py-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#006994]" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {MOCK_RECIPES.map(recipe => (
        <div key={recipe.id} className="bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="h-32 bg-gray-100 relative">
            {/* Placeholder for recipe image */}
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <Utensils size={48} />
            </div>
            <div className="absolute top-3 right-3 bg-white px-2.5 py-1 text-xs font-bold shadow-sm flex items-center gap-1">
              <span className={`w-2 h-2 ${recipe.match >= 80 ? 'bg-[#006994]' : recipe.match >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
              {recipe.match}% Match
            </div>
          </div>
          <div className="p-5">
            <h3 className="font-bold text-lg text-gray-900 mb-1">{recipe.name}</h3>
            <p className="text-sm text-gray-500 mb-4 flex items-center gap-1"><Play size={14}/> {recipe.time} mins prep</p>
            
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Missing Ingredients</p>
              {recipe.missing.length === 0 ? (
                <p className="text-sm text-[#006994] font-medium flex items-center gap-1"><CheckCircle size={14}/> You have everything!</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {recipe.missing.map((m, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 border border-red-100">{m}</span>
                  ))}
                </div>
              )}
            </div>
            <button className="w-full mt-6 bg-gray-900 text-white py-2 text-sm font-medium hover:bg-gray-800 transition-colors">
              View Instructions
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- MARKETING LANDING PAGE ---
const MarketingLanding = ({ onLaunchApp }) => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: 'scan',
      title: 'No manual entry',
      icon: UploadCloud,
      iconColor: 'text-blue-600',
      iconBgActive: 'bg-blue-100',
      iconBgInactive: 'bg-blue-50',
      heading: 'Snap a receipt. We do the rest.',
      description: 'Take a picture of the grocery run. We pull the items, map the costs, and organize your kitchen inventory while you unpack.',
      visual: (
        <div className="flex flex-col gap-3 mt-8 relative">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#006994] z-10 animate-[scanLine_2s_linear_infinite] shadow-[0_4px_10px_rgba(0,105,148,0.5)]"></div>
          <div className="bg-slate-50 border border-slate-200 p-3 flex justify-between items-center opacity-60">
            <span className="font-mono text-xs text-slate-500 uppercase">HEB W-Milk 1Gal ................. $4.50</span>
          </div>
          <div className="flex justify-center"><ChevronRight className="text-[#006994] rotate-90" size={20} /></div>
          <div className="bg-white border border-[#006994]/30 shadow-md p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#006994]/5 animate-pulse"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <h4 className="font-semibold text-slate-900">Organic Whole Milk</h4>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium mt-1 inline-block">Dairy • Fridge</span>
              </div>
              <span className="font-semibold text-slate-900 bg-[#006994]/10 text-[#006994] px-2 py-1 text-sm">$4.50</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pantry',
      title: 'Kitchen Inventory',
      icon: ShoppingBag,
      iconColor: 'text-orange-600',
      iconBgActive: 'bg-orange-100',
      iconBgInactive: 'bg-orange-50',
      heading: 'Stop buying duplicates.',
      description: 'You probably already have three jars of paprika. Check the app before you hit the aisles and stop throwing away money on things you own.',
      visual: (
        <div className="space-y-3 mt-8">
          <div className="border border-red-200 bg-red-50 p-4 flex justify-between items-center animate-[slideRight_0.4s_ease-out_forwards]">
            <span className="font-semibold text-slate-900">Fresh Spinach</span>
            <span className="text-xs font-bold bg-red-100 text-red-800 px-2.5 py-1 border border-red-200 uppercase tracking-wider animate-pulse">Expires Today</span>
          </div>
          <div className="border border-amber-200 bg-amber-50 p-4 flex justify-between items-center opacity-0 animate-[slideRight_0.4s_ease-out_0.2s_forwards]">
            <span className="font-semibold text-slate-900">Whole Milk</span>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 border border-amber-200 uppercase tracking-wider">2 days left</span>
          </div>
        </div>
      )
    },
    {
      id: 'budget',
      title: 'Live Spending',
      icon: PieChart,
      iconColor: 'text-emerald-600',
      iconBgActive: 'bg-emerald-100',
      iconBgInactive: 'bg-emerald-50',
      heading: 'Kill the blind spots.',
      description: 'Bank apps just show a generic $140 charge from Target. We show you the actual items. See exactly where the cash is bleeding.',
      visual: (
        <div className="border border-slate-200 p-6 bg-white shadow-sm mt-8">
          <div className="flex justify-between items-end mb-4">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">$480.00</span>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">of $600.00</span>
          </div>
          <div className="h-4 w-full bg-slate-100 overflow-hidden flex">
             <div className="w-[55%] h-full">
               <div className="bg-[#006994] h-full border-r border-[#005375] origin-left animate-[fillWidth_1s_ease-out_forwards]" title="Confirmed"></div>
             </div>
             <div className="w-[25%] h-full">
               <div className="bg-[#006994]/40 h-full origin-left animate-[fillWidth_1s_ease-out_0.3s_both]" title="Estimated"></div>
             </div>
          </div>
          <div className="flex gap-6 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-[#006994]"></div> Confirmed</div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-[#006994]/40"></div> Estimated</div>
          </div>
        </div>
      )
    },
    {
      id: 'recipes',
      title: 'Smart Meals',
      icon: Utensils,
      iconColor: 'text-purple-600',
      iconBgActive: 'bg-purple-100',
      iconBgInactive: 'bg-purple-50',
      heading: 'Dinner from the pantry.',
      description: 'It’s 5 PM. You don\'t want to go to the store. We look at what\'s in your fridge right now and tell you exactly what you can cook.',
      visual: (
        <div className="border border-slate-200 bg-white shadow-sm overflow-hidden flex mt-8 h-28">
          <div className="w-24 bg-slate-50 flex items-center justify-center border-r border-slate-200 shrink-0">
            <Utensils className="text-slate-300" size={32}/>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-900 text-lg">Spinach Omelette</h4>
              <span className="text-xs font-bold bg-[#006994]/10 text-[#006994] border border-[#006994]/20 px-2 py-1 uppercase tracking-wider animate-[pulseGlow_2s_ease-in-out_infinite]">100% Match</span>
            </div>
            <p className="text-sm text-slate-500 font-medium">You have all 5 ingredients ready.</p>
          </div>
        </div>
      )
    },
    {
      id: 'alerts',
      title: 'Waste Prevention',
      icon: Bell,
      iconColor: 'text-rose-600',
      iconBgActive: 'bg-rose-100',
      iconBgInactive: 'bg-rose-50',
      heading: 'End the science experiments.',
      description: 'Food goes bad because you forget it exists. We ping your phone before the spinach turns into liquid.',
      visual: (
        <div className="border border-slate-200 shadow-md bg-white w-full max-w-sm mx-auto overflow-hidden mt-8">
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center gap-2">
            <div className="w-6 h-6 bg-rose-500 flex items-center justify-center animate-[wiggleAlert_2s_infinite] shadow-sm">
              <Bell size={12} className="text-white" />
            </div>
            <span className="text-xs font-bold text-rose-700 uppercase tracking-widest">Tracker Alert</span>
            <span className="text-xs font-medium text-rose-400 ml-auto">Now</span>
          </div>
          <div className="p-5">
            <h4 className="font-bold text-slate-900 text-base mb-1.5">Items expiring soon</h4>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">Your Fresh Spinach and Milk expire in the next 48 hours. Use them to save $8.50.</p>
          </div>
        </div>
      )
    },
    {
      id: 'prices',
      title: 'Price Trends',
      icon: TrendingUp,
      iconColor: 'text-amber-600',
      iconBgActive: 'bg-amber-100',
      iconBgInactive: 'bg-amber-50',
      heading: 'Catch the stealth price hikes.',
      description: 'Milk was $3.50. Now it\'s $4.09. We track historical prices on your specific staples so you can actually measure inflation.',
      visual: (
        <div className="border border-slate-200 p-6 bg-white shadow-sm mt-8">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Organic Whole Milk</p>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">$4.09</p>
            </div>
            <span className="text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1.5 uppercase tracking-wider">↑ 17% since Oct</span>
          </div>
          <div className="h-16 w-full">
             <svg viewBox="0 0 200 50" className="w-full h-full overflow-visible">
                <path d="M 0 40 L 50 35 L 100 20 L 150 25 L 200 5" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" strokeDasharray="300" strokeDashoffset="300" className="animate-[drawLine_1.5s_ease-out_forwards]" />
                <rect x="-4" y="36" width="8" height="8" fill="#ef4444" className="opacity-0 scale-50 animate-[fadeInPoint_0.2s_ease-out_0.2s_forwards]" />
                <rect x="46" y="31" width="8" height="8" fill="#ef4444" className="opacity-0 scale-50 animate-[fadeInPoint_0.2s_ease-out_0.5s_forwards]" />
                <rect x="96" y="16" width="8" height="8" fill="#ef4444" className="opacity-0 scale-50 animate-[fadeInPoint_0.2s_ease-out_0.8s_forwards]" />
                <rect x="146" y="21" width="8" height="8" fill="#ef4444" className="opacity-0 scale-50 animate-[fadeInPoint_0.2s_ease-out_1.1s_forwards]" />
                <rect x="195" y="0" width="10" height="10" fill="#ef4444" className="opacity-0 scale-50 animate-[fadeInPoint_0.2s_ease-out_1.4s_forwards] shadow-lg" />
              </svg>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white selection:bg-[#006994]/20 font-sans animate-in fade-in duration-700">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#006994] flex items-center justify-center">
            <RefreshCw size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">Tracker</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-[#006994] transition-colors">Features</a>
          <a href="#pricing" className="hover:text-[#006994] transition-colors">Pricing</a>
        </div>
        <button 
          onClick={onLaunchApp}
          className="bg-gray-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm border border-gray-900"
        >
          Open App Dashboard
        </button>
      </nav>

      {/* Hero Section - Split Layout with Bento Box Animation */}
      <section className="max-w-7xl mx-auto px-6 pt-12 md:pt-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left: Text Content */}
          <div className="text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 text-sm font-medium mb-8 border border-gray-200 shadow-sm">
              <Zap size={16} className="text-[#006994]" /> The unified household tracker
            </div>
            <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold text-gray-900 tracking-tight leading-tight mb-8">
              Stop managing your money and your meals in different apps.
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-xl leading-relaxed">
              You don't need another spreadsheet. You need a system that actually knows what's in your fridge, tracks the spending, and kills the daily "what's for dinner" argument.
            </p>
            <div className="flex flex-col sm:flex-row justify-start gap-4">
              <button 
                onClick={onLaunchApp}
                className="bg-[#006994] text-white px-8 py-4 text-lg font-semibold hover:bg-[#005375] transition-all shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                Try the demo <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Right: System Live View (Bento Box Animation) */}
          <div className="relative w-full z-10 flex items-center justify-center">
            {/* Soft background glow for visual emphasis behind the brutalist grid */}
            <div className="absolute inset-0 bg-[#006994]/5 blur-3xl -z-10 transform scale-90"></div>
            <HeroAnimation />
          </div>
          
        </div>
      </section>

      {/* Feature Pillars - Master/Detail Layout */}
      <section id="features" className="bg-slate-50 py-24 border-t border-slate-200">
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
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">One input. Everything updates.</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">You take a photo of a receipt. We route the data exactly where it belongs.</p>
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
                    className={`group w-full text-left px-5 py-4 flex items-center gap-4 transition-all duration-200 border-l-4 ${
                      isActive 
                        ? 'bg-white border-[#006994] shadow-sm text-slate-900' 
                        : 'border-transparent hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className={`p-2.5 transition-all duration-300 ${isActive ? `${feature.iconBgActive} ${feature.iconColor} shadow-sm scale-110` : `${feature.iconBgInactive} ${feature.iconColor} opacity-60 group-hover:opacity-100 group-hover:scale-105`}`}>
                      <Icon size={20} />
                    </div>
                    <span className="font-bold text-base md:text-lg tracking-tight">{feature.title}</span>
                    {isActive && <ChevronRight size={20} className="ml-auto text-[#006994]" />}
                  </button>
                );
              })}
            </div>

            {/* Right: Dynamic Content Detail */}
            <div className="lg:col-span-7">
              {features.map((feature, idx) => (
                <div 
                  key={feature.id} 
                  className={`bg-white border border-slate-200 shadow-sm p-8 md:p-12 transition-all duration-500 ${activeFeature === idx ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}`}
                >
                  <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">{feature.heading}</h3>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed">{feature.description}</p>
                  
                  {/* Render the specific visual mockup for this feature */}
                  <div className="bg-slate-50 border border-slate-100 p-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Live Preview</p>
                    {feature.visual}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Realtime / Households */}
      <section className="py-24 bg-slate-950 text-white overflow-hidden border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side Copy & Interactive Card */}
          <div>
            <span className="px-2.5 py-1 text-xs font-semibold bg-[#00a2e0]/10 text-[#00a2e0] border border-[#00a2e0]/20 uppercase tracking-wider">Multiplayer by default</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-6 mb-6 leading-tight tracking-tight">One household. One single source of truth.</h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              If your partner scans a receipt at checkout, your phone updates before they start the car. No refreshing. No texting to ask who bought the milk.
            </p>
            
            {/* Vibe-Coded AI Insight Interaction -> Professional */}
            <div className="group bg-slate-900 border border-slate-800 hover:border-[#00a2e0]/50 p-6 transition-all duration-300 cursor-pointer hover:-translate-y-1 relative overflow-hidden shadow-lg">
              <div className="flex gap-4 mb-4 relative z-10">
                <div className="bg-slate-800 border border-slate-700 p-2.5 shrink-0 transition-transform duration-300">
                  <MessageSquare className="text-[#00a2e0]" size={20} />
                </div>
                <p className="text-white font-medium self-center text-lg">Stop staring at pie charts.</p>
              </div>
              <p className="text-slate-400 text-sm relative z-10 transition-colors leading-relaxed">
                Just ask why the grocery bill spiked this month, or what you should cut to save $200. Get a straight answer based on your actual purchases.
              </p>
              {/* Subtle hover prompt */}
              <div className="mt-4 overflow-hidden h-0 group-hover:h-5 transition-all duration-300 opacity-0 group-hover:opacity-100 flex items-center gap-2 text-[#00a2e0] text-xs font-semibold">
                <span>Try it out in the app</span>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>

          {/* Right Side Live Phone/App Mockup */}
          <div className="relative h-[440px] bg-slate-900 border border-slate-800 shadow-2xl p-6 flex flex-col group">
             {/* Header */}
             <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Home className="text-slate-400" size={20} />
                 </div>
                 <div>
                   <h4 className="font-semibold text-slate-100">Smith Household</h4>
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

             {/* Live Activity Feed - Professional */}
             <div className="space-y-3 flex-1 overflow-hidden pr-2">
               
               {/* Event 1 - Scanner */}
               <div className="group/item relative bg-slate-950/50 hover:bg-slate-800 border border-slate-800/50 hover:border-slate-700 p-4 transition-all duration-200 cursor-pointer">
                 <div className="flex items-start gap-3">
                   <div className="w-9 h-9 bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                     <Camera size={16} className="text-blue-400"/>
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between items-center mb-1">
                       <p className="text-sm font-medium text-slate-200"><span className="text-white">Sarah</span> scanned a receipt</p>
                       <span className="text-xs text-slate-500 font-medium">Just now</span>
                     </div>
                     <p className="text-xs text-slate-400">HEB Grocery • $142.50 • 14 items</p>
                   </div>
                 </div>
               </div>

               {/* Event 2 - Pantry Sync */}
               <div className="group/item relative bg-slate-950/50 hover:bg-slate-800 border border-slate-800/50 hover:border-slate-700 p-4 transition-all duration-200 cursor-pointer">
                 <div className="flex items-start gap-3">
                   <div className="w-9 h-9 bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                     <ShoppingBag size={16} className="text-orange-400"/>
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between items-center mb-1">
                       <p className="text-sm font-medium text-slate-200"><span className="text-white">System</span> updated Pantry</p>
                       <span className="text-xs text-slate-500 font-medium">1m ago</span>
                     </div>
                     <p className="text-xs text-slate-400">Added: Organic Milk, Spinach, +12 more</p>
                   </div>
                 </div>
               </div>

               {/* Event 3 - AI Recipe Match */}
               <div className="group/item relative bg-slate-950/50 hover:bg-slate-800 border border-slate-800/50 hover:border-slate-700 p-4 transition-all duration-200 cursor-pointer">
                 <div className="flex items-start gap-3">
                   <div className="w-9 h-9 bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                     <Utensils size={16} className="text-purple-400"/>
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between items-center mb-1">
                       <p className="text-sm font-medium text-slate-200"><span className="text-white">Assistant</span> found new meals</p>
                       <span className="text-xs text-slate-500 font-medium">2m ago</span>
                     </div>
                     <p className="text-xs text-slate-400">Spinach & Feta Omelette is a 100% match</p>
                   </div>
                 </div>
               </div>

             </div>
             
             {/* Bottom Fade Gradient */}
             <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">One subscription. The whole house is in.</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">We don't charge per user. You pay once, and everyone under your roof gets the app on their phone.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="border border-slate-200 p-8 shadow-sm bg-slate-50/50">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Basic</h3>
              <p className="text-slate-500 mt-2 font-medium">For people who don't mind typing.</p>
              <div className="my-6">
                <span className="text-5xl font-black text-slate-900">$0</span>
                <span className="text-slate-500 font-medium">/forever</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-slate-700 font-medium"><CheckCircle size={20} className="text-slate-300 shrink-0 mt-0.5" /> Manual receipt entry</li>
                <li className="flex items-start gap-3 text-slate-700 font-medium"><CheckCircle size={20} className="text-slate-300 shrink-0 mt-0.5" /> Shared household pantry</li>
                <li className="flex items-start gap-3 text-slate-700 font-medium"><CheckCircle size={20} className="text-slate-300 shrink-0 mt-0.5" /> Basic budget tracking</li>
                <li className="flex items-start gap-3 text-slate-400 font-medium line-through"><CheckCircle size={20} className="text-slate-200 shrink-0 mt-0.5" /> AI receipt scanning</li>
                <li className="flex items-start gap-3 text-slate-400 font-medium line-through"><CheckCircle size={20} className="text-slate-200 shrink-0 mt-0.5" /> Live bank syncing</li>
              </ul>
              <button onClick={onLaunchApp} className="w-full py-3 font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm">Start Free</button>
            </div>

            {/* Pro Tier */}
            <div className="border-2 border-[#006994] p-8 shadow-md relative bg-white transform md:-translate-y-4">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-[#006994] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">Automated</div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Tracker Pro</h3>
              <p className="text-slate-500 mt-2 font-medium">Kill the data entry entirely.</p>
              <div className="my-6">
                <span className="text-5xl font-black text-slate-900">$8</span>
                <span className="text-slate-500 font-medium">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-slate-700 font-medium"><CheckCircle size={20} className="text-[#006994] shrink-0 mt-0.5" /> Unlimited AI receipt scans</li>
                <li className="flex items-start gap-3 text-slate-700 font-medium"><CheckCircle size={20} className="text-[#006994] shrink-0 mt-0.5" /> Live bank account sync (Plaid)</li>
                <li className="flex items-start gap-3 text-slate-700 font-medium"><CheckCircle size={20} className="text-[#006994] shrink-0 mt-0.5" /> Smart recipe matching</li>
                <li className="flex items-start gap-3 text-slate-700 font-medium"><CheckCircle size={20} className="text-[#006994] shrink-0 mt-0.5" /> Expiry push notifications</li>
                <li className="flex items-start gap-3 text-slate-700 font-medium"><CheckCircle size={20} className="text-[#006994] shrink-0 mt-0.5" /> Ask the AI assistant anything</li>
              </ul>
              <button onClick={onLaunchApp} className="w-full py-3 font-bold text-white bg-[#006994] hover:bg-[#005375] transition-colors shadow-sm">Start 14-Day Trial</button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Final CTA & App Download */}
      <section className="bg-slate-50 py-24 border-t border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Web App CTA */}
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Stop guessing. Start tracking.</h2>
            <p className="text-xl text-slate-600 mb-8 max-w-xl leading-relaxed">
              Get your grocery list, pantry, and budget on the exact same page. Start your household on the web, or grab the mobile app for scanning on the go.
            </p>
            <button onClick={onLaunchApp} className="bg-[#006994] text-white px-8 py-4 text-lg font-semibold hover:bg-[#005375] transition-all shadow-sm inline-flex items-center gap-2">
              Open Web Dashboard <ChevronRight size={20} />
            </button>
          </div>

          {/* Right: Mobile App Download */}
          <div className="bg-white p-8 md:p-10 border border-slate-200 shadow-md flex flex-col sm:flex-row items-center gap-8 relative z-10">
             {/* Mock QR Code Block */}
             <div className="shrink-0 p-3 bg-white border-2 border-dashed border-slate-300">
               <div className="w-32 h-32 grid grid-cols-4 grid-rows-4 gap-1.5 p-1.5">
                 {/* Top Left Eye */}
                 <div className="col-span-2 row-span-2 border-[5px] border-slate-900 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-slate-900"></div></div>
                 {/* Top Right */}
                 <div className="col-start-4 row-start-1 bg-slate-900"></div>
                 <div className="col-start-4 row-start-2 border-4 border-slate-900"></div>
                 {/* Bottom Left Eye */}
                 <div className="row-start-3 col-span-2 row-span-2 border-[5px] border-slate-900 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-slate-900"></div></div>
                 {/* Bottom Right blocks */}
                 <div className="col-start-3 row-start-3 bg-slate-900"></div>
                 <div className="col-start-4 row-start-3 bg-slate-900"></div>
                 <div className="col-start-3 row-start-4 border-4 border-[#006994]"></div>
                 <div className="col-start-4 row-start-4 bg-slate-900"></div>
               </div>
             </div>
             
             {/* Download Copy & Buttons */}
             <div className="text-center sm:text-left">
               <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Scan to download</h3>
               <p className="text-sm text-slate-600 font-medium mb-6">
                 Get the companion app for iOS and Android. Receipts scan best on your phone.
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

      {/* Proper Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#006994] flex items-center justify-center">
                <RefreshCw size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Tracker</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">Household inventory and personal finance, finally talking to each other.</p>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4 tracking-tight">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><button onClick={onLaunchApp} className="hover:text-white transition-colors">Smart Scanning</button></li>
              <li><button onClick={onLaunchApp} className="hover:text-white transition-colors">Smart Pantry</button></li>
              <li><button onClick={onLaunchApp} className="hover:text-white transition-colors">Budget Pulse</button></li>
              <li><button onClick={onLaunchApp} className="hover:text-white transition-colors">Pantry Recipes</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 tracking-tight">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Security & Privacy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">System Architecture</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 tracking-tight">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
          <p>© {new Date().getFullYear()} Tracker Inc. All rights reserved.</p>
          <div className="flex gap-6">
             <a href="#" className="hover:text-white transition-colors">Twitter</a>
             <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [view, setView] = useState('marketing'); // 'marketing' | 'app'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  
  if (view === 'marketing') {
    return <MarketingLanding onLaunchApp={() => setView('app')} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage />;
      case 'scan': return <ScannerPage />;
      case 'pantry': return <PantryPage />;
      case 'budget': return <BudgetPage />;
      case 'bank': return <BankPage />;
      case 'goals': return <GoalsPage />;
      case 'recipes': return <RecipesPage />;
      default: return <DashboardPage />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, color: 'text-[#006994]', bg: 'bg-[#006994]/10' },
    { id: 'scan', label: 'Scan', icon: Camera, color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'pantry', label: 'Pantry', icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: 'budget', label: 'Budget', icon: PieChart, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { id: 'bank', label: 'Bank', icon: Landmark, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { id: 'goals', label: 'Goals', icon: Target, color: 'text-rose-600', bg: 'bg-rose-100' },
    { id: 'recipes', label: 'Recipes', icon: Utensils, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-2 cursor-pointer" onClick={() => setView('marketing')}>
          <div className="w-8 h-8 bg-[#006994] flex items-center justify-center">
            <RefreshCw size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">Tracker</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 font-medium transition-all duration-200 ${
                  isActive 
                    ? `${item.bg} ${item.color}` 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <Icon size={20} className={isActive ? item.color : `text-gray-400 transition-colors duration-200 group-hover:${item.color}`} />
                </div>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shrink-0">
              <User size={20} className="text-gray-600" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">Smith Family</p>
              <p className="text-xs text-[#006994] flex items-center gap-1"><span className="w-2 h-2 bg-[#006994]"></span> Online & Syncing</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
             {/* Breadcrumbs could go here */}
          </div>
          <div className="flex items-center gap-4">
             <div className="relative">
               <button 
                 onClick={() => setShowNotifications(!showNotifications)}
                 className={`p-2 transition-colors relative ${showNotifications ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 <Bell size={20} />
                 <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white"></span>
               </button>
               
               {/* Notifications Dropdown */}
               {showNotifications && (
                 <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                   <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                     <h3 className="font-bold text-gray-900">Notifications</h3>
                     <button className="text-xs text-[#006994] font-medium hover:underline">Mark all read</button>
                   </div>
                   <div className="max-h-[300px] overflow-y-auto">
                     {MOCK_NOTIFICATIONS.map(notif => (
                       <div key={notif.id} className={`p-4 border-b border-gray-50 flex gap-3 hover:bg-gray-50 cursor-pointer transition-colors ${!notif.read ? 'bg-blue-50/30' : ''}`}>
                         <div className="mt-0.5">
                           {notif.type === 'warning' ? <AlertCircle size={16} className="text-red-500" /> : 
                            notif.type === 'alert' ? <Target size={16} className="text-orange-500" /> :
                            <Info size={16} className="text-blue-500" />}
                         </div>
                         <div className="flex-1">
                           <p className={`text-sm ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>{notif.title}</p>
                           <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                         </div>
                         {!notif.read && <div className="w-2 h-2 bg-[#006994] mt-1.5 shrink-0"></div>}
                       </div>
                     ))}
                   </div>
                   <div className="p-3 text-center border-t border-gray-100 bg-gray-50">
                     <button className="text-sm font-medium text-gray-600 hover:text-gray-900">View all</button>
                   </div>
                 </div>
               )}
             </div>
             <button onClick={() => setView('marketing')} className="text-sm text-gray-500 hover:text-gray-900 font-medium border border-gray-200 px-3 py-1.5">
               Exit to Marketing Site
             </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </div>

        {/* Floating AI Chat Trigger (Mock) */}
        <button className="absolute bottom-6 right-6 w-14 h-14 bg-gray-900 text-white shadow-lg hover:shadow-xl flex items-center justify-center hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 z-20">
          <MessageSquare size={24} />
        </button>
      </main>
    </div>
  );
}