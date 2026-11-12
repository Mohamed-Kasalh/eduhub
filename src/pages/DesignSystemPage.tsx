import React, { useState } from 'react';
import {
  Copy,
  Check,
  Sparkles,
  Plus,
  Trash2,
  Download,
  Mail,
  Layers,
  Sliders,
} from 'lucide-react';
import {
  Button,
  ComponentVisualState,
  TextInput,
  PasswordInput,
  SelectInput,
  SearchInput,
  TextareaInput,
  OtpInput,
  FileDropzone,
  StatusChip,
  FeaturedStickerTag,
  AchievementStickerBadge,
  ProgressBar,
  ProgressRing,
  Avatar,
  Skeleton,
  EmptyState,
  Breadcrumbs,
  Pagination,
  CourseCard,
  Tabs,
  Accordion,
  DataTable,
  Modal,
  Drawer,
  ToastCard,
} from '../components/ui';
import { handleImageError } from '../utils/imageFallback';
import { BrandLogo, CatMascot } from '../components/brand/BrandLogo';
import { useApp } from '../context/AppContext';
import { ACHIEVEMENT_BADGES } from '../data/mockData';

const VISUAL_STATES: ComponentVisualState[] = [
  'default',
  'hover',
  'focus',
  'disabled',
  'loading',
  'error',
];

const COLOR_SWATCHES = [
  { name: 'Primary', hex: '#6D4AE0', role: 'Primary brand & actions' },
  { name: 'Primary hover', hex: '#5A3AC7', role: 'Button & interactive hover' },
  { name: 'Primary dark', hex: '#3F2A9E', role: 'Active press & deep accents' },
  { name: 'Primary light', hex: '#A78BFA', role: 'Focus rings & subtle borders' },
  { name: 'Primary tint', hex: '#F3EFFF', role: 'Active nav & soft surfaces' },
  { name: 'Orange', hex: '#F59E3B', role: 'Playful accent & highlights' },
  { name: 'Gold', hex: '#F5B82E', role: 'Stars, streaks & Featured tag' },
  { name: 'Ink', hex: '#1E1B2E', role: 'Headings & primary text' },
  { name: 'Slate', hex: '#5F5B75', role: 'Secondary & muted text' },
  { name: 'Border', hex: '#E6E1F5', role: 'Card & input hairline border' },
  { name: 'Page', hex: '#FAF8FF', role: 'App background surface' },
  { name: 'Success', hex: '#16A34A', role: 'Completed & verified states' },
  { name: 'Warning', hex: '#F59E0B', role: 'Pending review & cautions' },
  { name: 'Danger', hex: '#DC2626', role: 'Errors & destructive actions' },
  { name: 'Info', hex: '#2563EB', role: 'System tips & notices' },
];

