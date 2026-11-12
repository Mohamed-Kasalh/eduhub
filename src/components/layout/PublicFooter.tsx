import React, { useState } from 'react';
import { Link } from 'react-router';
import { Globe, Share2, MessageSquare, Video, Send } from 'lucide-react';
import { BrandLogo } from '../brand/BrandLogo';
import { Button, TextInput } from '../ui';
import { useApp } from '../../context/AppContext';
import { useNewsletterSubscribeMutation } from '../../api/hooks/useCatalog';
import { getErrorMessage } from '../../api/errors';

export const PublicFooter: React.FC = () => {
  const { addToast } = useApp();
  const subscribeMutation = useNewsletterSubscribeMutation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Enter a valid email address like sara@domain.com to receive course updates.');
      return;
    }
    setError('');
    try {
      await subscribeMutation.mutateAsync(trimmed);
      setEmail('');
    } catch (err) {
      setError(getErrorMessage(err, 'Enter a valid email address.'));
    }
  };

  return (
    <footer className="bg-[#F3EFFF] border-t border-[#E6E1F5] text-[#1E1B2E] mt-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-[#E6E1F5]">
          {/* Brand column with logo on a white rounded chip */}
          <div className="lg:col-span-4 space-y-4">
            <BrandLogo size="md" chip showText />
            <p className="text-[14px] text-[#5F5B75] leading-relaxed max-w-sm">
              Friendly, structured online learning with hands-on courses, interactive exams, and verified certificates taught by industry practitioners.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              {[
                { icon: <Globe className="w-4 h-4" />, label: 'Community portal' },
                { icon: <Video className="w-4 h-4" />, label: 'Video channel' },
                { icon: <MessageSquare className="w-4 h-4" />, label: 'Student forum' },
                { icon: <Share2 className="w-4 h-4" />, label: 'Share EduHub' },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() =>
                    addToast({
                      title: `Opened ${s.label}`,
                      message: 'External social link previewed in foundation mode.',
                      variant: 'info',
                    })
                  }
                  aria-label={s.label}
                  className="w-11 h-11 rounded-[10px] bg-white border border-[#E6E1F5] text-[#5F5B75] hover:text-[#6D4AE0] hover:border-[#A78BFA] shadow-purple-sm flex items-center justify-center transition-all cursor-pointer"
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Platform links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-display font-bold text-[18px] text-[#1E1B2E]">Platform</h4>
            <ul className="space-y-2 text-[14px] text-[#5F5B75]">
              <li>
                <Link to="/courses" className="hover:text-[#6D4AE0] transition-colors">
                  Browse courses
                </Link>
              </li>
              <li>
                <Link to="/design-system" className="hover:text-[#6D4AE0] transition-colors">
                  Design system
                </Link>
              </li>
              <li>
                <Link to="/certificates" className="hover:text-[#6D4AE0] transition-colors">
                  Certificates
                </Link>
              </li>
              <li>
                <Link to="/verify/EH-2025-UX94-SARA" className="hover:text-[#6D4AE0] transition-colors">
                  Verify a certificate
                </Link>
              </li>
            </ul>
          </div>

          {/* Support links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-display font-bold text-[18px] text-[#1E1B2E]">Support</h4>
            <ul className="space-y-2 text-[14px] text-[#5F5B75]">
              <li>
                <Link to="/student/dashboard" className="hover:text-[#6D4AE0] transition-colors">
                  Student center
                </Link>
              </li>
              <li>
                <Link to="/instructor/dashboard" className="hover:text-[#6D4AE0] transition-colors">
                  Teach on EduHub
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className="hover:text-[#6D4AE0] transition-colors">
                  Account recovery
                </Link>
              </li>
              <li>
                <Link to="/notifications" className="hover:text-[#6D4AE0] transition-colors">
                  System updates
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-display font-bold text-[18px] text-[#1E1B2E]">Legal</h4>
            <ul className="space-y-2 text-[14px] text-[#5F5B75]">
              <li>
                <Link to="/profile" className="hover:text-[#6D4AE0] transition-colors">
                  Privacy settings
                </Link>
              </li>
              <li>
                <Link to="/supervisor/reports" className="hover:text-[#6D4AE0] transition-colors">
                  Academic integrity
                </Link>
              </li>
              <li>
                <Link to="/403" className="hover:text-[#6D4AE0] transition-colors">
                  Access policy (403)
                </Link>
              </li>
              <li>
                <Link to="/404" className="hover:text-[#6D4AE0] transition-colors">
                  Missing page (404)
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter input */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-display font-bold text-[18px] text-[#1E1B2E]">Weekly digest</h4>
            <p className="text-[14px] text-[#5F5B75]">
              Get new course launches and free study roadmaps every Tuesday.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2.5">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address for weekly digest"
                errorText={error}
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                fullWidth
                disabled={subscribeMutation.isPending}
                loading={subscribeMutation.isPending}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe to updates'}
              </Button>
            </form>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[14px] text-[#5F5B75]">
          <p>© 2025 EduHub Learning Inc. Built on an 8px spatial grid.</p>
          <div className="flex items-center gap-4 text-[12px]">
            <span>1440px Desktop</span>
            <span>•</span>
            <span>768px Tablet</span>
            <span>•</span>
            <span>375px Mobile</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
