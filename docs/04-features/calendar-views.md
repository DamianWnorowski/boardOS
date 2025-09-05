---
title: Calendar Views
category: features
tags: [calendar, views, month-view, week-view, scheduling]
related: [/03-components/monthview.md, /03-components/weekview.md]
last-updated: 2025-09-02
---

# Calendar Views

## Quick Answer
BoardOS provides multiple calendar views (Day, Week, Month) for visualizing and managing construction schedules, with intelligent job duration estimation, drag-and-drop between dates, and real-time multi-day project tracking.

## Overview

The calendar view system offers flexible scheduling perspectives, from detailed daily assignments to high-level monthly planning. Each view is optimized for specific workflow needs while maintaining full drag-and-drop functionality and real-time synchronization.

## View Types

### Day View

```typescript
interface DayViewProps {
  selectedDate: Date;
  jobs: Job[];
  assignments: Assignment[];
  resources: Resource[];
}

const DayView: React.FC<DayViewProps> = ({ 
  selectedDate, 
  jobs, 
  assignments, 
  resources 
}) => {
  // Filter jobs for selected date
  const dayJobs = useMemo(() => 
    jobs.filter(job => {
      const jobDate = new Date(job.schedule_date || Date.now());
      return isSameDay(jobDate, selectedDate);
    }),
    [jobs, selectedDate]
  );
  
  return (
    <div className="day-view">
      <DayHeader date={selectedDate} />
      
      <div className="time-slots">
        {generateTimeSlots().map(slot => (
          <TimeSlot 
            key={slot}
            time={slot}
            jobs={getJobsForTimeSlot(dayJobs, slot)}
            onDrop={(resource) => handleTimedAssignment(resource, slot)}
          />
        ))}
      </div>
      
      <div className="day-jobs">
        {dayJobs.map(job => (
          <JobColumn 
            key={job.id}
            job={job}
            assignments={getJobAssignments(job.id)}
            expanded={true}
          />
        ))}
      </div>
    </div>
  );
};
```

### Week View

Week view automatically loads jobs for the entire 7-day range and handles navigation correctly:

```typescript
const WeekViewCompact: React.FC = ({ startDate, onDateChange }) => {
  const { jobs, isLoading: schedulerLoading } = useScheduler();
  const [weekJobs, setWeekJobs] = useState<Map<string, Job[]>>(new Map());
  
  // Calculate week dates (Sunday to Saturday)
  const getWeekDates = (start: Date): Date[] => {
    const dates: Date[] = [];
    const current = new Date(start);
    current.setDate(current.getDate() - current.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };
  
  // Organize jobs by date, synchronized with SchedulerContext loading
  useEffect(() => {
    if (schedulerLoading) {
      setIsLoading(true);
      return;
    }
    
    const jobsByDate = new Map<string, Job[]>();
    const today = new Date().toISOString().split('T')[0];
    
    weekDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dateJobs = jobs.filter(job => {
        const jobDate = job.schedule_date || today;
        return jobDate === dateStr;
      });
      jobsByDate.set(dateStr, dateJobs);
    });
    
    setWeekJobs(jobsByDate);
    setIsLoading(false);
  }, [weekDates, jobs, schedulerLoading]);
  
  return (
    <div className="week-view-compact">
      {weekDates.map(day => (
        <DayColumn
          key={day.toISOString()}
          date={day}
          jobs={weekJobs.get(day.toISOString().split('T')[0]) || []}
          onAddJob={() => handleAddJob(day)}
        />
      ))}
    </div>
  );
};
```

### Month View

```typescript
const MonthView: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { jobs, availableJobs } = useScheduler();
  
  const calendarDays = useMemo(() => 
    generateCalendarDays(currentMonth),
    [currentMonth]
  );
  
  return (
    <div className="month-view">
      <MonthHeader 
        month={currentMonth}
        onNavigate={setCurrentMonth}
      />
      
      <div className="calendar-grid">
        {calendarDays.map(({ date, isCurrentMonth }) => (
          <CalendarDay
            key={date.toISOString()}
            date={date}
            isCurrentMonth={isCurrentMonth}
            jobs={getJobsForDate(date)}
            isDropTarget={true}
            onDrop={(job) => scheduleJobOnDate(job, date)}
          />
        ))}
      </div>
      
      <AvailableJobsPanel 
        jobs={availableJobs}
        onSchedule={(job, date) => scheduleJob(job, date)}
      />
    </div>
  );
};
```

