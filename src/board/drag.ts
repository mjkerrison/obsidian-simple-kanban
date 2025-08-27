// Basic HTML5 drag helpers
export function makeDraggable(el: HTMLElement, payload: { taskId: string; fromColId: string }) {
  el.setAttr('draggable', 'true');
  el.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer?.setData('application/simple-kanban', JSON.stringify(payload));
    e.dataTransfer?.setDragImage(el, 10, 10);
    el.addClass('is-dragging');
  });
  el.addEventListener('dragend', () => {
    el.removeClass('is-dragging');
  });
}

export function makeDropZone(
  el: HTMLElement,
  opts: {
    canDrop?: () => boolean;
    onDrop: (data: { taskId: string; fromColId: string }) => void;
  }
) {
  const canDrop = () => (opts.canDrop ? opts.canDrop() : true);
  el.addEventListener('dragover', (e) => {
    if (!canDrop()) return;
    e.preventDefault();
    el.addClass('is-dropover');
  });
  el.addEventListener('dragenter', (e) => {
    if (!canDrop()) return;
    e.preventDefault();
    el.addClass('is-dropover');
  });
  el.addEventListener('dragleave', () => {
    el.removeClass('is-dropover');
  });
  el.addEventListener('drop', (e) => {
    el.removeClass('is-dropover');
    if (!canDrop()) return;
    e.preventDefault();
    const raw = e.dataTransfer?.getData('application/simple-kanban') || e.dataTransfer?.getData('text/plain');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data && data.taskId) opts.onDrop(data);
    } catch {
      // ignore
    }
  });
}
