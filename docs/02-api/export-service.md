---
title: ExportService API
category: api
tags: [export, pdf, image, service, jspdf]
related: [/02-api/database-service.md, /04-features/export.md]
last-updated: 2025-08-29
---

# ExportService API

## Quick Answer
ExportService provides complete export functionality for schedules and jobs, supporting PDF generation with custom formatting and PNG image exports with high-quality rendering.

## Overview

The ExportService class handles all export operations in BoardOS, converting schedule data and visual elements into portable formats. It uses jsPDF for PDF generation and html2canvas for image capture, providing professional-quality output suitable for sharing with clients, teams, and stakeholders.

## Core Features

- **PDF Export**: Professional PDF generation with customizable layouts
- **Image Export**: High-resolution PNG screenshots of schedule views
- **Multi-Format Support**: A4, Letter, Portrait, Landscape orientations
- **Custom Headers/Footers**: Branded output with timestamps and page numbers
- **Job Grouping**: Organized resource assignments by row type
- **Responsive Rendering**: Optimized export modes for better visual output

## PDF Export Operations

### Complete Schedule Export

```typescript
import ExportService from '@/services/ExportService';

// Export full schedule for a date
await ExportService.exportScheduleToPDF(
  jobs,           // Job[] - All jobs for the date
  assignments,    // Assignment[] - All resource assignments  
  resources,      // Resource[] - All available resources
  new Date('2025-08-29'),  // Selected date
  {
    format: 'letter',        // 'a4' | 'letter'
    orientation: 'portrait', // 'portrait' | 'landscape'
    includeHeader: true,     // Company branding
    includeTimestamp: true   // Generation timestamp
  }
);
```

### Single Job Export

```typescript
// Export specific job details
await ExportService.exportJobToPDF(
  job,              // Job - Target job
  jobAssignments,   // Assignment[] - Job's assignments
  resources         // Resource[] - All resources
);
```

### Export Options Interface

```typescript
interface ExportOptions {
  format?: 'a4' | 'letter';           // Page size
  orientation?: 'portrait' | 'landscape'; // Page orientation
  includeHeader?: boolean;             // Header with title/date
  includeTimestamp?: boolean;          // Footer timestamp
}
```

## Image Export Operations

### Schedule Screenshot Export

```typescript
// Export current schedule view as PNG
await ExportService.exportScheduleAsImage('board-container');

// With custom element ID
await ExportService.exportScheduleAsImage('custom-schedule-view');
```

### Image Export Features

- **High Resolution**: 2x scaling for crisp output
- **Export Mode**: Temporary CSS class for optimized rendering
- **CORS Support**: Handles cross-origin images
- **Background Control**: Clean white backgrounds
- **Automatic Download**: Browser download with timestamped filename

## PDF Layout and Formatting

### Document Structure

```typescript
// PDF document creation with properties
const pdf = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'letter'
});

pdf.setProperties({
  title: `Schedule - ${selectedDate.toLocaleDateString()}`,
  subject: 'Construction Schedule',
  author: 'BoardOS',
  keywords: 'construction, schedule, roadwork',
  creator: 'BoardOS Scheduler'
});
```

### Header Layout

```typescript
// Professional header with title and date
private static addHeader(pdf: jsPDF, date: Date): void {
  // Main title - centered, bold, 18pt
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Construction Schedule', pageWidth / 2, 15, { align: 'center' });

  // Date - centered, normal, 14pt with full formatting
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  }), pageWidth / 2, 25, { align: 'center' });

  // Separator line
  pdf.setLineWidth(0.5);
  pdf.line(20, 30, pageWidth - 20, 30);
}
```

### Job Section Formatting