## Multi-Day Job Visualization

### Job Bar Rendering

```typescript
interface MonthViewJobBar {
  job: Job;
  startDate: Date;
  endDate: Date;
  row: number;
  spanDays: number;
}

const MonthViewJobBar: React.FC<MonthViewJobBar> = ({ 
  job, 
  startDate, 
  endDate, 
  row, 
  spanDays 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const [{ opacity }, drag] = useDrag({
    type: 'JOB',
    item: { 
      type: 'JOB', 
      job, 
      originalDate: startDate 
    },
    collect: (monitor) => ({
      opacity: monitor.isDragging() ? 0.5 : 1
    })
  });
  
  const barStyle = {
    gridColumn: `span ${spanDays}`,
    gridRow: row + 2, // Account for header
    opacity
  };
  
  return (
    <div 
      ref={drag}
      className={`job-bar ${getJobTypeColor(job.type)}`}
      style={barStyle}
    >
      <div className="job-bar-content">
        <span className="job-name">{job.name}</span>
        <span className="job-duration">{spanDays}d</span>
        {job.estimated_tons && (
          <span className="job-estimate">{job.estimated_tons}t</span>
        )}
      </div>
      
      <div className="job-bar-progress">
        <ProgressBar 
          completed={getCompletedDays(job)}
          total={spanDays}
        />
      </div>
    </div>
  );
};
```

### Job Positioning Algorithm

```typescript
class JobPositionCalculator {
  calculateJobPositions(
    jobs: Job[],
    viewStart: Date,
    viewEnd: Date
  ): Map<string, JobPosition> {
    const positions = new Map<string, JobPosition>();
    const rows: JobRow[] = [];
    
    // Sort jobs by start date
    const sortedJobs = jobs.sort((a, b) => 
      new Date(a.schedule_date).getTime() - 
      new Date(b.schedule_date).getTime()
    );
    
    for (const job of sortedJobs) {
      const startDate = new Date(job.schedule_date);
      const duration = job.estimated_duration || 1;
      const endDate = addDays(startDate, duration - 1);
      
      // Find available row
      const row = this.findAvailableRow(rows, startDate, endDate);
      
      // Calculate grid position
      const dayOffset = differenceInDays(startDate, viewStart);
      const spanDays = Math.min(
        duration,
        differenceInDays(viewEnd, startDate) + 1
      );
      
      positions.set(job.id, {
        row,
        column: dayOffset + 1,
        span: spanDays,
        startDate,
        endDate
      });
      
      // Mark row as occupied
      rows[row] = rows[row] || [];
      rows[row].push({ start: startDate, end: endDate });
    }
    
    return positions;
  }
  
  private findAvailableRow(
    rows: JobRow[],
    start: Date,
    end: Date
  ): number {
    for (let i = 0; i < rows.length; i++) {
      if (this.canFitInRow(rows[i], start, end)) {
        return i;
      }
    }
    return rows.length; // New row
  }
  
  private canFitInRow(
    row: JobRow,
    start: Date,
    end: Date
  ): boolean {
    if (!row) return true;
    
    return !row.some(job => 
      !(end < job.start || start > job.end)
    );
  }
}
```

## Available Jobs Management

### Available Jobs Panel

