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
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
        {/* Left: Logo + Browse courses */}
        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          <BrandLogo size="sm" showText />
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/courses"
              className={`px-3.5 py-2 rounded-[10px] text-[15px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                location.pathname.startsWith('/courses')
                  ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                  : 'text-[#1E1B2E] hover:bg-[#F3EFFF] hover:text-[#6D4AE0]'
              }`}
            >
              <Compass className="w-4 h-4 text-[#6D4AE0]" />
              <span>Browse courses</span>
            </Link>
            <Link
              to="/design-system"
              className={`px-3.5 py-2 rounded-[10px] text-[15px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                location.pathname === '/design-system'
                  ? 'bg-[#F3EFFF] text-[#6D4AE0]'
                  : 'text-[#5F5B75] hover:bg-[#F3EFFF] hover:text-[#6D4AE0]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#F59E3B]" />
              <span>Design system</span>
            </Link>
          </nav>
        </div>

        {/* Center: Search field */}
        <div className="hidden sm:block flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmitSearch={handleSearchSubmit}
            placeholder="Search 12+ courses, topics, or instructors..."
          />
        </div>

        {/* Right: Log in (ghost) + Sign up (primary) + current role dashboard shortcut */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          {role !== 'guest' && currentUser && (
            <Link to={getDashboardPath()}>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<LayoutDashboard className="w-4 h-4" />}
              >
                My dashboard
              </Button>
            </Link>
          )}
          <Link to="/login">
            <Button variant="ghost" size="md">
              Log in
            </Button>
          </Link>
          <Link to="/signup">
            <Button variant="primary" size="md">
              Sign up
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="md:hidden p-2.5 rounded-[10px] text-[#1E1B2E] hover:bg-[#F3EFFF] border border-[#E6E1F5] cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Responsive Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E6E1F5] px-4 pt-3 pb-6 space-y-4 shadow-purple-md">
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
