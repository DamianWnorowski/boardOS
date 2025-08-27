import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, FileText, Printer } from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';

const Navbar: React.FC = () => {
  const { selectedDate, setSelectedDate } = useScheduler();

  const handlePreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setSelectedDate(prevDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setSelectedDate(nextDay);
  };

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    if (!isNaN(date.getTime())) {
      setSelectedDate(date);
    }
  };

  const formatDate = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDateInputValue = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  };

  return (
    <header className="bg-slate-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">Road Construction Scheduler</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-slate-700 rounded-md">
              <button 
                onClick={handlePreviousDay}
                className="p-2 hover:bg-slate-600 rounded-l-md transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft size={20} />
              </button>
              
              <button 
                onClick={handleTodayClick}
                className="px-3 py-2 hover:bg-slate-600 transition-colors flex items-center"
              >
                <Calendar size={16} className="mr-1" />
                <span>Today</span>
              </button>
              
              <button 
                onClick={handleNextDay}
                className="p-2 hover:bg-slate-600 rounded-r-md transition-colors"
                aria-label="Next day"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <div className="flex items-center">
              <span className="hidden md:inline mr-2">{formatDate(selectedDate)}</span>
              <input 
                type="date" 
                value={getDateInputValue(selectedDate)} 
                onChange={handleDateChange}
                className="bg-slate-700 text-white px-2 py-1 rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-2">
              <button 
                className="bg-blue-600 hover:bg-blue-700 p-2 rounded transition-colors flex items-center"
                aria-label="Print schedule"
              >
                <Printer size={20} />
                <span className="ml-1 hidden md:inline">Print</span>
              </button>
              
              <button 
                className="bg-green-600 hover:bg-green-700 p-2 rounded transition-colors flex items-center"
                aria-label="Export to PDF"
              >
                <FileText size={20} />
                <span className="ml-1 hidden md:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;