```typescript
// Individual job section with box layout
private static addJobSection(
  pdf: jsPDF,
  job: Job,
  assignments: Assignment[],
  resources: Resource[],
  startY: number
): number {
  // Job header box
  pdf.rect(15, yPosition, pageWidth - 30, 8);
  
  // Job name (left) and type (right)
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(job.name, 18, yPosition + 5);
  
  pdf.setFontSize(10);
  pdf.text(`Type: ${jobType}`, pageWidth - 60, yPosition + 5);
  
  // Job details: location, start time
  if (job.location?.address) {
    pdf.text(`Location: ${job.location.address}`, 18, yPosition);
  }
  
  // Grouped resource assignments
  const groupedAssignments = this.groupAssignmentsByRow(assignments);
  
  Object.entries(groupedAssignments).forEach(([rowType, rowAssignments]) => {
    pdf.setFont('helvetica', 'italic');
    pdf.text(`${rowType}:`, 20, yPosition);
    
    rowAssignments.forEach(assignment => {
      const resource = resources.find(r => r.id === assignment.resourceId);
      const timeSlot = assignment.timeSlot?.startTime || '07:00';
      pdf.text(`• ${resource.name} - ${timeSlot}`, 25, yPosition);
    });
  });
}
```

### Footer with Page Numbers

```typescript
// Multi-page footer with page numbers and timestamp
private static addFooter(pdf: jsPDF): void {
  const pageCount = pdf.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    
    // Centered page number
    pdf.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    
    // Left-aligned timestamp
    pdf.setFontSize(8);
    pdf.text(
      `Generated: ${new Date().toLocaleString()}`,
      20,
      pageHeight - 10
    );
  }
}
```

## Resource Grouping and Organization

### Assignment Grouping

```typescript
// Group assignments by row type for organized display
private static groupAssignmentsByRow(assignments: Assignment[]): Record<string, Assignment[]> {
  return assignments.reduce((groups, assignment) => {
    const rowType = assignment.row || 'Other';
    if (!groups[rowType]) {
      groups[rowType] = [];
    }
    groups[rowType].push(assignment);
    return groups;
  }, {} as Record<string, Assignment[]>);
}
```

### Job Type Labels

```typescript
// Human-readable job type labels
private static getJobTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    'milling': 'Milling',
    'paving': 'Paving', 
    'both': 'Milling/Paving',
    'drainage': 'Drainage',
    'stripping': 'Stripping',
    'hired': 'Hired',
    'other': 'Other'
  };
  return typeLabels[type] || type;
}
```

## Page Management

### Automatic Page Breaks

```typescript
// Intelligent page break management
jobs.forEach((job, index) => {
  if (yPosition > 250) { // Near page bottom
    pdf.addPage();
    yPosition = 20;
    
    // Re-add header on new pages
    if (includeHeader) {
      this.addHeader(pdf, selectedDate);
      yPosition = 40;
    }
  }
  
  yPosition = this.addJobSection(pdf, job, assignments, resources, yPosition);
  yPosition += 5; // Space between jobs
});
```

## Image Export Implementation

### High-Quality Screenshot Capture

