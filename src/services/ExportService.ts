import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Job, Assignment, Resource } from '../types';

interface ExportOptions {
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  includeHeader?: boolean;
  includeTimestamp?: boolean;
}

class ExportService {
  /**
   * Export the current schedule to PDF
   */
  static async exportScheduleToPDF(
    jobs: Job[],
    assignments: Assignment[],
    resources: Resource[],
    selectedDate: Date,
    options: ExportOptions = {}
  ): Promise<void> {
    const {
      format = 'letter',
      orientation = 'portrait',
      includeHeader = true,
      includeTimestamp = true
    } = options;

    try {
      // Create new PDF document
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      });

      // Set document properties
      pdf.setProperties({
        title: `Schedule - ${selectedDate.toLocaleDateString()}`,
        subject: 'Construction Schedule',
        author: 'BoardOS',
        keywords: 'construction, schedule, roadwork',
        creator: 'BoardOS Scheduler'
      });

      // Add header
      if (includeHeader) {
        this.addHeader(pdf, selectedDate);
      }

      // Add job details
      let yPosition = includeHeader ? 40 : 20;
      
      jobs.forEach((job, index) => {
        if (yPosition > 250) { // Check if we need a new page
          pdf.addPage();
          yPosition = 20;
          if (includeHeader) {
            this.addHeader(pdf, selectedDate);
            yPosition = 40;
          }
        }

        yPosition = this.addJobSection(
          pdf,
          job,
          assignments.filter(a => a.jobId === job.id),
          resources,
          yPosition
        );

        yPosition += 5; // Space between jobs
      });

      // Add footer with timestamp
      if (includeTimestamp) {
        this.addFooter(pdf);
      }

      // Save the PDF
      const fileName = `schedule_${selectedDate.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  /**
   * Export specific job to PDF
   */
  static async exportJobToPDF(
    job: Job,
    assignments: Assignment[],
    resources: Resource[]
  ): Promise<void> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    pdf.setProperties({
      title: `Job: ${job.name}`,
      subject: `Job Details - ${job.name}`,
      author: 'BoardOS',
      creator: 'BoardOS Scheduler'
    });

    // Add job header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Job: ${job.name}`, 20, 20);

    if (job.number) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Job #: ${job.number}`, 20, 28);
    }

    // Add job details
    let yPosition = 35;
    yPosition = this.addJobSection(pdf, job, assignments, resources, yPosition);

    // Save the PDF
    const fileName = `job_${job.number || job.id}_${Date.now()}.pdf`;
    pdf.save(fileName);
  }

  /**
   * Export schedule view as image (screenshot)
   */
  static async exportScheduleAsImage(elementId: string = 'board-container'): Promise<void> {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error('Schedule container not found');
      }

      // Temporarily add class for better rendering
      element.classList.add('export-mode');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Remove export mode class
      element.classList.remove('export-mode');

      // Convert to blob and download
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
    } catch (error) {
      console.error('Error exporting as image:', error);
      throw error;
    }
  }

  /**
   * Add header to PDF
   */
  private static addHeader(pdf: jsPDF, date: Date): void {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Construction Schedule', pdf.internal.pageSize.width / 2, 15, { align: 'center' });

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }), pdf.internal.pageSize.width / 2, 25, { align: 'center' });

    // Add horizontal line
    pdf.setLineWidth(0.5);
    pdf.line(20, 30, pdf.internal.pageSize.width - 20, 30);
  }

  /**
   * Add footer to PDF
   */
  private static addFooter(pdf: jsPDF): void {
    const pageCount = pdf.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      // Add page number
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pdf.internal.pageSize.width / 2,
        pdf.internal.pageSize.height - 10,
        { align: 'center' }
      );

      // Add timestamp
      pdf.setFontSize(8);
      pdf.text(
        `Generated: ${new Date().toLocaleString()}`,
        20,
        pdf.internal.pageSize.height - 10
      );
    }
  }

  /**
   * Add job section to PDF
   */
  private static addJobSection(
    pdf: jsPDF,
    job: Job,
    assignments: Assignment[],
    resources: Resource[],
    startY: number
  ): number {
    let yPosition = startY;

    // Job box
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.5);
    pdf.rect(15, yPosition, pdf.internal.pageSize.width - 30, 8);
    
    // Job name and type
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(job.name, 18, yPosition + 5);

    const jobType = this.getJobTypeLabel(job.type);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Type: ${jobType}`, pdf.internal.pageSize.width - 60, yPosition + 5);

    yPosition += 10;

    // Job details
    if (job.location) {
      pdf.setFontSize(10);
      pdf.text(`Location: ${job.location.address || 'N/A'}`, 18, yPosition);
      yPosition += 5;
    }

    if (job.startTime) {
      pdf.text(`Start Time: ${job.startTime}`, 18, yPosition);
      yPosition += 5;
    }

    // Add resources
    if (assignments.length > 0) {
      yPosition += 2;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Assigned Resources:', 18, yPosition);
      yPosition += 5;

      pdf.setFont('helvetica', 'normal');
      
      // Group assignments by row type
      const groupedAssignments = this.groupAssignmentsByRow(assignments);
      
      Object.entries(groupedAssignments).forEach(([rowType, rowAssignments]) => {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`${rowType}:`, 20, yPosition);
        yPosition += 4;
        
        pdf.setFont('helvetica', 'normal');
        rowAssignments.forEach(assignment => {
          const resource = resources.find(r => r.id === assignment.resourceId);
          if (resource) {
            const timeSlot = assignment.timeSlot?.startTime || job.startTime || '07:00';
            pdf.text(`• ${resource.name} - ${timeSlot}`, 25, yPosition);
            yPosition += 4;
          }
        });
        
        yPosition += 2;
      });
    }

    return yPosition;
  }

  /**
   * Get job type label
   */
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

  /**
   * Group assignments by row type
   */
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
}

export default ExportService;