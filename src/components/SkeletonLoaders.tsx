/**
 * Skeleton screen components for better perceived performance
 * during loading states
 */

export const SkeletonTable = () => (
  <div className="animate-pulse overflow-hidden rounded-lg bg-white shadow motion-reduce:animate-none">
    {/* Header */}
    <div className="h-12 bg-gray-300" />
    
    {/* Rows */}
    {[...Array(5)].map((_, i) => (
      <div key={i} className="border-t border-gray-200 flex gap-4 p-4">
        <div className="w-8 h-4 bg-gray-200 rounded" />
        <div className="w-24 h-4 bg-gray-200 rounded" />
        <div className="w-32 h-4 bg-gray-200 rounded" />
        <div className="w-32 h-4 bg-gray-200 rounded" />
        <div className="w-12 h-4 bg-gray-200 rounded" />
        <div className="w-12 h-4 bg-gray-200 rounded" />
        <div className="w-16 h-4 bg-gray-200 rounded" />
        <div className="flex-1 h-4 bg-gray-200 rounded" />
        <div className="w-20 h-4 bg-gray-200 rounded" />
        <div className="w-16 h-4 bg-gray-200 rounded" />
        <div className="w-20 h-4 bg-gray-200 rounded" />
      </div>
    ))}
  </div>
);

export const SkeletonStatistik = () => (
  <div className="animate-pulse rounded-lg bg-white p-6 shadow motion-reduce:animate-none">
    <div className="h-6 w-32 bg-gray-300 rounded mb-4" />
    
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-12 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
    
    <div className="mt-6 pt-4 border-t border-gray-200">
      <div className="h-5 w-40 bg-gray-300 rounded" />
    </div>
  </div>
);

export const SkeletonForm = () => (
  <div className="animate-pulse rounded-lg bg-white p-6 shadow motion-reduce:animate-none">
    <div className="h-6 w-48 bg-gray-300 rounded mb-6" />
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-200 rounded" />
        </div>
      ))}
    </div>
    
    <div className="mt-6 flex gap-3">
      <div className="h-10 w-24 bg-gray-300 rounded" />
      <div className="h-10 w-24 bg-gray-200 rounded" />
    </div>
  </div>
);

export const SkeletonCard = () => (
  <div className="animate-pulse rounded-lg bg-white p-4 shadow motion-reduce:animate-none">
    <div className="h-5 w-32 bg-gray-300 rounded mb-3" />
    <div className="space-y-2">
      <div className="h-4 w-full bg-gray-200 rounded" />
      <div className="h-4 w-3/4 bg-gray-200 rounded" />
    </div>
  </div>
);
