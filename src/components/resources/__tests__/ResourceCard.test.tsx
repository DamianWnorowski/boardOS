import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ResourceCard from '../ResourceCard';

vi.mock('react-dnd', () => ({
  useDrag: (spec: any) => {
    const { item, end } = spec;
    return [{}, (node: any) => {
      if (node) {
        node.addEventListener('dragstart', () => {
          item && item();
          node.style.opacity = '0.4';
        });
        node.addEventListener('dragend', () => {
          end && end();
          node.style.opacity = '1';
        });
      }
    }];
  },
}));

describe('ResourceCard', () => {
  test('simulates drag interactions', () => {
    const resource = { id: 'r1', name: 'Res', type: 'laborer' } as any;
    render(<ResourceCard resource={resource} isDragging={false} />);
    const card = screen.getByText('Res').parentElement as HTMLElement;
    fireEvent.dragStart(card);
    expect(card.style.opacity).toBe('0.4');
    fireEvent.dragEnd(card);
    expect(card.style.opacity).toBe('1');
  });
});