```typescript
const AvailableJobsPanel: React.FC = () => {
  const { availableJobs, scheduleJob } = useScheduler();
  const [filter, setFilter] = useState<JobFilter>({});
  const [sortBy, setSortBy] = useState<'priority' | 'duration' | 'name'>('priority');
  
  const filteredJobs = useMemo(() => {
    let jobs = [...availableJobs];
    
    // Apply filters
    if (filter.type) {
      jobs = jobs.filter(j => j.type === filter.type);
    }
    if (filter.minDuration) {
      jobs = jobs.filter(j => j.estimated_duration >= filter.minDuration);
    }
    
    // Apply sorting
    jobs.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return (b.priority || 0) - (a.priority || 0);
        case 'duration':
          return (a.estimated_duration || 0) - (b.estimated_duration || 0);
        case 'name':
          return a.name.localeCompare(b.name);
      }
    });
    
    return jobs;
  }, [availableJobs, filter, sortBy]);
  
  return (
    <div className="available-jobs-panel">
      <div className="panel-header">
        <h3>Available Jobs ({filteredJobs.length})</h3>
        <JobFilterControls 
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>
      
      <div className="jobs-list">
        {filteredJobs.map(job => (
          <DraggableJobCard 
            key={job.id}
            job={job}
            estimation={calculateJobEstimation(job)}
          />
        ))}
      </div>
    </div>
  );
};
```

### Job Estimation Display

```typescript
const JobEstimateCard: React.FC<{ job: Job }> = ({ job }) => {
  const estimate = useMemo(() => 
    DurationEstimationService.calculateJobDuration(job),
    [job]
  );
  
  const phases = useMemo(() => 
    DurationEstimationService.generateJobPhases(
      job,
      new Date().toISOString()
    ),
    [job]
  );
  
  return (
    <div className="job-estimate-card">
      <div className="estimate-header">
        <h4>{job.name}</h4>
        <Badge>{estimate.total_days} days</Badge>
      </div>
      
      <div className="estimate-details">
        {job.estimated_sqyards && (
          <div className="metric">
            <Icon type="milling" />
            <span>{job.estimated_sqyards.toLocaleString()} sq yards</span>
            <span className="duration">{estimate.milling_days}d</span>
          </div>
        )}
        
        {job.estimated_tons && (
          <div className="metric">
            <Icon type="paving" />
            <span>{job.estimated_tons.toLocaleString()} tons</span>
            <span className="duration">{estimate.paving_days}d</span>
          </div>
        )}
      </div>
      
      <div className="phase-timeline">
        {phases.map(phase => (
          <PhaseBar 
            key={phase.id}
            phase={phase}
            totalDays={estimate.total_days}
          />
        ))}
      </div>
    </div>
  );
};
```

## Drag and Drop Between Dates

### Date Drop Zones

```typescript
const CalendarDayDropZone: React.FC<{ date: Date }> = ({ date }) => {
  const { scheduleJob, updateJobDate } = useScheduler();
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['JOB', 'AVAILABLE_JOB'],
    
    canDrop: (item) => {
      // Check if date is available
      if (isPastDate(date)) return false;
      if (isHoliday(date)) return false;
      
      // Check resource availability
      if (item.type === 'JOB') {
        return canRescheduleJob(item.job, date);
      }
      
      return true;
    },
    
    drop: async (item) => {
      if (item.type === 'AVAILABLE_JOB') {
        // Schedule new job
        await scheduleJob(item.job.id, date);
      } else if (item.type === 'JOB') {
        // Reschedule existing job
        await updateJobDate(item.job.id, date);
      }
    },
    
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });
  
  return (
    <div 
      ref={drop}
      className={`
        calendar-day 
        ${isOver ? 'drag-over' : ''}
        ${canDrop ? 'can-drop' : ''}
      `}
    >
      <DayNumber date={date} />
      {isOver && canDrop && (
        <DropPreview job={item.job} date={date} />
      )}
    </div>
  );
};
```

## View Synchronization

### Intelligent Date Synchronization

BoardOS provides intelligent date synchronization when switching between views to ensure users always see relevant data.

