export function SkeletonLine({ w = 'w-full', h = 'h-4' }) {
  return <div className={`${w} ${h} bg-gray-200 rounded animate-pulse`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
      <SkeletonLine w="w-1/3" h="h-3" />
      <SkeletonLine w="w-full" h="h-6" />
      <SkeletonLine w="w-2/3" h="h-3" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
      <SkeletonLine w="w-24" h="h-3" />
      <SkeletonLine w="w-32" h="h-3" />
      <SkeletonLine w="w-40" h="h-3" />
      <SkeletonLine w="w-16" h="h-5" />
    </div>
  );
}
