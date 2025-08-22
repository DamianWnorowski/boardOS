import { describe, it, expect, beforeEach } from 'vitest';
import { Magnet, magnetManager, MagnetStatus } from '../Magnet';

describe('Magnet', () => {
  beforeEach(() => {
    magnetManager.magnets.clear();
  });

  it('handles assignment and status transitions', () => {
    const magnet = new Magnet('res1', 'truck', 'Truck 1');

    expect(magnet.status).toBe(MagnetStatus.Available);

    const a1 = magnet.assignToJob('job1', 'row1', 0);
    expect(magnet.assignments).toHaveLength(1);
    expect(magnet.status).toBe(MagnetStatus.Assigned);

    const a2 = magnet.assignToJob('job2', 'row1', 1);
    expect(magnet.assignments).toHaveLength(2);
    expect(magnet.status).toBe(MagnetStatus.MultiAssigned);

    magnet.removeAssignment(a2);
    expect(magnet.assignments).toHaveLength(1);
    expect(magnet.status).toBe(MagnetStatus.Assigned);

    magnet.removeAssignment(a1);
    expect(magnet.assignments).toHaveLength(0);
    expect(magnet.status).toBe(MagnetStatus.Available);
  });

  it('handles attaching and detaching magnets', () => {
    const equipment = magnetManager.createMagnet('eq1', 'paver', 'Paver');
    const worker = magnetManager.createMagnet('w1', 'laborer', 'Worker');

    const linked = magnetManager.linkMagnets(worker.id, equipment.id);
    expect(linked).toBe(true);
    expect(equipment.attachments).toContain(worker.id);
    expect(worker.isAttached).toBe(true);
    expect(worker.attachedToId).toBe(equipment.id);

    const unlinked = magnetManager.unlinkMagnets(worker.id, equipment.id);
    expect(unlinked).toBe(true);
    expect(equipment.attachments).not.toContain(worker.id);
    expect(worker.isAttached).toBe(false);
    expect(worker.attachedToId).toBeUndefined();
  });
});
