import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EquipmentCheckboxList from '../EquipmentCheckboxList';

describe('EquipmentCheckboxList', () => {
  const mockOnEquipmentToggle = vi.fn();

  beforeEach(() => {
    mockOnEquipmentToggle.mockClear();
  });

  it('renders all equipment types', () => {
    render(
      <EquipmentCheckboxList
        selectedEquipment={[]}
        onEquipmentToggle={mockOnEquipmentToggle}
      />
    );

    // Check that all equipment types are rendered
    expect(screen.getByText('Skidsteer')).toBeInTheDocument();
    expect(screen.getByText('Paver')).toBeInTheDocument();
    expect(screen.getByText('Excavator')).toBeInTheDocument();
    expect(screen.getByText('Sweeper')).toBeInTheDocument();
    expect(screen.getByText('Milling Machine')).toBeInTheDocument();
    expect(screen.getByText('Grader')).toBeInTheDocument();
    expect(screen.getByText('Dozer')).toBeInTheDocument();
    expect(screen.getByText('Payloader')).toBeInTheDocument();
    expect(screen.getByText('Roller')).toBeInTheDocument();
    expect(screen.getByText('Other Equipment')).toBeInTheDocument();
  });

  it('shows selected equipment as checked', () => {
    render(
      <EquipmentCheckboxList
        selectedEquipment={['paver', 'roller']}
        onEquipmentToggle={mockOnEquipmentToggle}
      />
    );

    const paverContainer = screen.getByText('Paver').closest('label');
    const rollerContainer = screen.getByText('Roller').closest('label');
    const excavatorContainer = screen.getByText('Excavator').closest('label');

    // Check that selected items have proper styling
    expect(paverContainer).toHaveClass('border-blue-500', 'bg-blue-50');
    expect(rollerContainer).toHaveClass('border-blue-500', 'bg-blue-50');
    expect(excavatorContainer).toHaveClass('border-gray-200');
  });

  it('calls onEquipmentToggle when equipment is clicked', () => {
    render(
      <EquipmentCheckboxList
        selectedEquipment={[]}
        onEquipmentToggle={mockOnEquipmentToggle}
      />
    );

    const paverContainer = screen.getByText('Paver').closest('label')!;
    fireEvent.click(paverContainer);

    expect(mockOnEquipmentToggle).toHaveBeenCalledWith('paver');
  });

  it('shows warning when no equipment is selected', () => {
    render(
      <EquipmentCheckboxList
        selectedEquipment={[]}
        onEquipmentToggle={mockOnEquipmentToggle}
      />
    );

    expect(screen.getByText('No equipment selected - operator cannot operate any equipment')).toBeInTheDocument();
  });

  it('does not show warning when equipment is selected', () => {
    render(
      <EquipmentCheckboxList
        selectedEquipment={['paver']}
        onEquipmentToggle={mockOnEquipmentToggle}
      />
    );

    expect(screen.queryByText('No equipment selected - operator cannot operate any equipment')).not.toBeInTheDocument();
  });

  it('disables interaction when disabled prop is true', () => {
    render(
      <EquipmentCheckboxList
        selectedEquipment={[]}
        onEquipmentToggle={mockOnEquipmentToggle}
        disabled={true}
      />
    );

    const paverContainer = screen.getByText('Paver').closest('label')!;
    fireEvent.click(paverContainer);

    // Should not call toggle when disabled
    expect(mockOnEquipmentToggle).not.toHaveBeenCalled();
    
    // Should have disabled styling
    expect(paverContainer).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('renders checkmark icon for selected equipment', () => {
    render(
      <EquipmentCheckboxList
        selectedEquipment={['paver']}
        onEquipmentToggle={mockOnEquipmentToggle}
      />
    );

    // The Check icon should be present for selected paver
    const paverContainer = screen.getByText('Paver').closest('label')!;
    const checkIcon = paverContainer.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
  });
});