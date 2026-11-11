import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export interface PasswordRuleResult {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordEvaluation {
  rules: PasswordRuleResult[];
  score: number;
  label: string;
  barColor: string;
  textColor: string;
  isStrongEnough: boolean;
}

/**
 * Evaluate password rules and strength score (0..4).
 */
export function evaluatePassword(password: string): PasswordEvaluation {
  const rules: PasswordRuleResult[] = [
    { id: 'length', label: '8+ characters', met: password.length >= 8 },
    { id: 'upper', label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'number', label: 'Number (0-9)', met: /\d/.test(password) },
    { id: 'symbol', label: 'Symbol (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = rules.filter((r) => r.met).length;
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = [
    'bg-[#E6E1F5]',
    'bg-[#DC2626]',
    'bg-[#F59E0B]',
    'bg-[#2563EB]',
    'bg-[#16A34A]',
  ];
  const textColors = [
    'text-[#5F5B75]',
    'text-[#DC2626]',
    'text-[#F59E0B]',
    'text-[#2563EB]',
    'text-[#16A34A]',
  ];
  return {
    rules,
    score,
    label: labels[score],
    barColor: colors[score],
    textColor: textColors[score],
    isStrongEnough: score >= 3 && password.length >= 8,
  };
}

/**
 * Reusable password strength meter and 4-rule checklist used across Sign up, Reset password, and Security settings.
 */
export const PasswordStrengthChecklist: React.FC<{ password: string }> = ({ password }) => {
  const { rules, score, label, barColor, textColor } = evaluatePassword(password);

  return (
    <div className="rounded-[10px] bg-[#FAF8FF] border border-[#E6E1F5] p-3.5 space-y-2.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-[#5F5B75]">Password strength</span>
        <span className={`font-bold ${textColor}`}>{password ? label : 'Enter a password'}</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={`h-1.5 rounded-full transition-colors duration-200 ${
              password && score >= seg ? barColor : 'bg-[#E6E1F5]'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`flex items-center gap-1.5 text-[12px] ${
              rule.met ? 'text-[#16A34A] font-semibold' : 'text-[#5F5B75]'
            }`}
          >
            {rule.met ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-[#5F5B75]/50 shrink-0" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