```typescript
// View switching with automatic date adjustment
const setCurrentView = useCallback((view: ViewType) => {
  const previousView = currentView;
  
  // Handle date adjustments when switching between views
  if (previousView === 'month' && view === 'day') {
    // When switching from month to day view, if selectedDate is the 1st of the month,
    // set it to today's date if we're viewing the current month, otherwise keep it
    const today = new Date();
    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    if (selectedDate.getDate() === 1) { // If we're on the first day of a month
      if (selectedMonth === currentMonth && selectedYear === currentYear) {
        // If it's the current month, switch to today
        setSelectedDate(today);
      } else {
        // If it's a different month, use a reasonable day in that month
        const dayOfMonth = Math.min(today.getDate(), 28);
        setSelectedDate(new Date(selectedYear, selectedMonth, dayOfMonth));
      }
    }
  }
  
  setCurrentViewState(view);
  localStorage.setItem('boardOS-view', view);
}, [currentView, selectedDate]);
```

### Shared View State

```typescript
const CalendarViewContext = createContext<CalendarViewState>();

interface CalendarViewState {
  currentView: 'day' | 'week' | 'month';
  selectedDate: Date;
  viewRange: { start: Date; end: Date };
  
  // Navigation
  navigateToDate: (date: Date) => void;
  navigateToJob: (jobId: string) => void;
  switchView: (view: ViewType) => void;
  
  // Filters
  filters: ViewFilters;
  updateFilters: (filters: Partial<ViewFilters>) => void;
}

const CalendarViewProvider: React.FC = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const viewRange = useMemo(() => {
    switch (currentView) {
      case 'day':
        return {
          start: startOfDay(selectedDate),
          end: endOfDay(selectedDate)
        };
      case 'week':
        return {
          start: startOfWeek(selectedDate),
          end: endOfWeek(selectedDate)
        };
      case 'month':
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate)
        };
    }
  }, [currentView, selectedDate]);
  
  const navigateToJob = useCallback((jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job?.schedule_date) {
      setSelectedDate(new Date(job.schedule_date));
      
      // Switch to appropriate view
      if (job.estimated_duration > 7) {
        setCurrentView('month');
      } else if (job.estimated_duration > 1) {
        setCurrentView('week');
      } else {
        setCurrentView('day');
      }
    }
  }, [jobs]);
  
  return (
    <CalendarViewContext.Provider value={{
      currentView,
      selectedDate,
      viewRange,
      navigateToDate: setSelectedDate,
      navigateToJob,
      switchView: setCurrentView
    }}>
      {children}
    </CalendarViewContext.Provider>
  );
};
```

## Performance Optimizations

### Virtual Calendar Rendering

```typescript
const VirtualMonthGrid: React.FC = () => {
  const [visibleRange, setVisibleRange] = useState({ 
    start: 0, 
    end: 42 
  });
  
  const allDays = useMemo(() => 
    generateCalendarDays(currentMonth),
    [currentMonth]
  );
  
  const visibleDays = useMemo(() => 
    allDays.slice(visibleRange.start, visibleRange.end),
    [allDays, visibleRange]
  );
  
  const handleScroll = useCallback((e: ScrollEvent) => {
    const rowHeight = 100;
    const visibleRows = Math.ceil(e.containerHeight / rowHeight);
    const startRow = Math.floor(e.scrollTop / rowHeight);
    
    setVisibleRange({
      start: startRow * 7,
      end: (startRow + visibleRows + 1) * 7
    });
  }, []);
  
  return (
    <VirtualScroll 
      onScroll={handleScroll}
      totalHeight={Math.ceil(allDays.length / 7) * 100}
    >
      <div className="virtual-calendar-grid">
        {visibleDays.map(day => (
          <CalendarDay key={day.date.toISOString()} {...day} />
        ))}
      </div>
    </VirtualScroll>
  );
};
```

### Lazy Job Loading

