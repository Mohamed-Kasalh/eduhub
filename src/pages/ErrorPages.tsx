import React from 'react';
import { Link, useLocation, useNavigate, useRouteError, isRouteErrorResponse } from 'react-router';
import {
  ShieldAlert,
  ArrowLeft,
  Compass,
  LayoutDashboard,
  UserCheck,
  ServerCrash,
  RefreshCw,
  Home,
} from 'lucide-react';
import { Button, StatusChip } from '../components/ui';
import { CatMascot } from '../components/brand/BrandLogo';
import { useApp } from '../context/AppContext';
import { UserRole } from '../data/mockData';

export const Forbidden403Page: React.FC<{
  requiredRoles?: UserRole[];
}> = ({ requiredRoles }) => {
  const { role, setRole, currentUser, getDashboardPath } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const suggestedRole =
    requiredRoles && requiredRoles.length > 0 && requiredRoles[0] !== 'guest'
      ? requiredRoles[0]
      : undefined;

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FEF2F2] border border-[#DC2626]/25 text-[#DC2626] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <StatusChip label="Error 403 • Access denied" variant="danger" className="mb-3" />

        <h1 className="text-[40px] font-display font-bold text-[#1E1B2E] mb-2">
          Access denied
        </h1>

        <p className="text-[16px] text-[#5F5B75] mb-6 leading-relaxed">
          You are currently signed in as{' '}
          <strong className="text-[#1E1B2E]">
            {currentUser ? `${currentUser.name} (${role})` : 'Guest visitor'}
          </strong>
          , which does not have permission to view{' '}
          <code className="px-2 py-0.5 rounded bg-[#F3EFFF] text-[#3F2A9E] text-[14px]">
            {location.pathname}
          </code>
          .
          {requiredRoles && requiredRoles.length > 0 && (
            <span>
              {' '}
              This page is restricted to the{' '}
              <strong className="text-[#6D4AE0] capitalize">
                {requiredRoles.join(' or ')}
              </strong>{' '}
              role.
            </span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            leftIcon={<LayoutDashboard className="w-4 h-4" />}
            onClick={() => navigate(getDashboardPath())}
          >
            Go to my dashboard
          </Button>

          {suggestedRole && (
            <Button
              variant="secondary"
              size="md"
              leftIcon={<UserCheck className="w-4 h-4" />}
              onClick={() => setRole(suggestedRole)}
            >
              Switch to {suggestedRole} role
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 404 Not Found Page — features the circular-cropped CatMascot
 * (One of the 3 allowed places for the cat mascot: empty states, success screens, and 404)
 */
export const NotFound404Page: React.FC = () => {
  const { getDashboardPath } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-md p-8 text-center flex flex-col items-center">
        <CatMascot size="xl" mood="404" className="mb-5" />

        <StatusChip label="Error 404 • Page not found" variant="orange" className="mb-3" />

        <h1 className="text-[40px] font-display font-bold text-[#1E1B2E] mb-2">
          We could not find that page
        </h1>

        <p className="text-[16px] text-[#5F5B75] mb-6 leading-relaxed">
          Our professor cat checked every shelf in the library, but{' '}
          <code className="px-2 py-0.5 rounded bg-[#F3EFFF] text-[#3F2A9E] text-[14px]">
            {location.pathname}
          </code>{' '}
          does not exist or may have moved.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            leftIcon={<LayoutDashboard className="w-4 h-4" />}
            onClick={() => navigate(getDashboardPath())}
          >
            Go to my dashboard
          </Button>
          <Link to="/courses">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Compass className="w-4 h-4" />}
            >
              Browse courses
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
          >
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
};

export const Server500Page: React.FC<{
  onRetry?: () => void;
  errorMessage?: string;
}> = ({ onRetry, errorMessage }) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    window.location.reload();
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-md p-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-[#FEF2F2] border border-[#DC2626]/25 text-[#DC2626] flex items-center justify-center mx-auto mb-4">
          <ServerCrash className="w-8 h-8" />
        </div>

        <StatusChip label="Error 500 • Server error" variant="danger" className="mb-3" />

        <h1 className="text-[36px] sm:text-[40px] font-display font-bold text-[#1E1B2E] mb-2">
          Something went wrong
        </h1>

        <p className="text-[16px] text-[#5F5B75] mb-6 leading-relaxed">
          An unexpected error interrupted this page. Your local progress is safe—try reloading the view or return to the EduHub home page.
        </p>

        {errorMessage && (
          <p className="w-full rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] px-3.5 py-2.5 text-[12px] text-[#5F5B75] font-mono break-words mb-6">
            {errorMessage}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRetry}
          >
            Try again
          </Button>
          <Link to="/">
            <Button variant="secondary" size="md" leftIcon={<Home className="w-4 h-4" />}>
              Go home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="min-h-screen bg-[#FAF8FF] text-[#1E1B2E]">
        <main id="main-content">
          <NotFound404Page />
        </main>
      </div>
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : undefined;

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-[#1E1B2E]">
      <main id="main-content">
        <Server500Page errorMessage={message} />
      </main>
    </div>
  );
};
