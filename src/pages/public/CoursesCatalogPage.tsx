import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Star,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Clock,
  BookOpen,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import {
  Button,
  CourseCard,
  StatusChip,
  Breadcrumbs,
  Pagination,
  Skeleton,
  EmptyState,
  QueryErrorState,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import {
  useCategories,
  useCourses,
  useSearchSuggestions,
} from '../../api/hooks/useCatalog';
import {
  toCatalogSortDto,
  toCourseLanguageDto,
  toCourseLevelDto,
  toDurationBucketDto,
} from '../../api/mappers/course.mapper';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { handleImageError } from '../../utils/imageFallback';

type SortOption = 'popular' | 'newest' | 'rating' | 'price-asc' | 'price-desc';
type PriceMode = 'all' | 'free' | 'paid';
type DurationBucket = '0-2h' | '2-5h' | '5-10h' | '10h+';

const DURATION_OPTIONS: Array<{ id: DurationBucket; label: string }> = [
  { id: '0-2h', label: '0–2 hours' },
  { id: '2-5h', label: '2–5 hours' },
  { id: '5-10h', label: '5–10 hours' },
  { id: '10h+', label: '10+ hours' },
];

const LANGUAGE_OPTIONS = ['English', 'English & Arabic CC', 'Spanish CC'];

export const CoursesCatalogPage: React.FC = () => {
  const { searchQuery, setSearchQuery } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize state from URL query params
  const [queryInput, setQueryInput] = useState<string>(
    () => searchParams.get('q') || searchParams.get('instructor') || searchQuery || ''
  );
  const debouncedQuery = useDebouncedValue(queryInput.trim(), 300);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cat = searchParams.get('category') || searchParams.get('cat');
    return cat ? cat.split(',').filter(Boolean).slice(0, 1) : [];
  });
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(() => {
    const sub = searchParams.get('sub');
    return sub ? sub.split(',').filter(Boolean).slice(0, 1) : [];
  });
  const [expandedCatIds, setExpandedCatIds] = useState<string[]>(['cat-web', 'cat-design', 'cat-data']);
  const [level, setLevel] = useState<string>(() => searchParams.get('level') || 'All');
  const [priceMode, setPriceMode] = useState<PriceMode>(
    () => (searchParams.get('price') as PriceMode) || 'all'
  );
  const [maxPrice, setMaxPrice] = useState<number>(() => {
    const mp = Number(searchParams.get('maxPrice'));
    return !Number.isNaN(mp) && mp > 0 ? mp : 100;
  });
  const [minRating, setMinRating] = useState<number>(() => {
    const r = Number(searchParams.get('rating'));
    return !Number.isNaN(r) && r > 0 ? r : 0;
  });
  const [selectedDurations, setSelectedDurations] = useState<DurationBucket[]>(() => {
    const d = searchParams.get('dur');
    return d ? (d.split(',').slice(0, 1) as DurationBucket[]) : [];
  });
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
    const l = searchParams.get('lang');
    return l ? l.split(',').filter(Boolean).slice(0, 1) : [];
  });
  const [includesCert, setIncludesCert] = useState<boolean>(
    () => searchParams.get('cert') === '1'
  );
  const [includesExam, setIncludesExam] = useState<boolean>(
    () => searchParams.get('exam') === '1'
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    () => (searchParams.get('sort') as SortOption) || 'popular'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    () => (searchParams.get('view') === 'list' ? 'list' : 'grid')
  );
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const p = Number(searchParams.get('page'));
    return !Number.isNaN(p) && p >= 1 ? p : 1;
  });

  // Collapsible filter group states
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    category: true,
    level: true,
    price: true,
    rating: true,
    duration: true,
    language: true,
    features: true,
  });

  // Search suggestions dropdown & recent searches
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'React 19',
    'Python for Data Science',
    'Figma Variables',
    'Ethical Hacking',
  ]);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  // Mobile bottom-sheet filter drawer state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const mobileFilterRef = useDialogA11y(mobileFilterOpen, () => setMobileFilterOpen(false));

  // Skeleton loading state
  const [isSimulatingLoading, setIsSimulatingLoading] = useState(false);

  // Reset to page 1 only when debounced query text actually changes after mount
  const prevDebouncedQueryRef = useRef(debouncedQuery);
  useEffect(() => {
    if (prevDebouncedQueryRef.current !== debouncedQuery) {
      prevDebouncedQueryRef.current = debouncedQuery;
      setCurrentPage(1);
    }
  }, [debouncedQuery]);

  // Sync incoming URL changes (e.g. when clicking category link from Home or Navbar)
  useEffect(() => {
    const incomingCat = searchParams.get('category');
    if (incomingCat && !selectedCategories.includes(incomingCat)) {
      setSelectedCategories([incomingCat]);
    }
    const incomingInstructor = searchParams.get('instructor');
    if (incomingInstructor && incomingInstructor !== queryInput) {
      setQueryInput(incomingInstructor);
    }
  }, [searchParams]);

  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];

  const catalogParams = useMemo(
    () => ({
      q: debouncedQuery || undefined,
      categoryId: selectedCategories[0] || undefined,
      subcategoryId: selectedSubcategories[0] || undefined,
      level: level !== 'All' ? toCourseLevelDto(level) : undefined,
      price: priceMode !== 'all' ? priceMode : undefined,
      maxPrice: maxPrice < 100 ? maxPrice : undefined,
      minRating: minRating > 0 ? minRating : undefined,
      duration: selectedDurations[0] ? toDurationBucketDto(selectedDurations[0]) : undefined,
      language: selectedLanguages[0] ? toCourseLanguageDto(selectedLanguages[0]) : undefined,
      hasCertificate: includesCert ? true : undefined,
      hasExam: includesExam ? true : undefined,
      sort: toCatalogSortDto(sortBy),
      page: currentPage,
      limit: 12,
    }),
    [
      debouncedQuery,
      selectedCategories,
      selectedSubcategories,
      level,
      priceMode,
      maxPrice,
      minRating,
      selectedDurations,
      selectedLanguages,
      includesCert,
      includesExam,
      sortBy,
      currentPage,
    ]
  );

  const coursesQuery = useCourses(catalogParams);
  const suggestionsQuery = useSearchSuggestions(debouncedQuery, searchFocused);
  const displayedCourses = coursesQuery.data?.items ?? [];
  const totalCourses = coursesQuery.data?.meta.total ?? displayedCourses.length;
  const totalPages = Math.max(1, coursesQuery.data?.meta.totalPages ?? 1);
  const pageLimit = coursesQuery.data?.meta.limit ?? 12;
  const rangeStart = totalCourses === 0 ? 0 : (currentPage - 1) * pageLimit + 1;
  const rangeEnd = Math.min(currentPage * pageLimit, totalCourses);

  // Sync filter state to URL query parameters
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (queryInput.trim()) nextParams.set('q', queryInput.trim());
    if (selectedCategories.length > 0) nextParams.set('cat', selectedCategories.join(','));
    if (selectedSubcategories.length > 0) nextParams.set('sub', selectedSubcategories.join(','));
    if (level !== 'All') nextParams.set('level', level);
    if (priceMode !== 'all') nextParams.set('price', priceMode);
    if (maxPrice < 100) nextParams.set('maxPrice', String(maxPrice));
    if (minRating > 0) nextParams.set('rating', String(minRating));
    if (selectedDurations.length > 0) nextParams.set('dur', selectedDurations.join(','));
    if (selectedLanguages.length > 0) nextParams.set('lang', selectedLanguages.join(','));
    if (includesCert) nextParams.set('cert', '1');
    if (includesExam) nextParams.set('exam', '1');
    if (sortBy !== 'popular') nextParams.set('sort', sortBy);
    if (viewMode !== 'grid') nextParams.set('view', viewMode);
    if (currentPage > 1) nextParams.set('page', String(currentPage));

    setSearchParams(nextParams, { replace: true });
    setSearchQuery(queryInput);
  }, [
    queryInput,
    selectedCategories,
    selectedSubcategories,
    level,
    priceMode,
    maxPrice,
    minRating,
    selectedDurations,
    selectedLanguages,
    includesCert,
    includesExam,
    sortBy,
    viewMode,
    currentPage,
  ]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategory = (catId: string) => {
    setCurrentPage(1);
    setSelectedCategories((prev) => {
      const next = prev.includes(catId) ? [] : [catId];
      if (!next.includes(catId)) {
        setSelectedSubcategories([]);
      }
      return next;
    });
  };

  const toggleSubcategory = (subId: string) => {
    setCurrentPage(1);
    setSelectedSubcategories((prev) => (prev.includes(subId) ? [] : [subId]));
  };

  const toggleDuration = (bucket: DurationBucket) => {
    setCurrentPage(1);
    setSelectedDurations((prev) => (prev.includes(bucket) ? [] : [bucket]));
  };

  const toggleLanguage = (lang: string) => {
    setCurrentPage(1);
    setSelectedLanguages((prev) => (prev.includes(lang) ? [] : [lang]));
  };

  const handleResetAllFilters = () => {
    setQueryInput('');
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setLevel('All');
    setPriceMode('all');
    setMaxPrice(100);
    setMinRating(0);
    setSelectedDurations([]);
    setSelectedLanguages([]);
    setIncludesCert(false);
    setIncludesExam(false);
    setSortBy('popular');
    setCurrentPage(1);
  };

  // Suggestions for search dropdown
  const suggestionCourses = (suggestionsQuery.data?.courses ?? displayedCourses).slice(0, 4);
  const suggestionCategories = (suggestionsQuery.data?.categories ?? categories).slice(0, 4);

  // Build removable active filter chips
  const activeFilterChips: Array<{ id: string; label: string; onRemove: () => void }> = [];

  if (queryInput.trim()) {
    activeFilterChips.push({
      id: 'q',
      label: `Search: "${queryInput.trim()}"`,
      onRemove: () => setQueryInput(''),
    });
  }
  selectedCategories.forEach((catId) => {
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      activeFilterChips.push({
        id: `cat-${catId}`,
        label: cat.name,
        onRemove: () => toggleCategory(catId),
      });
    }
  });
  selectedSubcategories.forEach((subId) => {
    const allSubs = categories.flatMap((cat) => cat.subcategories);
    const sub = allSubs.find((s) => s.id === subId);
    if (sub) {
      activeFilterChips.push({
        id: `sub-${subId}`,
        label: sub.name,
        onRemove: () => toggleSubcategory(subId),
      });
    }
  });
  if (level !== 'All') {
    activeFilterChips.push({
      id: 'level',
      label: `Level: ${level}`,
      onRemove: () => setLevel('All'),
    });
  }
  if (priceMode !== 'all') {
    activeFilterChips.push({
      id: 'priceMode',
      label: priceMode === 'free' ? 'Free courses' : 'Paid courses',
      onRemove: () => setPriceMode('all'),
    });
  }
  if (maxPrice < 100) {
    activeFilterChips.push({
      id: 'maxPrice',
      label: `Up to $${maxPrice}`,
      onRemove: () => setMaxPrice(100),
    });
  }
  if (minRating > 0) {
    activeFilterChips.push({
      id: 'rating',
      label: `${minRating}+ stars`,
      onRemove: () => setMinRating(0),
    });
  }
  selectedDurations.forEach((dur) => {
    activeFilterChips.push({
      id: `dur-${dur}`,
      label: `Duration: ${dur}`,
      onRemove: () => toggleDuration(dur),
    });
  });
  selectedLanguages.forEach((lang) => {
    activeFilterChips.push({
      id: `lang-${lang}`,
      label: lang,
      onRemove: () => toggleLanguage(lang),
    });
  });
  if (includesCert) {
    activeFilterChips.push({
      id: 'cert',
      label: 'Includes certificate',
      onRemove: () => setIncludesCert(false),
    });
  }
  if (includesExam) {
    activeFilterChips.push({
      id: 'exam',
      label: 'Includes final exam',
      onRemove: () => setIncludesExam(false),
    });
  }

  const hasAnyFilter = activeFilterChips.length > 0;

  // Filter Sidebar Content (reused in Desktop left column & Mobile bottom-sheet drawer)
  const renderFilterSidebarContent = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[#E6E1F5]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#6D4AE0]" />
          <h2 className="font-display font-bold text-[18px] text-[#1E1B2E]">Filters</h2>
        </div>
        <button
          type="button"
          onClick={handleResetAllFilters}
          className="text-[13px] font-bold text-[#6D4AE0] hover:underline cursor-pointer"
        >
          Clear all
        </button>
      </div>

      {/* 1. Category (checkboxes with counts, expandable subcategories) */}
      <div className="border-b border-[#E6E1F5] pb-4 space-y-2.5">
        <button
          type="button"
          onClick={() => toggleGroup('category')}
          className="w-full flex items-center justify-between font-display font-bold text-[16px] text-[#1E1B2E] cursor-pointer"
        >
          <span>Category</span>
          <ChevronDown
            className={`w-4 h-4 text-[#5F5B75] transition-transform ${
              openGroups.category ? 'rotate-180' : ''
            }`}
          />
        </button>
        {openGroups.category && (
          <div className="space-y-2 pt-1">
            {categories.map((cat) => {
              const subs = cat.subcategories || [];
              const isExpanded = expandedCatIds.includes(cat.id);
              const isChecked = selectedCategories.includes(cat.id);
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[14px]">
                    <label className="flex items-center gap-2.5 text-[#1E1B2E] cursor-pointer select-none flex-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat.id)}
                        className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                      />
                      <span className={isChecked ? 'font-bold text-[#6D4AE0]' : ''}>
                        {cat.name}
                      </span>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-[#5F5B75]">({cat.courseCount})</span>
                      {subs.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCatIds((prev) =>
                              prev.includes(cat.id)
                                ? prev.filter((id) => id !== cat.id)
                                : [...prev, cat.id]
                            )
                          }
                          className="p-0.5 rounded hover:bg-[#F3EFFF] text-[#5F5B75] cursor-pointer"
                          aria-label={`Toggle ${cat.name} subcategories`}
                        >
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform ${
                              isExpanded ? 'rotate-90 text-[#6D4AE0]' : ''
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable subcategories */}
                  {isExpanded && subs.length > 0 && (
                    <div className="pl-6 space-y-1.5 border-l-2 border-[#F3EFFF] ml-2">
                      {subs.map((sub) => {
                        const subChecked = selectedSubcategories.includes(sub.id);
                        return (
                          <label
                            key={sub.id}
                            className="flex items-center justify-between gap-2 text-[13px] text-[#5F5B75] hover:text-[#1E1B2E] cursor-pointer select-none"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={subChecked}
                                onChange={() => toggleSubcategory(sub.id)}
                                className="accent-[#6D4AE0] w-3.5 h-3.5 rounded cursor-pointer"
                              />
                              <span className={subChecked ? 'font-bold text-[#6D4AE0]' : ''}>
                                {sub.name}
                              </span>
                            </span>
                            <span className="text-[11px]">({sub.count})</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Level (All, Beginner, Intermediate, Advanced) */}
      <div className="border-b border-[#E6E1F5] pb-4 space-y-2.5">
        <button
          type="button"
          onClick={() => toggleGroup('level')}
          className="w-full flex items-center justify-between font-display font-bold text-[16px] text-[#1E1B2E] cursor-pointer"
        >
          <span>Level</span>
          <ChevronDown
            className={`w-4 h-4 text-[#5F5B75] transition-transform ${
              openGroups.level ? 'rotate-180' : ''
            }`}
          />
        </button>
        {openGroups.level && (
          <div className="space-y-1.5 pt-1">
            {(['All', 'Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
              <label
                key={lvl}
                className="flex items-center justify-between text-[14px] text-[#1E1B2E] cursor-pointer select-none"
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="course-level"
                    checked={level === lvl}
                    onChange={() => {
                      setLevel(lvl);
                      setCurrentPage(1);
                    }}
                    className="accent-[#6D4AE0] w-4 h-4 cursor-pointer"
                  />
                  <span className={level === lvl ? 'font-bold text-[#6D4AE0]' : ''}>
                    {lvl}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 3. Price (Free / Paid toggle + range slider) */}
      <div className="border-b border-[#E6E1F5] pb-4 space-y-3">
        <button
          type="button"
          onClick={() => toggleGroup('price')}
          className="w-full flex items-center justify-between font-display font-bold text-[16px] text-[#1E1B2E] cursor-pointer"
        >
          <span>Price</span>
          <ChevronDown
            className={`w-4 h-4 text-[#5F5B75] transition-transform ${
              openGroups.price ? 'rotate-180' : ''
            }`}
          />
        </button>
        {openGroups.price && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'free', label: 'Free' },
                  { id: 'paid', label: 'Paid' },
                ] as const
              ).map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => {
                    setPriceMode(pm.id);
                    setCurrentPage(1);
                  }}
                  className={`py-1.5 rounded-[8px] text-[13px] font-semibold transition-all cursor-pointer ${
                    priceMode === pm.id
                      ? 'bg-[#6D4AE0] text-white shadow-xs'
                      : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#5F5B75]">Max price range</span>
                <span className="font-display font-bold text-[#6D4AE0]">
                  Up to ${maxPrice}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full accent-[#6D4AE0] cursor-pointer"
                aria-label="Maximum price slider"
              />
              <div className="flex justify-between text-[11px] text-[#5F5B75]">
                <span>$0 (Free)</span>
                <span>$50</span>
                <span>$100+</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Rating (4.5+, 4.0+, 3.5+) */}
      <div className="border-b border-[#E6E1F5] pb-4 space-y-2.5">
        <button
          type="button"
          onClick={() => toggleGroup('rating')}
          className="w-full flex items-center justify-between font-display font-bold text-[16px] text-[#1E1B2E] cursor-pointer"
        >
          <span>Rating</span>
          <ChevronDown
            className={`w-4 h-4 text-[#5F5B75] transition-transform ${
              openGroups.rating ? 'rotate-180' : ''
            }`}
          />
        </button>
        {openGroups.rating && (
          <div className="space-y-2 pt-1">
            {[4.5, 4.0, 3.5].map((rVal) => (
              <label
                key={rVal}
                className="flex items-center justify-between text-[14px] text-[#1E1B2E] cursor-pointer select-none"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="course-rating"
                    checked={minRating === rVal}
                    onChange={() => {
                      setMinRating(rVal);
                      setCurrentPage(1);
                    }}
                    className="accent-[#6D4AE0] w-4 h-4 cursor-pointer"
                  />
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-4 h-4 fill-[#F5B82E] text-[#F5B82E]" />
                    <span className={minRating === rVal ? 'font-bold text-[#6D4AE0]' : ''}>
                      {rVal.toFixed(1)} & up
                    </span>
                  </span>
                </span>
              </label>
            ))}
            {minRating > 0 && (
              <button
                type="button"
                onClick={() => setMinRating(0)}
                className="text-[12px] font-semibold text-[#6D4AE0] hover:underline cursor-pointer"
              >
                Any rating
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Duration (0-2h, 2-5h, 5-10h, 10h+) */}
      <div className="border-b border-[#E6E1F5] pb-4 space-y-2.5">
        <button
          type="button"
          onClick={() => toggleGroup('duration')}
          className="w-full flex items-center justify-between font-display font-bold text-[16px] text-[#1E1B2E] cursor-pointer"
        >
          <span>Video duration</span>
          <ChevronDown
            className={`w-4 h-4 text-[#5F5B75] transition-transform ${
              openGroups.duration ? 'rotate-180' : ''
            }`}
          />
        </button>
        {openGroups.duration && (
          <div className="space-y-2 pt-1">
            {DURATION_OPTIONS.map((d) => {
              const checked = selectedDurations.includes(d.id);
              return (
                <label
                  key={d.id}
                  className="flex items-center gap-2.5 text-[14px] text-[#1E1B2E] cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDuration(d.id)}
                    className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                  />
                  <span className={checked ? 'font-bold text-[#6D4AE0]' : ''}>
                    {d.label}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Language */}
      <div className="border-b border-[#E6E1F5] pb-4 space-y-2.5">
        <button
          type="button"
          onClick={() => toggleGroup('language')}
          className="w-full flex items-center justify-between font-display font-bold text-[16px] text-[#1E1B2E] cursor-pointer"
        >
          <span>Language</span>
          <ChevronDown
            className={`w-4 h-4 text-[#5F5B75] transition-transform ${
              openGroups.language ? 'rotate-180' : ''
            }`}
          />
        </button>
        {openGroups.language && (
          <div className="space-y-2 pt-1">
            {LANGUAGE_OPTIONS.map((lang) => {
              const checked = selectedLanguages.includes(lang);
              return (
                <label
                  key={lang}
                  className="flex items-center gap-2.5 text-[14px] text-[#1E1B2E] cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleLanguage(lang)}
                    className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
                  />
                  <span className={checked ? 'font-bold text-[#6D4AE0]' : ''}>{lang}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Toggles: Includes certificate, Includes final exam */}
      <div className="space-y-3">
        <p className="font-display font-bold text-[16px] text-[#1E1B2E]">
          Course features
        </p>
        <label className="flex items-center justify-between gap-2 text-[14px] text-[#1E1B2E] cursor-pointer select-none">
          <span>Includes certificate</span>
          <input
            type="checkbox"
            checked={includesCert}
            onChange={(e) => {
              setIncludesCert(e.target.checked);
              setCurrentPage(1);
            }}
            className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-[14px] text-[#1E1B2E] cursor-pointer select-none">
          <span>Includes final exam</span>
          <input
            type="checkbox"
            checked={includesExam}
            onChange={(e) => {
              setIncludesExam(e.target.checked);
              setCurrentPage(1);
            }}
            className="accent-[#6D4AE0] w-4 h-4 rounded cursor-pointer"
          />
        </label>
      </div>
    </div>
  );

  const handleApplyRecentOrSuggestion = (term: string) => {
    setQueryInput(term);
    if (!recentSearches.includes(term)) {
      setRecentSearches((prev) => [term, ...prev.slice(0, 4)]);
    }
    setSearchFocused(false);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER BAND */}
      <section className="bg-[#F3EFFF] border-b border-[#E6E1F5] py-8 sm:py-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-5">
          <Breadcrumbs items={[{ label: 'All courses' }]} />

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E]">
                  All courses
                </h1>
                <StatusChip
                  label={`${totalCourses} results`}
                  variant="primary"
                  className="bg-white"
                />
              </div>
              <p className="text-[16px] text-[#5F5B75]">
                Explore hands-on video courses, track your progress, and earn verified certificates.
              </p>
            </div>
          </div>

          {/* Large Search Bar with Suggestions Dropdown */}
          <div ref={searchBoxRef} className="relative max-w-3xl">
            <div className="flex items-center bg-white rounded-[12px] border-2 border-[#E6E1F5] focus-within:border-[#6D4AE0] shadow-purple-md p-1.5">
              <Search className="w-5 h-5 text-[#6D4AE0] ml-3.5 shrink-0" />
              <input
                type="text"
                value={queryInput}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setQueryInput(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && queryInput.trim()) {
                    handleApplyRecentOrSuggestion(queryInput.trim());
                  }
                }}
                placeholder="Search courses, skills, topics, or instructors (e.g. React, Python, Salma Nabil)..."
                aria-label="Search courses, skills, topics, or instructors"
                className="w-full h-11 px-3.5 text-[16px] text-[#1E1B2E] placeholder:text-[#5F5B75] focus:outline-none"
              />
              {queryInput && (
                <button
                  type="button"
                  onClick={() => setQueryInput('')}
                  className="w-11 h-11 flex items-center justify-center text-[#5F5B75] hover:text-[#1E1B2E] rounded-full hover:bg-[#F3EFFF] cursor-pointer shrink-0"
                  aria-label="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={() => setSearchFocused(false)}
              >
                Search
              </Button>
            </div>

            {/* Suggestions Dropdown: Recent Searches, Matching Courses & Categories */}
            {searchFocused && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-lg p-4 z-40 space-y-4">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[12px] font-bold text-[#5F5B75]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#6D4AE0]" />
                        Recent searches
                      </span>
                      <button
                        type="button"
                        onClick={() => setRecentSearches([])}
                        className="text-[#6D4AE0] hover:underline cursor-pointer"
                      >
                        Clear history
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <span
                          key={term}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8FF] border border-[#E6E1F5] text-[13px] font-semibold text-[#1E1B2E]"
                        >
                          <button
                            type="button"
                            onClick={() => handleApplyRecentOrSuggestion(term)}
                            className="hover:text-[#6D4AE0] cursor-pointer"
                          >
                            {term}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRecentSearches((prev) => prev.filter((t) => t !== term))
                            }
                            className="text-[#5F5B75] hover:text-[#DC2626] cursor-pointer"
                            aria-label={`Remove ${term}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching Categories */}
                <div className="space-y-2 pt-2 border-t border-[#E6E1F5]">
                  <p className="text-[12px] font-bold text-[#5F5B75]">
                    Matching categories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestionCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (!selectedCategories.includes(cat.id)) {
                            toggleCategory(cat.id);
                          }
                          setSearchFocused(false);
                        }}
                        className="px-3 py-1.5 rounded-[10px] bg-[#F3EFFF] hover:bg-[#E6E1F5] text-[#3F2A9E] text-[13px] font-semibold transition-colors cursor-pointer"
                      >
                        {cat.name} ({cat.courseCount})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matching Courses */}
                <div className="space-y-2 pt-2 border-t border-[#E6E1F5]">
                  <p className="text-[12px] font-bold text-[#5F5B75]">
                    Matching courses
                  </p>
                  <div className="divide-y divide-[#E6E1F5]">
                    {suggestionCourses.map((c) => (
                      <Link
                        key={c.id}
                        to={`/courses/${c.id}`}
                        onClick={() => setSearchFocused(false)}
                        className="py-2.5 px-2 rounded-[8px] hover:bg-[#FAF8FF] flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={c.thumbnail}
                            alt={c.title}
                            onError={handleImageError}
                            className="w-12 h-9 rounded-[6px] object-cover shrink-0 border border-[#E6E1F5]"
                          />
                          <div className="min-w-0">
                            <p className="font-display font-bold text-[15px] text-[#1E1B2E] truncate">
                              {c.title}
                            </p>
                            <p className="text-[12px] text-[#5F5B75] truncate">
                              {c.instructorName} • {c.categoryName}
                            </p>
                          </div>
                        </div>
                        <span className="font-display font-bold text-[15px] text-[#6D4AE0] shrink-0">
                          {c.price === 0 || c.isFree ? 'Free' : `$${c.price.toFixed(2)}`}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MAIN CATALOG BODY: Left Sidebar + Right Toolbar & Results */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Desktop Left Filter Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 rounded-[12px] bg-white border border-[#E6E1F5] p-5 shadow-purple-sm sticky top-24">
          {renderFilterSidebarContent()}
        </aside>

        {/* Right Content Column */}
        <div className="lg:col-span-9 space-y-6">
          {/* Toolbar: Mobile Filter Trigger, Sort Select, Grid/List Toggle & Skeleton Demo */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Mobile Bottom-Sheet Filter Drawer Trigger */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="lg:hidden"
                  leftIcon={<SlidersHorizontal className="w-4 h-4" />}
                  onClick={() => setMobileFilterOpen(true)}
                >
                  Filters {activeFilterChips.length > 0 ? `(${activeFilterChips.length})` : ''}
                </Button>

                <button
                  type="button"
                  onClick={() => setIsSimulatingLoading((v) => !v)}
                  className={`h-9 px-3 rounded-[10px] text-[12px] font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    isSimulatingLoading
                      ? 'bg-[#6D4AE0] text-white border-[#6D4AE0]'
                      : 'bg-[#FAF8FF] text-[#5F5B75] border-[#E6E1F5] hover:text-[#1E1B2E]'
                  }`}
                  title="Toggle loading skeleton state"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E3B]" />
                  <span>{isSimulatingLoading ? 'Showing skeletons' : 'Preview loading state'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                {/* Sort Select */}
                <div className="flex items-center gap-2 text-[14px]">
                  <span className="text-[#5F5B75] hidden sm:inline font-medium">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Sort courses by"
                    className="h-11 pl-3 pr-8 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] text-[#1E1B2E] font-semibold text-[14px] focus:outline-none focus:border-[#6D4AE0] cursor-pointer"
                  >
                    <option value="popular">Most popular</option>
                    <option value="newest">Newest</option>
                    <option value="rating">Highest rated</option>
                    <option value="price-asc">Price low to high</option>
                    <option value="price-desc">Price high to low</option>
                  </select>
                </div>

                {/* Grid / List Toggle */}
                <div
                  role="group"
                  aria-label="View layout toggle"
                  className="inline-flex items-center p-1 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5]"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                    className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-[#6D4AE0] text-white shadow-2xs'
                        : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                    className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-[#6D4AE0] text-white shadow-2xs'
                        : 'text-[#5F5B75] hover:text-[#1E1B2E]'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Removable Active-Filter Chips */}
            {hasAnyFilter && (
              <div className="pt-3 border-t border-[#E6E1F5] flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-semibold text-[#5F5B75]">
                  Active filters:
                </span>
                {activeFilterChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3EFFF] border border-[#E6E1F5] text-[12px] font-bold text-[#3F2A9E]"
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      className="text-[#6D4AE0] hover:text-[#DC2626] cursor-pointer"
                      aria-label={`Remove filter ${chip.label}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="text-[12px] font-bold text-[#DC2626] hover:underline ml-1 cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear all</span>
                </button>
              </div>
            )}
          </div>

          {/* RESULTS AREA: Loading Skeleton Grid, Error, Empty State, or Course Cards */}
          {coursesQuery.isError ? (
            <QueryErrorState
              title="Could not load courses"
              error={coursesQuery.error}
              onRetry={() => void coursesQuery.refetch()}
            />
          ) : coursesQuery.isPending || isSimulatingLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, idx) => (
                <Skeleton key={idx} variant="card" />
              ))}
            </div>
          ) : displayedCourses.length === 0 ? (
            <EmptyState
              title="No courses found"
              description="No courses matched your active search query and filter combination. Reset your filters to browse all courses."
              actionLabel="Reset filters"
              onAction={handleResetAllFilters}
              mood="empty"
            />
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {displayedCourses.map((course) => (
                <CourseCard key={course.id} course={course} layout="list" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayedCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  showHoverPreview
                  layout="grid"
                />
              ))}
            </div>
          )}

          {/* PAGINATION */}
          {displayedCourses.length > 0 && !coursesQuery.isPending && !isSimulatingLoading && (
            <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-4 shadow-purple-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[14px] text-[#5F5B75] font-medium">
                Showing{' '}
                <strong className="text-[#1E1B2E]">
                  {rangeStart}–{rangeEnd}
                </strong>{' '}
                of{' '}
                <strong className="text-[#1E1B2E]">
                  {totalCourses}
                </strong>{' '}
                courses
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM-SHEET FILTER DRAWER (< lg) */}
      {mobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-[#1E1B2E]/55 backdrop-blur-xs">
          <div className="flex-1" onClick={() => setMobileFilterOpen(false)} />
          <div
            ref={mobileFilterRef}
            role="dialog"
            aria-modal="true"
            aria-label="Course filters"
            tabIndex={-1}
            className="w-full max-h-[85dvh] rounded-t-[20px] bg-white border-t border-[#E6E1F5] shadow-purple-lg flex flex-col overflow-hidden focus:outline-none"
          >
            <div className="px-5 py-4 border-b border-[#E6E1F5] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#6D4AE0]" />
                <h3 className="font-display font-bold text-[20px] text-[#1E1B2E]">
                  Filter courses
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-11 h-11 -mr-2 flex items-center justify-center rounded-[10px] text-[#5F5B75] hover:bg-[#F3EFFF] cursor-pointer"
                aria-label="Close filter drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 min-h-0 overflow-y-auto">
              {renderFilterSidebarContent()}
            </div>

            <div className="p-4 bg-[#FAF8FF] border-t border-[#E6E1F5] grid grid-cols-2 gap-3 shrink-0 sticky bottom-0">
              <Button
                variant="ghost"
                fullWidth
                className="border border-[#E6E1F5] bg-white"
                onClick={handleResetAllFilters}
              >
                Clear
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => setMobileFilterOpen(false)}
              >
                Apply ({totalCourses})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