export const DesignSystemPage: React.FC = () => {
  const { courses, addToast } = useApp();
  const [globalState, setGlobalState] = useState<ComponentVisualState>('default');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [searchDemo, setSearchDemo] = useState('React 19');
  const [otpDemo, setOtpDemo] = useState<string[]>(['4', '8', '2', '9', '1', '0']);
  const [textareaDemo, setTextareaDemo] = useState(
    'Hands-on project-based curriculum covering component patterns, hooks, and accessibility.'
  );
  const [activeTab, setActiveTab] = useState('overview');
  const [currentPage, setCurrentPage] = useState(2);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCopyHex = (hex: string) => {
    navigator.clipboard?.writeText(hex).catch(() => {});
    setCopiedHex(hex);
    addToast({
      title: `Copied ${hex} to clipboard`,
      message: 'Token value is ready to paste.',
      variant: 'info',
    });
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const sampleCourses = courses.slice(0, 3);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* Header & Sticky State Switcher */}
      <div className="rounded-[12px] bg-white border border-[#E6E1F5] shadow-purple-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <FeaturedStickerTag label="Featured" />
              <StatusChip label="v1.0 Foundation" variant="primary" />
            </div>
            <h1 className="text-[40px] font-display font-bold text-[#1E1B2E]">
              EduHub design system
            </h1>
            <p className="text-[16px] text-[#5F5B75] max-w-2xl">
              Friendly, rounded, playful yet professional UI tokens and reusable components built on an 8px grid. Every component supports default, hover, focus, disabled, loading, and error states.
            </p>
          </div>
          <BrandLogo size="lg" chip showText />
        </div>

        {/* Interactive Global Component State Controller */}
        <div className="pt-5 border-t border-[#E6E1F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF8FF] p-4 rounded-[12px]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#6D4AE0]" />
            <div>
              <p className="text-[14px] font-bold text-[#1E1B2E]">
                Interactive state inspector
              </p>
              <p className="text-[12px] text-[#5F5B75]">
                Switch state below to preview how every component responds across all 6 states
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {VISUAL_STATES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setGlobalState(st)}
                className={`px-3.5 py-1.5 rounded-[10px] text-[13px] font-semibold capitalize transition-all cursor-pointer ${
                  globalState === st
                    ? 'bg-[#6D4AE0] text-white shadow-purple-sm'
                    : 'bg-white text-[#5F5B75] border border-[#E6E1F5] hover:border-[#A78BFA] hover:text-[#1E1B2E]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. Brand Identity, Logo & Mascot Usage Rules */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              1. Brand logo, mascot & signature sticker detail
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Strict guardrails preserve the official EduHub logo and reserve mascot & sticker moments.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Official Logo Card */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <StatusChip label="Light surfaces only" variant="success" />
              <h3 className="text-[24px] font-display font-semibold text-[#1E1B2E]">
                Official logo
              </h3>
              <p className="text-[14px] text-[#5F5B75]">
                Never redrawn, recolored, or stretched. Placed strictly on white or light surfaces, never on purple backgrounds.
              </p>
            </div>
            <div className="p-6 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-center">
              <BrandLogo size="xl" chip showText={false} to={undefined} />
            </div>
          </div>

          {/* Circular Crop Cat Mascot */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <StatusChip label="Restricted to 3 moments" variant="orange" />
              <h3 className="text-[24px] font-display font-semibold text-[#1E1B2E]">
                Circular mascot crop
              </h3>
              <p className="text-[14px] text-[#5F5B75]">
                The circular crop of the cat appears exclusively in empty states, success screens, and the 404 page.
              </p>
            </div>
            <div className="p-6 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex items-center justify-center gap-4">
              <CatMascot size="md" mood="empty" />
              <CatMascot size="md" mood="success" />
            </div>
          </div>

          {/* Die-Cut Sticker Signature */}
          <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <StatusChip label="Signature detail" variant="gold" />
              <h3 className="text-[24px] font-display font-semibold text-[#1E1B2E]">
                Die-cut sticker look
              </h3>
              <p className="text-[14px] text-[#5F5B75]">
                White outer outline + thin dashed inner stroke. Used sparingly on achievement badges and "Featured" tags only.
              </p>
            </div>
            <div className="p-5 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] flex flex-col items-start gap-3">
              <FeaturedStickerTag label="Featured" />
              <AchievementStickerBadge
                title="14-day streak"
                subtitle="Completed lessons daily"
                color="gold"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Color Tokens */}
      <section className="space-y-4">
        <div>
          <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            2. Color tokens
          </h2>
          <p className="text-[14px] text-[#5F5B75]">
            Click any swatch to copy its exact hex value.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch.name}
              type="button"
              onClick={() => handleCopyHex(swatch.hex)}
              className="group rounded-[12px] bg-white border border-[#E6E1F5] p-3 text-left shadow-purple-sm hover:shadow-purple-md hover:border-[#A78BFA] transition-all cursor-pointer"
            >
              <div
                className="h-16 w-full rounded-[10px] border border-[#E6E1F5] mb-2.5 flex items-end justify-end p-2"
                style={{ backgroundColor: swatch.hex }}
              >
                <span className="w-6 h-6 rounded-full bg-white/90 text-[#1E1B2E] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                  {copiedHex === swatch.hex ? (
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </span>
              </div>
              <p className="font-display font-bold text-[15px] text-[#1E1B2E]">{swatch.name}</p>
              <p className="text-[12px] font-semibold text-[#6D4AE0]">{swatch.hex}</p>
              <p className="text-[12px] text-[#5F5B75] mt-0.5 line-clamp-1">{swatch.role}</p>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Typography & Shape Scale */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-5">
          <div>
            <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              3. Typography scale
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Baloo 2 (600/700) for headings and big numbers; Nunito Sans for UI, tables, and forms. Sentence case everywhere.
            </p>
          </div>
          <div className="divide-y divide-[#E6E1F5] space-y-4">
            <div className="pt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="text-[12px] text-[#5F5B75] font-semibold w-36 shrink-0">
                H1 • Baloo 2 • 40px
              </span>
              <h1 className="text-[40px] font-display font-bold text-[#1E1B2E]">
                Learn new skills on your schedule
              </h1>
            </div>
            <div className="pt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="text-[12px] text-[#5F5B75] font-semibold w-36 shrink-0">
                H2 • Baloo 2 • 32px
              </span>
              <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
                Featured courses this week
              </h2>
            </div>
            <div className="pt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="text-[12px] text-[#5F5B75] font-semibold w-36 shrink-0">
                H3 • Baloo 2 • 24px
              </span>
              <h3 className="text-[24px] font-display font-semibold text-[#1E1B2E]">
                Module 1: Modern React foundations
              </h3>
            </div>
            <div className="pt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="text-[12px] text-[#5F5B75] font-semibold w-36 shrink-0">
                Body • Nunito Sans • 16px
              </span>
              <p className="text-[16px] text-[#1E1B2E]">
                Build practical applications with guided video lessons, interactive quizzes, and mentor feedback.
              </p>
            </div>
            <div className="pt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="text-[12px] text-[#5F5B75] font-semibold w-36 shrink-0">
                Small • Nunito Sans • 14px
              </span>
              <p className="text-[14px] text-[#5F5B75]">
                Updated March 2025 • Includes 42 downloadable code exercises and certificate.
              </p>
            </div>
            <div className="pt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <span className="text-[12px] text-[#5F5B75] font-semibold w-36 shrink-0">
                Caption • Nunito Sans • 12px
              </span>
              <p className="text-[12px] text-[#5F5B75]">
                Verification ID: EH-2025-UX94-SARA • Passing grade: 80% or higher
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-5">
          <div>
            <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              4. Shape & elevation
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              8px spatial grid, max width 1200px, and soft purple-tinted shadows.
            </p>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-[12px] bg-[#FAF8FF] border border-[#E6E1F5] shadow-purple-sm flex items-center justify-between">
              <div>
                <p className="font-bold text-[15px] text-[#1E1B2E]">Card radius: 12px</p>
                <p className="text-[12px] text-[#5F5B75]">Used on cards, modals, tables, and panels</p>
              </div>
              <code className="text-[12px] px-2.5 py-1 rounded bg-white border border-[#E6E1F5] text-[#6D4AE0]">
                rounded-[12px]
              </code>
            </div>
            <div className="p-4 rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] shadow-purple-sm flex items-center justify-between">
              <div>
                <p className="font-bold text-[15px] text-[#1E1B2E]">Control radius: 10px</p>
                <p className="text-[12px] text-[#5F5B75]">Used on buttons, inputs, selects, and nav links</p>
              </div>
              <code className="text-[12px] px-2.5 py-1 rounded bg-white border border-[#E6E1F5] text-[#6D4AE0]">
                rounded-[10px]
              </code>
            </div>
            <div className="p-4 rounded-full bg-[#FAF8FF] border border-[#E6E1F5] shadow-purple-sm flex items-center justify-between px-6">
              <div>
                <p className="font-bold text-[15px] text-[#1E1B2E]">Pill chip radius: 9999px</p>
                <p className="text-[12px] text-[#5F5B75]">Used on status chips and tags</p>
              </div>
              <code className="text-[12px] px-2.5 py-1 rounded-full bg-white border border-[#E6E1F5] text-[#6D4AE0]">
                rounded-full
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Buttons Matrix (Variants, Sizes, and All 6 States) */}
      <section className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              5. Buttons
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Primary, secondary, ghost, and danger variants in sm, md, and lg sizes across all 6 states. Specific action verbs everywhere.
            </p>
          </div>
          <StatusChip label={`Active state: ${globalState}`} variant="primary" />
        </div>

        {/* Sizes row */}
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-[#E6E1F5]">
          <span className="text-[14px] font-semibold text-[#5F5B75] mr-2">Sizes:</span>
          <Button size="sm" variant="primary" forceState={globalState}>
            Small button (sm)
          </Button>
          <Button
            size="md"
            variant="primary"
            forceState={globalState}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Save changes (md)
          </Button>
          <Button
            size="lg"
            variant="primary"
            forceState={globalState}
            rightIcon={<Download className="w-4 h-4" />}
          >
            Download certificate (lg)
          </Button>
        </div>

        {/* Full 6-state matrix for all 4 variants */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6E1F5] text-[13px] font-semibold text-[#5F5B75]">
                <th className="py-3 pr-4">Variant</th>
                {VISUAL_STATES.map((st) => (
                  <th key={st} className="py-3 px-3 capitalize">
                    {st}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E1F5]">
              {(
                [
                  { variant: 'primary', label: 'Save changes' },
                  { variant: 'secondary', label: 'Preview lesson' },
                  { variant: 'ghost', label: 'Cancel edit' },
                  { variant: 'danger', label: 'Delete course' },
                ] as const
              ).map((row) => (
                <tr key={row.variant}>
                  <td className="py-4 pr-4 font-display font-bold text-[16px] capitalize text-[#1E1B2E]">
                    {row.variant}
                  </td>
                  {VISUAL_STATES.map((st) => (
                    <td key={st} className="py-4 px-3">
                      <Button variant={row.variant} size="sm" forceState={st}>
                        {row.label}
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Inputs (Text, Password Toggle, Select, Search, Textarea, OTP, File Dropzone) */}
      <section className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              6. Form inputs & controls
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Text, password toggle, select, search, textarea, 6-digit OTP, and file dropzone. Currently showing the{' '}
              <strong className="text-[#6D4AE0]">{globalState}</strong> state.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {VISUAL_STATES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setGlobalState(st)}
                className={`px-2.5 py-1 rounded-[8px] text-[12px] font-semibold capitalize cursor-pointer ${
                  globalState === st
                    ? 'bg-[#6D4AE0] text-white'
                    : 'bg-[#F3EFFF] text-[#5F5B75] hover:text-[#1E1B2E]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TextInput
            label="Student email address"
            placeholder="sara.ali@eduhub.com"
            defaultValue="sara.ali@eduhub.com"
            leftIcon={<Mail className="w-4 h-4" />}
            helperText="We send course receipts and certificates to this address."
            forceState={globalState}
            required
          />

          <PasswordInput
            label="Account password"
            defaultValue="EduHub#2025"
            helperText="Click the eye icon to toggle password visibility."
            forceState={globalState}
            required
          />

          <SelectInput
            label="Course category"
            forceState={globalState}
            helperText="Determines where the course appears in the catalog."
            options={[
              { value: 'web', label: 'Web development' },
              { value: 'data', label: 'Data science & AI' },
              { value: 'design', label: 'UI/UX design' },
              { value: 'security', label: 'Cybersecurity' },
            ]}
          />

          <SearchInput
            label="Catalog search"
            value={searchDemo}
            onChange={setSearchDemo}
            helperText="Press Enter or click the clear button to reset."
            forceState={globalState}
          />

          <div className="md:col-span-2">
            <OtpInput
              label="6-digit verification code (OTP)"
              value={otpDemo}
              onChange={setOtpDemo}
              helperText="Enter the 6-digit code sent to your registered email."
              forceState={globalState}
            />
          </div>

          <div className="md:col-span-2">
            <TextareaInput
              label="Course learning summary"
              value={textareaDemo}
              onChange={(e) => setTextareaDemo(e.target.value)}
              maxLengthCount={240}
              helperText="Explain what projects students will build by the end of the course."
              forceState={globalState}
            />
          </div>

          <FileDropzone
            label="Course cover image dropzone"
            forceState={globalState}
            onFileSelect={(name) =>
              addToast({
                title: `Selected ${name}`,
                message: 'File validated and ready to upload.',
                variant: 'success',
              })
            }
          />
        </div>
      </section>

      {/* 7. Badges, Status Chips & Die-Cut Stickers */}
      <section className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-6">
        <div>
          <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            7. Badges & status chips
          </h2>
          <p className="text-[14px] text-[#5F5B75]">
            Semantic status chips for tables and workflows, plus the signature die-cut sticker badges.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusChip label="Published" variant="success" forceState={globalState} />
            <StatusChip label="Pending review" variant="warning" forceState={globalState} />
            <StatusChip label="Draft" variant="neutral" forceState={globalState} />
            <StatusChip label="Rejected" variant="danger" forceState={globalState} />
            <StatusChip label="Verified certificate" variant="info" forceState={globalState} />
            <StatusChip label="Intermediate" variant="orange" forceState={globalState} />
            <StatusChip label="Top rated" variant="gold" forceState={globalState} />
          </div>

          <div className="pt-4 border-t border-[#E6E1F5]">
            <p className="text-[14px] font-semibold text-[#1E1B2E] mb-3">
              Signature die-cut sticker badges (used strictly on achievement badges and "Featured" tags):
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <FeaturedStickerTag label="Featured" />
              {ACHIEVEMENT_BADGES.map((b) => (
                <AchievementStickerBadge
                  key={b.id}
                  title={b.title}
                  subtitle={b.earnedAt || 'Locked'}
                  color={b.color}
                  earned={b.earned}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Course Cards (Default, Progress, and State Inspector) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
              8. Course cards
            </h2>
            <p className="text-[14px] text-[#5F5B75]">
              Displays thumbnail, Featured sticker, level, instructor, gold stars, price or progress, and responds to all 6 states.
            </p>
          </div>
          <StatusChip label={`Card state: ${globalState}`} variant="primary" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CourseCard
            course={sampleCourses[0]}
            forceState={globalState}
            onAction={() =>
              addToast({
                title: 'Course card action triggered',
                message: `Selected ${sampleCourses[0].title}`,
                variant: 'info',
              })
            }
          />
          <CourseCard
            course={sampleCourses[1]}
            showProgress
            forceState={globalState}
          />
          <CourseCard
            course={sampleCourses[2]}
            forceState={globalState === 'default' ? 'loading' : globalState}
          />
        </div>
      </section>

      {/* 9. Progress Bar, Progress Ring, Avatars & Skeletons */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-6">
          <h2 className="text-[28px] font-display font-bold text-[#1E1B2E]">
            9. Progress bars & rings
          </h2>
          <div className="space-y-4">
            <ProgressBar
              value={68}
              label="Complete React Developer Course"
              color="primary"
              forceState={globalState}
            />
            <ProgressBar
              value={100}
              label="UI/UX Design Masterclass"
              color="success"
              forceState={globalState}
            />
            <ProgressBar
              value={35}
              label="Python for Data Science"
              color="orange"
              size="sm"
              forceState={globalState}
            />
          </div>
          <div className="pt-4 border-t border-[#E6E1F5] flex flex-wrap items-center justify-around gap-4">
            <ProgressRing value={68} label="In progress" forceState={globalState} />
            <ProgressRing value={100} label="Completed" forceState={globalState} />
            <ProgressRing value={88} label="Exam score" forceState={globalState} />
          </div>
        </div>

        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-6">
          <h2 className="text-[28px] font-display font-bold text-[#1E1B2E]">
            10. Avatars, breadcrumbs & pagination
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              src={sampleCourses[0].instructorAvatar}
              name="Ahmed Hassan"
              size="sm"
              status="online"
              forceState={globalState}
            />
            <Avatar
              src={sampleCourses[1].instructorAvatar}
              name="Dr. Mona Adel"
              size="md"
              status="busy"
              forceState={globalState}
            />
            <Avatar
              src={sampleCourses[2].instructorAvatar}
              name="Salma Nabil"
              size="lg"
              status="online"
              forceState={globalState}
            />
            <Avatar name="Nour Khaled" size="xl" status="offline" forceState={globalState} />
          </div>

          <div className="pt-4 border-t border-[#E6E1F5] space-y-3">
            <p className="text-[14px] font-semibold text-[#1E1B2E]">Breadcrumbs</p>
            <Breadcrumbs
              forceState={globalState}
              items={[
                { label: 'Courses', to: '/courses' },
                { label: 'Web development', to: '/courses' },
                { label: 'Complete React Developer Course' },
              ]}
            />
          </div>

          <div className="pt-4 border-t border-[#E6E1F5] space-y-3">
            <p className="text-[14px] font-semibold text-[#1E1B2E]">Pagination</p>
            <Pagination
              currentPage={currentPage}
              totalPages={5}
              onPageChange={setCurrentPage}
              forceState={globalState}
            />
          </div>
        </div>
      </section>

      {/* 11. Tabs, Accordion, Modal, Drawer & Toasts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-5">
          <h2 className="text-[28px] font-display font-bold text-[#1E1B2E]">
            11. Tabs & accordion
          </h2>
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            forceState={globalState}
            tabs={[
              {
                id: 'overview',
                label: 'Course overview',
                count: 12,
                content: (
                  <p className="text-[14px] text-[#5F5B75]">
                    Interactive tab panel showing course syllabus overview and learning milestones.
                  </p>
                ),
              },
              {
                id: 'qna',
                label: 'Student Q&A',
                count: 4,
                content: (
                  <p className="text-[14px] text-[#5F5B75]">
                    Discussion threads moderated by instructors and academic supervisors.
                  </p>
                ),
              },
              {
                id: 'notes',
                label: 'Saved notes',
                content: (
                  <p className="text-[14px] text-[#5F5B75]">
                    Timestamped personal study notes synced to your student profile.
                  </p>
                ),
              },
            ]}
          />

          <Accordion
            forceState={globalState}
            items={[
              {
                id: 'acc-1',
                title: 'Module 1: Modern React Foundations',
                subtitle: '4 lessons • 48 minutes total',
                content:
                  'Covers declarative UI rendering, JSX composition, TypeScript props, and Vite workspace configuration.',
              },
              {
                id: 'acc-2',
                title: 'Module 2: State, Effects & Custom Hooks',
                subtitle: '6 lessons • 1 hour 35 minutes',
                content:
                  'Deep dive into useState, useReducer, custom hook extraction, and avoiding stale closures.',
              },
            ]}
          />
        </div>

        <div className="rounded-[12px] bg-white border border-[#E6E1F5] p-6 shadow-purple-sm space-y-5">
          <h2 className="text-[28px] font-display font-bold text-[#1E1B2E]">
            12. Modal, drawer & toast notifications
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Open modal dialog
            </Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Open side drawer
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                addToast({
                  title: 'Changes saved to course syllabus',
                  message: 'Students enrolled in this course will see the updated lesson order.',
                  variant: 'success',
                })
              }
            >
              Trigger live toast
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <ToastCard
              variant="success"
              title="Certificate issued"
              message="Your PDF certificate is ready to download."
              forceState={globalState}
            />
            <ToastCard
              variant="warning"
              title="Exam timer warning"
              message="5 minutes remaining to submit your answers."
              forceState={globalState}
            />
            <ToastCard
              variant="danger"
              title="Upload failed"
              message="Video exceeds 500 MB. Compress to MP4 and retry."
              forceState={globalState}
            />
            <ToastCard
              variant="info"
              title="New comment reply"
              message="Ahmed Hassan answered your question in Lesson 3."
              forceState={globalState}
            />
          </div>
        </div>
      </section>

      {/* 13. Data Table & Empty State with Cat Mascot */}
      <section className="space-y-6">
        <div>
          <h2 className="text-[32px] font-display font-bold text-[#1E1B2E]">
            13. Data table, skeleton & empty state
          </h2>
          <p className="text-[14px] text-[#5F5B75]">
            Dense tables use Nunito Sans for high legibility; empty states feature the circular-cropped cat mascot and invite a specific action.
          </p>
        </div>

        <DataTable
          forceState={globalState}
          data={courses.slice(0, 4)}
          onRetry={() => setGlobalState('default')}
          columns={[
            {
              key: 'title',
              header: 'Course title',
              render: (row) => (
                <div className="flex items-center gap-3">
                  <img
                    src={row.thumbnail}
                    alt={row.title}
                    onError={handleImageError}
                    className="w-12 h-9 rounded-[8px] object-cover border border-[#E6E1F5]"
                  />
                  <div>
                    <p className="font-bold text-[#1E1B2E]">{row.title}</p>
                    <p className="text-[12px] text-[#5F5B75]">{row.categoryName}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'instructor',
              header: 'Instructor',
              render: (row) => <span className="font-medium">{row.instructorName}</span>,
            },
            {
              key: 'level',
              header: 'Level',
              render: (row) => <StatusChip label={row.level} variant="primary" dot={false} />,
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <StatusChip
                  label={row.status}
                  variant={row.status === 'Published' ? 'success' : 'warning'}
                />
              ),
            },
            {
              key: 'price',
              header: 'Price',
              align: 'right',
              render: (row) => (
                <span className="font-display font-bold text-[16px]">${row.price.toFixed(2)}</span>
              ),
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EmptyState
            title="No courses in your study list yet"
            description="Explore our catalog of 12+ hands-on courses in web development, data science, UI/UX design, and cybersecurity."
            actionLabel="Browse courses"
            actionTo="/courses"
            mood="empty"
          />
          <EmptyState
            title="Course exam passed with honors!"
            description="You scored 94% on the UI/UX Design Masterclass assessment. Your verified certificate is ready."
            actionLabel="View my certificate"
            actionTo="/certificates/cert-101"
            mood="success"
          />
        </div>
      </section>

      {/* Interactive Modal Instance */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Publish course to catalog"
        description="Review the checklist before submitting your course for supervisor verification."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setModalOpen(false);
                addToast({
                  title: 'Course submitted for review',
                  message: 'Hana Mostafa (Supervisor) will review your syllabus within 24 hours.',
                  variant: 'success',
                });
              }}
            >
              Submit for review
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-[15px] text-[#5F5B75]">
          <p>
            Once submitted, academic supervisors check video audio clarity, lesson summaries, and practice exam questions.
          </p>
          <div className="p-3.5 rounded-[10px] bg-[#F3EFFF] text-[#3F2A9E] text-[14px] font-medium">
            All 42 lessons and 20 exam questions in Complete React Developer Course pass automated checks.
          </div>
        </div>
      </Modal>

      {/* Interactive Drawer Instance */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Lesson resources & notes"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Close panel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setDrawerOpen(false);
                addToast({
                  title: 'Study notes saved',
                  variant: 'success',
                });
              }}
            >
              Save notes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[14px] text-[#5F5B75]">
            Slide-over drawer used for mobile navigation, filter panels, and quick lesson note-taking.
          </p>
          <TextareaInput
            label="Your personal lesson note"
            defaultValue="Remember to memoize expensive list filtering only after profiling with React DevTools."
          />
        </div>
      </Drawer>
    </div>
  );
};
