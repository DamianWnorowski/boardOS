import React from 'react';

import { render, screen } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import MagnetCard from '../MagnetCard';
import { magnetManager, MagnetStatus } from '../../../classes/Magnet';

describe('MagnetCard attachments', () => {
  beforeEach(() => {
    magnetManager.magnets.clear();
  });

  it('shows parent vehicle schedule and multi-assignment on attached crew magnet', () => {
    const vehicle = magnetManager.createMagnet('veh1', 'truck', 'Truck 1');
    vehicle.status = MagnetStatus.MultiAssigned;
    vehicle.assignments = [{
      id: 'veh-ass',
      jobId: 'job1',
      rowId: 'trucks',
      position: 0,
      timeSlot: { startTime: '07:00', endTime: '09:00', isFullDay: false },
      attachments: []
    }];
    (vehicle as any).onSite = false; // offsite vehicle should render blue time indicator

    const crew = magnetManager.createMagnet('crew1', 'driver', 'Driver 1');
    crew.status = MagnetStatus.Assigned;
    crew.assignments = [{
      id: 'crew-ass',
      jobId: 'job1',
      rowId: 'crew',
      position: 0,
      timeSlot: { startTime: '09:00', endTime: '11:00', isFullDay: false },
      attachments: []
    }];

    magnetManager.linkMagnets(crew.id, vehicle.id);

    render(
      <DndProvider backend={HTML5Backend}>
        <MagnetCard magnetId={crew.id} isAttached />
      </DndProvider>
    );

    expect(screen.getByText('7:00 AM - 9:00 AM')).toBeInTheDocument();
    expect(screen.queryByText('9:00 AM - 11:00 AM')).not.toBeInTheDocument();
    expect(screen.getByTitle('Assigned to multiple jobs - click to manage schedule')).toBeInTheDocument();
    expect(screen.getByText('7:00 AM - 9:00 AM')).toHaveClass('bg-blue-500');
  });

  it('ignores crew schedule and multi-assignment when parent lacks them', () => {
    const vehicle = magnetManager.createMagnet('veh2', 'truck', 'Truck 2');
    vehicle.status = MagnetStatus.Assigned;
    vehicle.assignments = [{
      id: 'veh-ass2',
      jobId: 'job1',
      rowId: 'trucks',
      position: 0,
      timeSlot: { startTime: '07:00', endTime: '09:00', isFullDay: true },
      attachments: []
    }];
    (vehicle as any).onSite = true;

    const crew = magnetManager.createMagnet('crew2', 'driver', 'Driver 2');
    crew.status = MagnetStatus.MultiAssigned;
    crew.assignments = [{
      id: 'crew-ass2',
      jobId: 'job1',
      rowId: 'crew',
      position: 0,
      timeSlot: { startTime: '09:00', endTime: '11:00', isFullDay: false },
      attachments: []
    }];

    magnetManager.linkMagnets(crew.id, vehicle.id);

    render(
      <DndProvider backend={HTML5Backend}>
        <MagnetCard magnetId={crew.id} isAttached />
      </DndProvider>
    );

    expect(screen.queryByText('9:00 AM - 11:00 AM')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Assigned to multiple jobs - click to manage schedule')).not.toBeInTheDocument();
    expect(screen.queryByText('7:00 AM - 9:00 AM')).not.toHaveClass('bg-blue-500');
  });

  it('uses parent vehicle on-site status to color time indicator on attached crew', () => {
    const vehicle = magnetManager.createMagnet('veh3', 'truck', 'Truck 3');
    vehicle.status = MagnetStatus.Assigned;
    vehicle.assignments = [{
      id: 'veh-ass3',
      jobId: 'job1',
      rowId: 'trucks',
      position: 0,
      timeSlot: { startTime: '07:00', endTime: '09:00', isFullDay: false },
      attachments: []
    }];
    (vehicle as any).onSite = true; // on-site vehicle should render green time indicator

    const crew = magnetManager.createMagnet('crew3', 'driver', 'Driver 3');
    crew.status = MagnetStatus.Assigned;
    crew.assignments = [{
      id: 'crew-ass3',
      jobId: 'job1',
      rowId: 'crew',
      position: 0,
      timeSlot: { startTime: '09:00', endTime: '11:00', isFullDay: false },
      attachments: []
    }];
    (crew as any).onSite = false;

    magnetManager.linkMagnets(crew.id, vehicle.id);

    render(
      <DndProvider backend={HTML5Backend}>
        <MagnetCard magnetId={crew.id} isAttached />
      </DndProvider>
    );

    const timeEl = screen.getByText('7:00 AM - 9:00 AM');
    expect(timeEl).toHaveClass('bg-green-500');
  });
});