```typescript
const LazyJobLoader = () => {
  const [loadedRanges, setLoadedRanges] = useState<DateRange[]>([]);
  
  const loadJobsForRange = useCallback(async (range: DateRange) => {
    // Check if already loaded
    if (isRangeLoaded(range, loadedRanges)) return;
    
    // Load jobs for range
    const jobs = await DatabaseService.getJobsByDateRange(
      range.start,
      range.end
    );
    
    // Update state
    setJobs(prev => mergeJobs(prev, jobs));
    setLoadedRanges(prev => [...prev, range]);
  }, [loadedRanges]);
  
  // Preload adjacent ranges
  useEffect(() => {
    const preloadRanges = getAdjacentRanges(viewRange);
    preloadRanges.forEach(range => loadJobsForRange(range));
  }, [viewRange]);
};
```

## Mobile Calendar Views

### Touch-Optimized Month View

```typescript
const MobileMonthView: React.FC = () => {
  const [touchStart, setTouchStart] = useState<number>(0);
  
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  
  const handleTouchEnd = (e: TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        navigateToNextMonth();
      } else {
        navigateToPreviousMonth();
      }
    }
  };
  
  return (
    <div 
      className="mobile-month-view"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <SwipeableCalendar 
        month={currentMonth}
        onSwipeLeft={navigateToNextMonth}
        onSwipeRight={navigateToPreviousMonth}
      />
    </div>
  );
};
```

### Compact Week View

```typescript
const CompactWeekView: React.FC = () => {
  return (
    <div className="compact-week-view">
      {weekDays.map(day => (
        <div key={day.toISOString()} className="compact-day">
          <div className="day-header">
            <span className="day-name">
              {format(day, 'EEE')}
            </span>
            <span className="day-number">
              {format(day, 'd')}
            </span>
          </div>
          
          <div className="job-dots">
            {getJobsForDate(day).slice(0, 3).map(job => (
              <JobDot 
                key={job.id}
                color={getJobTypeColor(job.type)}
                onClick={() => expandDay(day)}
              />
            ))}
            {getJobsForDate(day).length > 3 && (
              <MoreIndicator 
                count={getJobsForDate(day).length - 3}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Calendar Export

### Export to iCal

```typescript
class CalendarExporter {
  exportToICal(jobs: Job[], range: DateRange): string {
    const calendar = ical({ 
      name: 'BoardOS Schedule',
      timezone: 'America/New_York'
    });
    
    jobs.forEach(job => {
      const event = calendar.createEvent({
        start: new Date(job.schedule_date),
        end: addDays(
          new Date(job.schedule_date),
          job.estimated_duration || 1
        ),
        summary: job.name,
        description: this.generateJobDescription(job),
        location: job.location?.address,
        categories: [job.type],
        alarms: [{
          type: 'display',
          trigger: 3600 // 1 hour before
        }]
      });
      
      // Add phases as separate events
      if (job.phases) {
        job.phases.forEach(phase => {
          calendar.createEvent({
            start: new Date(phase.estimated_start),
            end: new Date(phase.estimated_end),
            summary: `${job.name} - ${phase.phase_type}`,
            categories: [job.type, phase.phase_type]
          });
        });
      }
    });
    
    return calendar.toString();
  }
}
```

## Recent Improvements (2025-09-02)

### Week View Data Loading
- **Fixed**: Week navigation now properly loads all jobs for the entire week
- **Issue**: Previously, navigating to "last week" only showed jobs for one day
- **Solution**: Synchronized WeekViewCompact component with SchedulerContext loading state

### Resource Availability
- **Fixed**: Resource sidebar now shows only truly available resources
- **Issue**: Resources assigned on other dates appeared as "available"  
- **Solution**: Proper filtering to exclude resources assigned on any date

### Date Filtering Consistency
- **Fixed**: All data operations now maintain current view's date filtering
- **Issue**: Creating jobs, refreshing data, etc. would load all jobs regardless of selected date
- **Solution**: Centralized `reloadDataForCurrentView()` function used consistently

### OpenStreetMap Integration
- **Added**: Complete replacement of Google Maps with OpenStreetMap
- **Benefits**: No API keys required, open-source, better privacy
- **Features**: Location search, click-to-select, reverse geocoding via Nominatim

The calendar view system provides comprehensive scheduling visualization with flexible perspectives, intelligent job management, and seamless drag-and-drop functionality across all time scales.