```typescript
static async exportScheduleAsImage(elementId: string = 'board-container'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Schedule container not found');
  }

  // Export mode for optimized rendering
  element.classList.add('export-mode');

  try {
    const canvas = await html2canvas(element, {
      scale: 2,              // 2x resolution for crisp output
      useCORS: true,         // Handle cross-origin images
      logging: false,        // Disable debug logging
      backgroundColor: '#ffffff'  // Clean white background
    });

    // Convert to downloadable blob
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `schedule_${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  } finally {
    // Always remove export mode class
    element.classList.remove('export-mode');
  }
}
```

### Export Mode CSS Optimization

```css
/* Optimized styles for export mode */
.export-mode {
  /* Remove interactive elements */
  .drag-handle { display: none !important; }
  .hover-effects { display: none !important; }
  
  /* Ensure consistent rendering */
  * { 
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* Clean backgrounds and borders */
  background: white !important;
  box-shadow: none !important;
}
```

## Error Handling

### Robust Error Management

```typescript
// PDF export error handling
try {
  await ExportService.exportScheduleToPDF(jobs, assignments, resources, date, options);
} catch (error) {
  console.error('Error exporting to PDF:', error);
  
  // Handle specific error types
  if (error.message.includes('jsPDF')) {
    // PDF generation error
    showErrorMessage('Failed to generate PDF. Please try again.');
  } else if (error.message.includes('data')) {
    // Data processing error  
    showErrorMessage('Invalid schedule data. Please refresh and try again.');
  }
  
  throw error;
}

// Image export error handling
try {
  await ExportService.exportScheduleAsImage('board-container');
} catch (error) {
  console.error('Error exporting as image:', error);
  
  if (error.message.includes('not found')) {
    showErrorMessage('Schedule view not found. Please ensure the schedule is loaded.');
  } else {
    showErrorMessage('Failed to capture image. Please try again.');
  }
  
  throw error;
}
```

## Usage Examples

### Complete Schedule Export Workflow

```typescript
// React component usage
const ExportButton = () => {
  const { jobs, assignments, resources } = useScheduler();
  const [selectedDate] = useState(new Date());
  const [isExporting, setIsExporting] = useState(false);
  
  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      await ExportService.exportScheduleToPDF(
        jobs.filter(job => isJobOnDate(job, selectedDate)),
        assignments,
        resources,
        selectedDate,
        {
          format: 'letter',
          orientation: 'portrait',
          includeHeader: true,
          includeTimestamp: true
        }
      );
      
      showSuccessMessage('Schedule exported successfully!');
    } catch (error) {
      showErrorMessage('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImageExport = async () => {
    try {
      await ExportService.exportScheduleAsImage('board-container');
      showSuccessMessage('Image exported successfully!');
    } catch (error) {
      showErrorMessage('Image export failed. Please try again.');
    }
  };
  
  return (
    <div className="export-controls">
      <button 
        onClick={handlePDFExport}
        disabled={isExporting}
        className="export-btn pdf"
      >
        {isExporting ? 'Exporting...' : 'Export PDF'}
      </button>
      
      <button 
        onClick={handleImageExport}
        className="export-btn image"
      >
        Export Image
      </button>
    </div>
  );
};
```

### Custom Export Options

```typescript
// Mobile-optimized export
const exportMobileSchedule = async () => {
  await ExportService.exportScheduleToPDF(
    jobs,
    assignments, 
    resources,
    selectedDate,
    {
      format: 'a4',          // Better for mobile viewing
      orientation: 'portrait', // Optimal for phone screens
      includeHeader: true,
      includeTimestamp: false  // Save space on mobile
    }
  );
};

// Landscape report for detailed view
const exportDetailedReport = async () => {
  await ExportService.exportScheduleToPDF(
    jobs,
    assignments,
    resources, 
    selectedDate,
    {
      format: 'letter',
      orientation: 'landscape',  // More horizontal space
      includeHeader: true,
      includeTimestamp: true
    }
  );
};
```

## Performance Considerations

### Memory Management

- **Canvas Cleanup**: Automatic cleanup of canvas resources
- **Blob URLs**: Immediate revocation after use
- **DOM Class Management**: Reliable export mode class removal
- **Error Recovery**: Clean state restoration on failures

### Optimization Strategies

- **Conditional Rendering**: Export mode hides unnecessary UI elements
- **Resource Preloading**: Ensures all images are loaded before capture
- **Page Break Logic**: Intelligent content flow management
- **Font Optimization**: Uses standard fonts for consistent rendering

## API Reference Summary

### Main Export Methods

| Method | Purpose | Parameters | Returns |
|--------|---------|------------|---------|
| `exportScheduleToPDF()` | Export complete schedule | `jobs, assignments, resources, date, options?` | `Promise<void>` |
| `exportJobToPDF()` | Export single job | `job, assignments, resources` | `Promise<void>` |
| `exportScheduleAsImage()` | Export as PNG | `elementId?` | `Promise<void>` |

### Utility Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `addHeader()` | Add PDF header | `void` |
| `addFooter()` | Add PDF footer | `void` |
| `addJobSection()` | Add job content | `number` (next Y position) |
| `groupAssignmentsByRow()` | Group assignments | `Record<string, Assignment[]>` |
| `getJobTypeLabel()` | Get display label | `string` |

The ExportService provides comprehensive export capabilities that maintain professional quality while being flexible enough to handle various use cases and output requirements.