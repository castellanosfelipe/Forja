export function PageSkeleton() {
  return (
    <div className="page page-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Preparando tu información de entrenamiento</span>
      <div className="skeleton-heading" aria-hidden="true"><i /><i /><i /></div>
      <div className="skeleton-grid" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => <i key={index} />)}
      </div>
      <div className="skeleton-panel" aria-hidden="true" />
    </div>
  );
}
