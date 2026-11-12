import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Menu, X, Compass, Sparkles, LayoutDashboard } from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo';
import { Button, SearchInput, Avatar } from '../ui';
import { useApp } from '../../context/AppContext';

export const PublicNavbar: React.FC = () => {
  const { role, currentUser, searchQuery, setSearchQuery, getDashboardPath } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (q: string) => {
    setSearchQuery(q);
    navigate('/courses');
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E6E1F5] transition-shadow duration-200 ${
        scrolled ? 'shadow-purple-nav' : ''
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-2 xl:gap-4">
        {/* Left: Logo + Browse courses */}
        <div className="flex items-center gap-2 xl:gap-5 shrink-0">
          <BrandLogo size="sm" showText />
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1">
            <Link
              to="/courses"
              className={`px-2 xl:px-3.5 py-2 rounded-[10px] text-[14px] xl:text-[15px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                location.pathname.startsWith('/courses')
                  ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                  : 'text-[#1E1B2E] hover:bg-[#F3EFFF] hover:text-[#6D4AE0]'
              }`}
            >
              <Compass className="w-4 h-4 text-[#6D4AE0] shrink-0" />
              <span>Browse courses</span>
            </Link>
            <Link
              to="/design-system"
              className={`px-2 xl:px-3.5 py-2 rounded-[10px] text-[14px] xl:text-[15px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                location.pathname === '/design-system'
                  ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                  : 'text-[#5F5B75] hover:bg-[#F3EFFF] hover:text-[#6D4AE0]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#F59E3B] shrink-0" />
              <span>Design system</span>
            </Link>
          </nav>
        </div>

        {/* Center: Search field */}
        <div className="hidden sm:block flex-1 min-w-0 max-w-xs xl:max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmitSearch={handleSearchSubmit}
            placeholder="Search 12+ courses, topics, or instructors..."
          />
        </div>

        {/* Right: Log in (ghost) + Sign up (primary) + current role dashboard & profile shortcut */}
        <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0">
          {role !== 'guest' && currentUser && (
            <>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 px-1.5 xl:px-2.5 py-1 rounded-[10px] border border-[#E6E1F5] bg-[#FAF8FF] hover:border-[#A78BFA] transition-colors shrink-0"
                title={`Signed in as ${currentUser.name}`}
              >
                <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
                <span className="hidden xl:inline text-[13px] font-bold text-[#1E1B2E] max-w-[110px] truncate">
                  {currentUser.name}
                </span>
              </Link>
              <Link to={getDashboardPath()} className="shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  className="whitespace-nowrap px-2.5 xl:px-3.5"
                  leftIcon={<LayoutDashboard className="w-4 h-4" />}
                >
                  My dashboard
                </Button>
              </Link>
            </>
          )}
          <Link to="/login" className="shrink-0">
            <Button variant="ghost" size="md" className="whitespace-nowrap px-3 xl:px-4">
              Log in
            </Button>
          </Link>
          <Link to="/signup" className="shrink-0">
            <Button variant="primary" size="md" className="whitespace-nowrap px-3 xl:px-4">
              Sign up
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="lg:hidden w-11 h-11 flex items-center justify-center rounded-[10px] text-[#1E1B2E] hover:bg-[#F3EFFF] border border-[#E6E1F5] cursor-pointer shrink-0"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Responsive Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#E6E1F5] px-4 pt-3 pb-6 space-y-4 shadow-purple-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmitSearch={handleSearchSubmit}
            placeholder="Search courses or instructors..."
          />
          <div className="flex flex-col gap-1">
            <Link
              to="/courses"
              className="px-3.5 py-2.5 rounded-[10px] text-[16px] font-semibold text-[#1E1B2E] hover:bg-[#F3EFFF] flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-[#6D4AE0]" />
              <span>Browse courses</span>
            </Link>
            <Link
              to="/design-system"
              className="px-3.5 py-2.5 rounded-[10px] text-[16px] font-semibold text-[#1E1B2E] hover:bg-[#F3EFFF] flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#F59E3B]" />
              <span>Design system</span>
            </Link>
            {role !== 'guest' && currentUser && (
              <Link
                to={getDashboardPath()}
                className="px-3.5 py-2.5 rounded-[10px] text-[16px] font-semibold text-[#6D4AE0] bg-[#F3EFFF] flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to {role} dashboard</span>
                </span>
                <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E6E1F5]">
            <Link to="/login">
              <Button variant="ghost" fullWidth className="border border-[#E6E1F5]">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" fullWidth>
                Sign up
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
